// CSV import and SQL export routes
const express = require('express');
const { performance } = require('perf_hooks');
const db = require('../db');
const { isValidIdentifier, quoteIdentifier } = require('../utils/sqlSafety');

const router = express.Router();

function getTarget(req) {
  return req.query?.target || req.headers['x-rowvane-target'] || req.body?.target || 'default';
}

/**
 * Infer PostgreSQL column data type from sample values.
 * @param {Array<any>} sampleValues
 * @returns {string}
 */
function inferPostgresType(sampleValues) {
  const nonNull = sampleValues.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ''
  );
  if (nonNull.length === 0) return 'TEXT';

  let allInt = true;
  let allNum = true;
  let allBool = true;
  let allDate = true;

  const DATE_REGEX =
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

  for (const v of nonNull) {
    const s = String(v).trim();
    if (allInt && !/^-?\d+$/.test(s)) allInt = false;
    if (allNum && (isNaN(Number(s)) || s === '')) allNum = false;
    if (
      allBool &&
      !['true', 'false', 't', 'f', '1', '0', 'yes', 'no'].includes(
        s.toLowerCase()
      )
    )
      allBool = false;
    if (allDate && (!DATE_REGEX.test(s) || isNaN(Date.parse(s))))
      allDate = false;
  }

  if (allInt) {
    const maxVal = Math.max(...nonNull.map((v) => Math.abs(Number(v))));
    return maxVal > 2147483647 ? 'BIGINT' : 'INTEGER';
  }
  if (allNum) return 'NUMERIC(14, 2)';
  if (allBool) return 'BOOLEAN';
  if (allDate) return 'TIMESTAMPTZ';
  return 'TEXT';
}

/**
 * POST /api/import-export/csv/preview
 * Analyzes provided CSV records to infer types and validate column names.
 * Body: { headers: string[], rows: any[][] }
 */
router.post('/csv/preview', (req, res) => {
  const { headers, rows } = req.body || {};
  if (!Array.isArray(headers) || headers.length === 0) {
    return res.status(400).json({ error: 'Headers array is required.' });
  }

  const sampleRows = Array.isArray(rows) ? rows.slice(0, 50) : [];
  const inferences = headers.map((colName, colIdx) => {
    const samples = sampleRows.map((r) => r[colIdx]);
    const cleanIdentifier = colName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^(\d)/, 'col_$1');

    return {
      sourceHeader: colName,
      suggestedColumn: cleanIdentifier,
      isValidIdentifier: isValidIdentifier(cleanIdentifier),
      inferredType: inferPostgresType(samples),
      sampleValues: samples.slice(0, 5),
    };
  });

  res.json({
    totalRows: Array.isArray(rows) ? rows.length : 0,
    columns: inferences,
  });
});

/**
 * POST /api/import-export/csv/import
 * Ingests CSV rows into an existing or newly created table transactionally.
 * Body: {
 *   tableName: string,
 *   createNewTable: boolean,
 *   columns: Array<{ name: string, type: string, sourceIndex: number }>,
 *   rows: any[][],
 *   nullAsEmpty: boolean,
 *   target?: string
 * }
 */
