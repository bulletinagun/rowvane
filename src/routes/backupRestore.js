// Backup and restore routes
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../db');
const { runProcessSafe, checkBinaryVersion } = require('../utils/processRunner');

const router = express.Router();

function getDbConnectionParams(target = 'default') {
  if (target && target.startsWith('conn_')) {
    const customConns = typeof db.getCustomConnections === 'function' ? db.getCustomConnections() : [];
    const found = customConns.find((c) => c.id === target);
    if (found) {
      return {
        host: found.host || 'localhost',
        port: String(found.port || '5432'),
        user: found.user || process.env.PGUSER || os.userInfo().username || 'postgres',
        password: found.password || undefined,
        database: found.database || 'postgres',
        isExternal: true,
        displayName: found.name || found.database,
      };
    }
  }

  const dbName = db.resolveDbName(target);
  return {
    host: process.env.PGHOST || 'localhost',
    port: String(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || os.userInfo().username || 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: dbName,
    isExternal: false,
    displayName: target === 'playground' ? 'Rowvane Playground' : (dbName || 'Rowvane Default'),
  };
}

function pruneStaleBackups(tempDir) {
  try {
    if (!fs.existsSync(tempDir)) return;
    const now = Date.now();
    const files = fs.readdirSync(tempDir);
    for (const f of files) {
      const p = path.join(tempDir, f);
      const stat = fs.statSync(p);
      if (now - stat.mtimeMs > 15 * 60 * 1000) {
        fs.unlinkSync(p);
      }
    }
  } catch (_e) {}
}

/**
 * GET /api/backup-restore/utilities
 * Verifies availability of native PostgreSQL CLI utilities (pg_dump, pg_restore, psql).
 */
router.get('/utilities', async (req, res) => {
  const [pgDump, pgRestore, psql] = await Promise.all([
    checkBinaryVersion('pg_dump'),
    checkBinaryVersion('pg_restore'),
    checkBinaryVersion('psql'),
  ]);

  res.json({
    pgDump,
    pgRestore,
    psql,
    allAvailable: pgDump.available && pgRestore.available && psql.available,
  });
});

/**
 * POST /api/backup-restore/backup
 * Creates a native PostgreSQL dump (plain SQL or custom .dump) and downloads it.
 * Body: { target?: 'default'|'playground', format?: 'sql'|'custom' }
 */
router.post('/backup', async (req, res, next) => {
  const target = req.body?.target || req.query?.target || 'default';
  const format = (req.body?.format || 'sql').toLowerCase();
  const conn = getDbConnectionParams(target);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = format === 'custom' ? 'dump' : 'sql';
  const filename = `${conn.database}_backup_${timestamp}.${ext}`;
  const tempDir = path.join(os.tmpdir(), 'rowvane_backups');
  let tempFilePath = null;

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    } else {
      pruneStaleBackups(tempDir);
    }

    tempFilePath = path.join(tempDir, filename);
    const args = [
      '-h', conn.host,
      '-p', conn.port,
      '-U', conn.user,
      '-d', conn.database,
      '--no-owner',
      '--no-privileges',
    ];

    if (format === 'custom') {
      args.push('-Fc', '-f', tempFilePath);
    } else {
      args.push('-f', tempFilePath);
    }

    await runProcessSafe('pg_dump', args, {
      password: conn.password,
      timeoutMs: 120000,
    });

    res.setHeader(
      'Content-Type',
      format === 'custom' ? 'application/octet-stream' : 'application/sql; charset=utf-8'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);

    const safeUnlink = () => {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (_e) {}
      }
    };

    fileStream.on('end', safeUnlink);
    fileStream.on('close', safeUnlink);
    fileStream.on('error', (err) => {
      safeUnlink();
      next(err);
    });
  } catch (err) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_e) {}
    }
    next(err);
  }
});

/**
 * POST /api/backup-restore/restore
 * Safely restores a SQL script or custom .dump archive into the targeted database.
 * Body: { target: string, confirm: boolean, format?: 'sql'|'custom', payload?: string, sqlScript?: string }
 */
