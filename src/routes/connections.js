// Custom database connection management
const express = require('express');
const { Client, Pool } = require('pg');
const { performance } = require('perf_hooks');
const db = require('../db');

const router = express.Router();

function buildClientConfig(payload) {
  const { host, port, database, user, password, ssl, connectionString } = payload || {};

  if (connectionString && typeof connectionString === 'string' && connectionString.trim()) {
    const config = {
      connectionString: connectionString.trim(),
      connectionTimeoutMillis: 6000,
    };
    if (ssl) {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  }

  const defaultUser = process.env.PGUSER || process.env.USER || 'postgres';
  const config = {
    host: host || 'localhost',
    port: Number(port) || 5432,
    database: database || 'postgres',
    user: (user && user.trim()) || defaultUser,
    connectionTimeoutMillis: 6000,
  };

  if (password !== undefined && password !== null && password !== '') {
    config.password = String(password);
  }

  if (ssl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

/**
 * POST /api/connections/test
 * Tests PostgreSQL connectivity without persisting the connection.
 */
router.post('/test', async (req, res) => {
  const config = buildClientConfig(req.body);
  const client = new Client(config);
  const start = performance.now();

  try {
    await client.connect();
    const [infoRes, tableCountRes] = await Promise.all([
      client.query(`
        SELECT
          current_database() AS database,
          current_user AS user,
          version() AS version,
          NOW() AS server_time
      `),
      client.query(`
        SELECT COUNT(*)::int AS count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
      `),
    ]);

    const latencyMs = Number((performance.now() - start).toFixed(2));
    const row = infoRes.rows[0];

    res.json({
      success: true,
      database: row.database,
      user: row.user,
      version: row.version.split(',')[0],
      tableCount: tableCountRes.rows[0]?.count ?? 0,
      serverTime: row.server_time,
      latencyMs,
    });
  } catch (err) {
    let friendly = err.message;
    if (err.code === 'ECONNREFUSED') {
      friendly = `Connection refused at ${config.host || 'host'}:${config.port || 5432}. Ensure PostgreSQL is running.`;
    } else if (err.code === '28P01') {
      friendly = 'Authentication failed: Invalid password for user.';
    } else if (err.code === '3D000') {
      friendly = `Database "${config.database}" does not exist.`;
    } else if (err.code === 'ENOTFOUND') {
      friendly = `Host "${config.host}" not found. Check the hostname or IP address.`;
    }

    res.status(400).json({
      success: false,
      error: friendly,
      code: err.code || 'CONNECTION_ERROR',
    });
  } finally {
    try {
      await client.end();
    } catch (_e) {}
  }
});

/**
 * POST /api/connections/connect
 * Establishes and registers an active PostgreSQL connection pool.
 */
router.post('/connect', async (req, res) => {
  const config = buildClientConfig(req.body);
  const { name } = req.body || {};

  const testClient = new Client(config);
  try {
    await testClient.connect();
    const infoRes = await testClient.query(`
      SELECT
        current_database() AS database,
        current_user AS user,
        version() AS version
    `);
    await testClient.end();

    const info = infoRes.rows[0];
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const poolConfig = {
      ...config,
      max: Number(process.env.PGPOOL_MAX) || 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    };

    const newPool = new Pool(poolConfig);
    newPool.on('error', (err) => {
      console.error(`[db:${connectionId}] Unexpected error on idle client:`, err.message);
    });

    const meta = {
      connectionId,
      name: (name && String(name).trim()) || info.database,
      database: info.database,
      host: config.host || 'remote',
      port: config.port || 5432,
      user: info.user,
      version: info.version.split(',')[0],
      connectedAt: new Date().toISOString(),
    };

    db.registerCustomPool(connectionId, newPool, meta);

    res.status(201).json({
      success: true,
      connection: meta,
    });
  } catch (err) {
    try {
      await testClient.end();
    } catch (_e) {}

    res.status(400).json({
      success: false,
      error: `Failed to connect: ${err.message}`,
      code: err.code,
    });
  }
});

/**
 * GET /api/connections
 * Lists all active user connection profiles.
 */
router.get('/', (req, res) => {
  res.json({
    connections: db.getCustomConnections(),
  });
});

/**
 * POST /api/connections/disconnect
 * Closes and unregisters an active connection pool.
 */
router.post('/disconnect', async (req, res) => {
  const { connectionId } = req.body || {};
  if (!connectionId) {
    return res.status(400).json({ error: 'connectionId is required.' });
  }

  await db.unregisterCustomPool(connectionId);
  res.json({
    success: true,
    connectionId,
    message: `Disconnected connection ${connectionId}.`,
  });
});

module.exports = router;