router.post('/csv/import', async (req, res, next) => {
  const target = getTarget(req);
  const pool = db.getPool(target);
  const client = await pool.connect();

  try {
    const {
      tableName,
      createNewTable,
      columns,
      rows,
      nullAsEmpty = true,
    } = req.body || {};

    if (!tableName || !isValidIdentifier(tableName)) {
      return res.status(400).json({
        error: `Invalid table name: "${tableName}". Must be a valid PostgreSQL identifier.`,
      });
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: 'Columns mapping is required.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided to import.' });
    }

    const start = performance.now();
    await client.query('BEGIN');

    // 1. If createNewTable is requested, create the table schema
    if (createNewTable) {
      const colDefs = columns.map((col) => {
        if (!isValidIdentifier(col.name)) {
          throw new Error(`Invalid column identifier: "${col.name}"`);
        }
        const colType = col.type || 'TEXT';
        return `${quoteIdentifier(col.name)} ${colType}`;
      });

      const createSql = `
        CREATE TABLE IF NOT EXISTS ${quoteIdentifier(tableName)} (
          id SERIAL PRIMARY KEY,
          ${colDefs.join(',\n          ')}
        );
      `;
      await client.query(createSql);
    } else {
      // Verify table exists
      const checkRes = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      if (checkRes.rowCount === 0) {
        throw new Error(
          `Table "${tableName}" does not exist in public schema.`
        );
      }
    }

    // 2. Prepare multi-row parameterized batch insertion
    const targetColNames = columns.map((c) => quoteIdentifier(c.name)).join(', ');
    const BATCH_SIZE = 500;
    let importedRows = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const valueParams = [];
      const rowPlaceholders = [];

      batch.forEach((row, rowIdx) => {
        const itemPlaceholders = [];
        columns.forEach((col) => {
          let val = row[col.sourceIndex];
          if (val === undefined || val === '') {
            val = nullAsEmpty ? null : '';
          } else if (col.type) {
            const t = col.type.toUpperCase();
            if ((t.includes('INT') || t === 'NUMERIC') && !isNaN(Number(val))) {
              val = Number(val);
            } else if (t === 'BOOLEAN') {
              val = ['true', 't', '1', 'yes'].includes(String(val).trim().toLowerCase());
            }
          }
          valueParams.push(val);
          itemPlaceholders.push(`$${valueParams.length}`);
        });
        rowPlaceholders.push(`(${itemPlaceholders.join(', ')})`);
      });

      const insertSql = `
        INSERT INTO ${quoteIdentifier(tableName)} (${targetColNames})
        VALUES ${rowPlaceholders.join(',\n        ')};
      `;

      await client.query(insertSql, valueParams);
      importedRows += batch.length;
    }

    // 3. Synchronize sequences for all sequence-backed columns to prevent future key collisions
    try {
      const seqCheckRes = await client.query(
        `SELECT
           c.column_name,
           pg_get_serial_sequence(quote_ident(c.table_schema) || '.' || quote_ident(c.table_name), c.column_name) AS sequence_name
         FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.table_name = $1`,
        [tableName]
      );

      for (const r of seqCheckRes.rows) {
        if (r.sequence_name) {
          await client.query(
            `SELECT setval(
               $1,
               GREATEST(
                 COALESCE((SELECT MAX(${quoteIdentifier(r.column_name)}) FROM ${quoteIdentifier(tableName)}), 1),
                 (SELECT last_value FROM ${r.sequence_name})
               ),
               true
             )`,
            [r.sequence_name]
          );
        }
      }
    } catch (_seqSyncErr) {}

    await client.query('COMMIT');
    const durationMs = Number((performance.now() - start).toFixed(2));

    res.json({
      success: true,
      table: tableName,
      importedRows,
      durationMs,
      target,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_e) {}
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/import-export/export-sql
 * Generates plain PostgreSQL SQL (schema-only, data-only, or full DDL + INSERT statements).
 * Query params: mode ('schema'|'data'|'full'), target ('default'|'playground')
 */
router.get('/export-sql', async (req, res, next) => {
  try {
    const target = getTarget(req);
    const mode = (req.query.mode || 'full').toLowerCase();
    const pool = db.getPool(target);

    // Fetch all public tables
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const sqlChunks = [
      `-- Rowvane SQL Export`,
      `-- Target Database: ${db.resolveDbName(target)}`,
      `-- Export Mode: ${mode.toUpperCase()}`,
      `-- Generated: ${new Date().toISOString()}`,
      `\nBEGIN;\n`,
    ];

    for (const tRow of tablesRes.rows) {
      const tableName = tRow.table_name;
      const quotedTable = quoteIdentifier(tableName);

      // Schema export
      if (mode === 'schema' || mode === 'full') {
        const colsRes = await pool.query(
          `SELECT
             column_name, data_type, udt_name, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position;`,
          [tableName]
        );

        const colDefs = colsRes.rows.map((c) => {
          let def = `  ${quoteIdentifier(c.column_name)} ${c.udt_name.toUpperCase()}`;
          if (c.column_default) def += ` DEFAULT ${c.column_default}`;
          if (c.is_nullable === 'NO') def += ' NOT NULL';
          return def;
        });

        sqlChunks.push(`-- Table: ${tableName}`);
        sqlChunks.push(`CREATE TABLE IF NOT EXISTS ${quotedTable} (\n${colDefs.join(',\n')}\n);\n`);
      }

      // Data export
      if (mode === 'data' || mode === 'full') {
        const dataRes = await pool.query(`SELECT * FROM ${quotedTable};`);
        if (dataRes.rows.length > 0) {
          const colKeys = Object.keys(dataRes.rows[0]);
          const quotedColList = colKeys.map(quoteIdentifier).join(', ');

          sqlChunks.push(`-- Data for ${tableName} (${dataRes.rows.length} rows)`);
          for (const row of dataRes.rows) {
            const vals = colKeys.map((k) => {
              const v = row[k];
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'number' || typeof v === 'boolean') return String(v);
              if (v instanceof Date) return `'${v.toISOString()}'`;
              if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            sqlChunks.push(`INSERT INTO ${quotedTable} (${quotedColList}) VALUES (${vals.join(', ')});`);
          }
          sqlChunks.push('');
        }
      }
    }

    sqlChunks.push('COMMIT;\n');

    const fullSql = sqlChunks.join('\n');
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(db.resolveDbName(target))}_${mode}_export.sql"`
    );
    res.send(fullSql);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