router.post('/restore', async (req, res, next) => {
  const tempDir = path.join(os.tmpdir(), 'rowvane_restores');
  let tempFilePath = null;

  try {
    const { target, confirm, format: reqFormat, payload, sqlScript } = req.body || {};

    if (!confirm) {
      return res.status(400).json({
        error:
          'Explicit confirmation is required. Send { "confirm": true } to proceed with restoration.',
      });
    }

    if (!target) {
      return res.status(400).json({ error: 'Target database is required.' });
    }

    const rawData = payload || sqlScript;
    if (!rawData || typeof rawData !== 'string' || rawData.trim() === '') {
      return res.status(400).json({ error: 'Valid restoration file payload or SQL script is required.' });
    }

    // Protect against unbounded memory consumption during restore (35 MB limit)
    const MAX_RESTORE_BYTES = 35 * 1024 * 1024;
    if (Buffer.byteLength(rawData, 'utf8') > MAX_RESTORE_BYTES) {
      return res.status(413).json({
        error: `Restoration payload exceeds maximum allowable size of 35MB to prevent memory exhaustion.`,
      });
    }

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    } else {
      pruneStaleBackups(tempDir);
    }

    // Detect format: check explicit parameter or look for PGDMP magic header in base64 / binary
    let isCustomDump = reqFormat === 'custom';
    let fileBuffer = null;

    if (rawData.startsWith('data:application/octet-stream;base64,') || rawData.startsWith('data:;base64,')) {
      const b64 = rawData.split(',')[1];
      fileBuffer = Buffer.from(b64, 'base64');
      isCustomDump = true;
    } else if (rawData.startsWith('PGDMP')) {
      fileBuffer = Buffer.from(rawData, 'binary');
      isCustomDump = true;
    } else if (reqFormat === 'custom') {
      try {
        fileBuffer = Buffer.from(rawData, 'base64');
      } catch (_e) {
        fileBuffer = Buffer.from(rawData, 'utf8');
      }
      isCustomDump = true;
    }

    // Verify PGDMP magic header if custom format
    if (isCustomDump) {
      if (!fileBuffer || fileBuffer.length < 5 || fileBuffer.slice(0, 5).toString('ascii') !== 'PGDMP') {
        return res.status(400).json({
          error: 'Invalid custom dump file. Archive does not contain valid PostgreSQL PGDMP header.',
        });
      }
    }

    const conn = getDbConnectionParams(target);
    const timestamp = Date.now();

    if (isCustomDump) {
      tempFilePath = path.join(tempDir, `restore_${timestamp}.dump`);
      fs.writeFileSync(tempFilePath, fileBuffer);

      // Execute pg_restore for custom archive
      const args = [
        '-h', conn.host,
        '-p', conn.port,
        '-U', conn.user,
        '-d', conn.database,
        '--no-owner',
        '--no-privileges',
        '--clean',
        '--if-exists',
        tempFilePath,
      ];

      const result = await runProcessSafe('pg_restore', args, {
        password: conn.password,
        timeoutMs: 180000,
      });

      res.json({
        success: true,
        database: conn.database,
        target,
        format: 'custom',
        durationMs: result.durationMs,
        output: (result.stdout || result.stderr || '').slice(0, 5000),
        notes: `Restoration completed via native pg_restore into "${conn.database}".`,
      });
    } else {
      // Plain SQL script restoration via psql
      tempFilePath = path.join(tempDir, `restore_${timestamp}.sql`);
      fs.writeFileSync(tempFilePath, rawData, 'utf8');

      const args = [
        '-h', conn.host,
        '-p', conn.port,
        '-U', conn.user,
        '-d', conn.database,
        '--single-transaction',
        '-f', tempFilePath,
      ];

      const result = await runProcessSafe('psql', args, {
        password: conn.password,
        timeoutMs: 180000,
      });

      res.json({
        success: true,
        database: conn.database,
        target,
        format: 'sql',
        durationMs: result.durationMs,
        output: (result.stdout || result.stderr || '').slice(0, 5000),
        notes: `Restoration completed via native psql into "${conn.database}".`,
      });
    }
  } catch (err) {
    next(err);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_e) {}
    }
  }
});

module.exports = router;
