const express = require('express');
const db = require('../db');
const { isValidIdentifier, quoteIdentifier } = require('../utils/sqlSafety');
const { serializeToCsv } = require('../utils/csv');

const router = express.Router();

function getTarget(req) {
  return req.query?.target || req.headers['x-rowvane-target'] || 'default';
}

/**
 * GET /api/tables
 * Lists all user tables in the public schema along with their column definitions,
 * primary keys, and exact row counts.
 */
router.get('/', async (req, res, next) => {
  try {
    const target = getTarget(req);
    const tablesResult = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
       ORDER BY table_name ASC`,
      [],
      target
    );

    const columnsResult = await db.query(
      `SELECT
         c.table_name,
         c.column_name,
         c.data_type,
         c.udt_name,
         c.is_nullable,
         c.column_default,
         c.ordinal_position,
         CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
       FROM information_schema.columns c
       LEFT JOIN (
         SELECT ku.table_schema, ku.table_name, ku.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage ku
           ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
       ) pk
         ON c.table_schema = pk.table_schema
        AND c.table_name = pk.table_name
        AND c.column_name = pk.column_name
       WHERE c.table_schema = 'public'
       ORDER BY c.table_name ASC, c.ordinal_position ASC`,
      [],
      target
    );

    const columnsByTable = new Map();
    for (const col of columnsResult.rows) {
      if (!columnsByTable.has(col.table_name)) {
        columnsByTable.set(col.table_name, []);
      }
      columnsByTable.get(col.table_name).push({
        name: col.column_name,
        dataType: col.data_type,
        udtName: col.udt_name,
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        isPrimaryKey: col.is_primary_key,
      });
    }

    const tables = [];
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      let rowCount = 0;

      if (isValidIdentifier(tableName)) {
        const countRes = await db.query(
          `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`,
          [],
          target
        );
        rowCount = countRes.rows[0]?.count ?? 0;
      }

      tables.push({
        name: tableName,
        schema: 'public',
        rowCount,
        columns: columnsByTable.get(tableName) || [],
      });
    }

    res.json({ tables, database: db.resolveDbName(target), target });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to fetch verified column metadata for a single public BASE TABLE.
 * Returns null if the table does not exist in public schema.
 */
async function getVerifiedTableMetadata(tableName, target = 'default') {
  if (!isValidIdentifier(tableName)) {
    const err = new Error(`Invalid table name: "${tableName}"`);
    err.status = 400;
    throw err;
  }

  const tableCheck = await db.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       AND table_name = $1`,
    [tableName],
    target
  );

  if (tableCheck.rowCount === 0) {
    return null;
  }

  const columnsResult = await db.query(
    `SELECT
       c.column_name,
       c.data_type,
       c.udt_name,
       c.is_nullable,
       c.column_default,
       c.ordinal_position,
       c.is_identity,
       c.is_generated,
       CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
       pg_get_serial_sequence(quote_ident(c.table_schema) || '.' || quote_ident(c.table_name), c.column_name) AS sequence_name
     FROM information_schema.columns c
     LEFT JOIN (
       SELECT ku.table_schema, ku.table_name, ku.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage ku
         ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
     ) pk
       ON c.table_schema = pk.table_schema
      AND c.table_name = pk.table_name
      AND c.column_name = pk.column_name
     WHERE c.table_schema = 'public'
       AND c.table_name = $1
     ORDER BY c.ordinal_position ASC`,
    [tableName],
    target
  );

  const columns = columnsResult.rows.map((row) => {
    const hasSeq = Boolean(row.sequence_name) || (row.column_default || '').toLowerCase().includes('nextval(');
    const isGen = row.is_generated === 'ALWAYS' || row.is_identity === 'YES' || hasSeq;
    return {
      name: row.column_name,
      dataType: row.data_type,
      udtName: row.udt_name,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key,
      isIdentity: row.is_identity === 'YES',
      isGenerated: isGen,
      hasSequence: hasSeq,
      sequenceName: row.sequence_name || null,
    };
  });

  const primaryKeys = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

  return {
    name: tableName,
    columns,
    primaryKeys,
  };
}

/**
 * GET /api/tables/:table/schema
 * Returns detailed schema metadata for a single table.
 */
router.get('/:table/schema', async (req, res, next) => {
  try {
    const target = getTarget(req);
    const tableName = req.params.table;
    const meta = await getVerifiedTableMetadata(tableName, target);

    if (!meta) {
      return res.status(404).json({
        error: `Table "${tableName}" does not exist in public schema.`,
      });
    }

    res.json({
      table: meta.name,
      schema: 'public',
      columns: meta.columns,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tables/:table/rows
 * Returns paginated rows for a table with optional server-side sorting.
 */
router.get('/:table/rows', async (req, res, next) => {
  try {
    const target = getTarget(req);
    const tableName = req.params.table;
    const meta = await getVerifiedTableMetadata(tableName, target);

    if (!meta) {
      return res.status(404).json({
        error: `Table "${tableName}" does not exist in public schema.`,
      });
    }

    const limit = Math.max(
      1,
      Math.min(1000, parseInt(req.query.limit, 10) || 50)
    );
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const requestedSort = req.query.sort;
    const requestedDir = req.query.dir;
    const sortSpecs = [];

    if (requestedSort && typeof requestedSort === 'string') {
      const parts = requestedSort.split(',').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        let colName = part;
        let colDir =
          typeof requestedDir === 'string' && requestedDir.toUpperCase() === 'DESC'
            ? 'DESC'
            : 'ASC';

        if (part.includes(':')) {
          const [c, d] = part.split(':');
          colName = c.trim();
          if (d && d.trim().toUpperCase() === 'DESC') {
            colDir = 'DESC';
          } else {
            colDir = 'ASC';
          }
        }

        const validCol = meta.columns.find(
          (c) => c.name.toLowerCase() === colName.toLowerCase()
        );
        if (validCol && !sortSpecs.some((s) => s.column === validCol.name)) {
          sortSpecs.push({ column: validCol.name, dir: colDir });
        }
      }
    }

    const quotedTable = quoteIdentifier(meta.name);

    // Build deterministic sort specifications with primary-key tie-breaker
    const deterministicSpecs = [...sortSpecs];
    if (Array.isArray(meta.primaryKeys)) {
      for (const pkCol of meta.primaryKeys) {
        if (!deterministicSpecs.some((s) => s.column === pkCol)) {
          deterministicSpecs.push({ column: pkCol, dir: 'ASC' });
        }
      }
    }

    const orderClause =
      deterministicSpecs.length > 0
        ? `ORDER BY ${deterministicSpecs
            .map((s) => `${quoteIdentifier(s.column)} ${s.dir} NULLS LAST`)
            .join(', ')}`
        : '';

    const start = performance.now();
    const [countRes, rowsRes] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM ${quotedTable}`, [], target),
      db.query(
        `SELECT * FROM ${quotedTable} ${orderClause} LIMIT $1 OFFSET $2`,
        [limit, offset],
        target
      ),
    ]);
    const executionMs = Number((performance.now() - start).toFixed(2));

    res.json({
      table: meta.name,
      schema: 'public',
      columns: meta.columns,
      primaryKeys: meta.primaryKeys,
      rows: rowsRes.rows,
      rowCount: rowsRes.rowCount,
      totalRows: countRes.rows[0]?.count ?? rowsRes.rowCount,
      limit,
      offset,
      sort:
        sortSpecs.length === 1
          ? sortSpecs[0].column
          : sortSpecs.length > 1
          ? sortSpecs.map((s) => `${s.column}:${s.dir.toLowerCase()}`).join(',')
          : null,
      dir:
        sortSpecs.length === 1
          ? sortSpecs[0].dir.toLowerCase()
          : sortSpecs.length > 1
          ? 'multi'
          : 'asc',
      sorts: sortSpecs.map((s) => ({ column: s.column, dir: s.dir.toLowerCase() })),
      executionMs,
      target,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to format database constraint violations into clean user-facing error objects.
 */
function formatDbError(err) {
  let friendly = err.message;
  if (err.code === '23505') {
    friendly = `Unique constraint violation: ${err.detail || err.message}`;
  } else if (err.code === '23503') {
    friendly = `Foreign key violation: ${err.detail || err.message}`;
  } else if (err.code === '23514') {
    friendly = `Check constraint violation: ${err.message}`;
  } else if (err.code === '23502') {
    friendly = `Not-null constraint violation: Column "${err.column}" cannot be null.`;
  } else if (err.code === '22P02') {
    friendly = `Type error: Invalid input format (${err.message}).`;
  }
  return {
    error: friendly,
    code: err.code,
    detail: err.detail,
    constraint: err.constraint,
    column: err.column,
    table: err.table,
  };
}

function coerceValueForColumn(colMeta, rawVal) {
  const dt = (colMeta.dataType || '').toLowerCase();
  const udt = (colMeta.udtName || '').toLowerCase();

  const isJson = dt === 'jsonb' || udt === 'jsonb' || dt === 'json' || udt === 'json';
  const isArray = dt === 'array' || udt.startsWith('_');
  const isNumeric =
    ['smallint', 'integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision', 'int2', 'int4', 'int8', 'float4', 'float8'].includes(dt) ||
    ['int2', 'int4', 'int8', 'float4', 'float8', 'numeric'].includes(udt);
  const isTemporal =
    ['date', 'timestamp without time zone', 'timestamp with time zone', 'time without time zone', 'time with time zone', 'timestamp', 'timestamptz', 'interval'].includes(dt) ||
    ['date', 'time', 'timestamp', 'timestamptz'].includes(udt);
  const isBoolean = dt === 'boolean' || udt === 'bool';
  const isUuid = dt === 'uuid' || udt === 'uuid';

  if (rawVal === null || rawVal === undefined) {
    return { isNull: true, val: null, cast: null };
  }

  if (typeof rawVal === 'string' && rawVal.trim() === '') {
    if (colMeta.nullable && (isNumeric || isTemporal || isUuid || isBoolean || isJson || isArray)) {
      return { isNull: true, val: null, cast: null };
    }
  }

  if (isJson) {
    const jsonStr = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);
    return { isNull: false, val: jsonStr, cast: `::${colMeta.dataType || colMeta.udtName}` };
  }

  if (isArray) {
    if (Array.isArray(rawVal)) {
      return { isNull: false, val: rawVal, cast: null };
    }
    const elemType = udt.startsWith('_') ? udt.substring(1) : 'text';
    return { isNull: false, val: String(rawVal), cast: `::${elemType}[]` };
  }

  if (isBoolean) {
    if (typeof rawVal === 'boolean') {
      return { isNull: false, val: rawVal, cast: null };
    }
    const s = String(rawVal).toLowerCase().trim();
    if (s === 'true' || s === 't' || s === '1') return { isNull: false, val: true, cast: null };
    if (s === 'false' || s === 'f' || s === '0') return { isNull: false, val: false, cast: null };
    if (colMeta.nullable) return { isNull: true, val: null, cast: null };
    return { isNull: false, val: false, cast: null };
  }

  if (isNumeric) {
    if (typeof rawVal === 'number') {
      return { isNull: false, val: rawVal, cast: null };
    }
    const num = Number(rawVal);
    if (!isNaN(num)) {
      return { isNull: false, val: num, cast: null };
    }
    if (colMeta.nullable) return { isNull: true, val: null, cast: null };
    return { isNull: false, val: rawVal, cast: null };
  }

  return { isNull: false, val: rawVal, cast: null };
}

/**
 * PATCH /api/tables/:table/rows
 * Direct cell / row update for an existing row identified by its primary key(s).
 * Body: { pks: { [pkCol]: value }, updates: { [col]: newValue }, target?: string }
 */
router.patch('/:table/rows', async (req, res) => {
  try {
    const target = getTarget(req);
    const tableName = req.params.table;
    const meta = await getVerifiedTableMetadata(tableName, target);

    if (!meta) {
      return res.status(404).json({ error: `Table "${tableName}" does not exist in public schema.` });
    }

    if (!meta.primaryKeys || meta.primaryKeys.length === 0) {
      return res.status(400).json({
        error: `Table "${tableName}" does not have a primary key or unique identifier and cannot be mutated safely.`,
      });
    }

    const { pks, updates } = req.body || {};
    if (!pks || typeof pks !== 'object') {
      return res.status(400).json({ error: 'Primary key specification "pks" is required.' });
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'At least one column update must be specified.' });
    }

    // Verify all primary keys are provided
    for (const pkCol of meta.primaryKeys) {
      if (pks[pkCol] === undefined || pks[pkCol] === null) {
        return res.status(400).json({
          error: `Missing value for primary key column "${pkCol}".`,
        });
      }
    }

    // Verify that updates does not attempt to mutate any primary key column
    for (const pkCol of meta.primaryKeys) {
      if (updates[pkCol] !== undefined) {
        return res.status(400).json({
          error: `Primary key column "${pkCol}" is a database-generated identifier and immutable through cell editing and cannot be modified directly.`,
        });
      }
    }

    // Validate update columns
    const validColMap = new Map(meta.columns.map((c) => [c.name, c]));
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const [colName, rawVal] of Object.entries(updates)) {
      const colMeta = validColMap.get(colName);
      if (!colMeta) {
        return res.status(400).json({ error: `Unknown column "${colName}" in table "${tableName}".` });
      }
      if (colMeta.isGenerated || colMeta.hasSequence) {
        return res.status(400).json({ error: `Column "${colName}" is a database-generated identifier and cannot be modified directly.` });
      }

      const coerced = coerceValueForColumn(colMeta, rawVal);
      if (coerced.isNull) {
        setClauses.push(`${quoteIdentifier(colName)} = NULL`);
      } else if (coerced.cast) {
        setClauses.push(`${quoteIdentifier(colName)} = $${paramIdx}${coerced.cast}`);
        values.push(coerced.val);
        paramIdx++;
      } else {
        setClauses.push(`${quoteIdentifier(colName)} = $${paramIdx}`);
        values.push(coerced.val);
        paramIdx++;
      }
    }

    // WHERE clause matching all PK columns
    const whereClauses = [];
    for (const pkCol of meta.primaryKeys) {
      whereClauses.push(`${quoteIdentifier(pkCol)} = $${paramIdx}`);
      values.push(pks[pkCol]);
      paramIdx++;
    }

    const updateSql = `UPDATE ${quoteIdentifier(meta.name)} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`;
    const result = await db.query(updateSql, values, target);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Row not found or was concurrently modified/deleted.',
      });
    }

    res.json({
      success: true,
      row: result.rows[0],
      affectedRows: result.rowCount,
    });
  } catch (err) {
    const formatted = formatDbError(err);
    res.status(400).json(formatted);
  }
});

/**
 * POST /api/tables/:table/rows
 * Inserts a new row into the table.
 * Body: { row: { [col]: value }, target?: string }
 */
router.post('/:table/rows', async (req, res) => {
  try {
    const target = getTarget(req);
    const tableName = req.params.table;
    const meta = await getVerifiedTableMetadata(tableName, target);

    if (!meta) {
      return res.status(404).json({ error: `Table "${tableName}" does not exist in public schema.` });
    }

    const { row } = req.body || {};
    const inputRow = row && typeof row === 'object' ? row : {};
    const validColMap = new Map(meta.columns.map((c) => [c.name, c]));

    const cols = [];
    const vals = [];
    const placeholders = [];
    let paramIdx = 1;

    for (const [colName, rawVal] of Object.entries(inputRow)) {
      const colMeta = validColMap.get(colName);
      if (!colMeta) continue; // Ignore unknown fields safely

      // Skip identity ALWAYS columns where PostgreSQL forbids manual override
      if (colMeta.isIdentity && !colMeta.hasSequence) continue;
      if (rawVal === undefined) continue;

      // If a sequence column is omitted, null, or empty string, let PostgreSQL assign sequence default
      if ((colMeta.hasSequence || colMeta.isGenerated) && (rawVal === '' || rawVal === null)) {
        continue;
      }

      cols.push(quoteIdentifier(colName));

      const coerced = coerceValueForColumn(colMeta, rawVal);
      if (coerced.isNull) {
        placeholders.push('NULL');
      } else if (coerced.cast) {
        placeholders.push(`$${paramIdx}${coerced.cast}`);
        vals.push(coerced.val);
        paramIdx++;
      } else {
        placeholders.push(`$${paramIdx}`);
        vals.push(coerced.val);
        paramIdx++;
      }
    }

    let insertSql = '';
    if (cols.length === 0) {
      insertSql = `INSERT INTO ${quoteIdentifier(meta.name)} DEFAULT VALUES RETURNING *`;
    } else {
      insertSql = `INSERT INTO ${quoteIdentifier(meta.name)} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    }

    const result = await db.query(insertSql, vals, target);

    // Synchronize sequences for sequence-backed columns to prevent collision
    for (const col of meta.columns) {
      if (col.hasSequence && col.sequenceName) {
        try {
          await db.query(
            `SELECT setval($1, GREATEST(COALESCE((SELECT MAX(${quoteIdentifier(col.name)}) FROM ${quoteIdentifier(meta.name)}), 1), (SELECT last_value FROM ${col.sequenceName})), true)`,
            [col.sequenceName],
            target
          );
        } catch (_seqErr) {}
      }
    }

    res.status(201).json({
      success: true,
      row: result.rows[0],
    });
  } catch (err) {
    const formatted = formatDbError(err);
    res.status(400).json(formatted);
  }
});

/**
 * DELETE /api/tables/:table/rows
 * Deletes a row identified by its primary key(s).
 * Body: { pks: { [pkCol]: value }, target?: string }
 */
router.delete('/:table/rows', async (req, res) => {
  try {
    const target = getTarget(req);
    const tableName = req.params.table;
    const meta = await getVerifiedTableMetadata(tableName, target);

    if (!meta) {
      return res.status(404).json({ error: `Table "${tableName}" does not exist in public schema.` });
    }

    if (!meta.primaryKeys || meta.primaryKeys.length === 0) {
      return res.status(400).json({
        error: `Table "${tableName}" does not have a primary key or unique identifier and rows cannot be deleted safely.`,
      });
    }

    const { pks } = req.body || {};
    if (!pks || typeof pks !== 'object') {
      return res.status(400).json({ error: 'Primary key specification "pks" is required.' });
    }

    const whereClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const pkCol of meta.primaryKeys) {
      if (pks[pkCol] === undefined || pks[pkCol] === null) {
        return res.status(400).json({
          error: `Missing value for primary key column "${pkCol}".`,
        });
      }
      whereClauses.push(`${quoteIdentifier(pkCol)} = $${paramIdx}`);
      values.push(pks[pkCol]);
      paramIdx++;
    }

    const deleteSql = `DELETE FROM ${quoteIdentifier(meta.name)} WHERE ${whereClauses.join(' AND ')} RETURNING *`;
    const result = await db.query(deleteSql, values, target);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Row not found or already deleted.',
      });
    }

    res.json({
      success: true,
      deletedRow: result.rows[0],
    });
  } catch (err) {
    const formatted = formatDbError(err);
    res.status(400).json(formatted);
  }
});

/**
 * GET /api/tables/:table/export
 * Exports all rows of a verified public table as an RFC 4180-compliant CSV.
 */
router.get('/:table/export', async (req, res, next) => {
  try {
    const target = getTarget(req);
    const tableName = req.params.table;
    const meta = await getVerifiedTableMetadata(tableName, target);

    if (!meta) {
      return res.status(404).json({
        error: `Table "${tableName}" does not exist in public schema.`,
      });
    }

    const quotedTable = quoteIdentifier(meta.name);
    const countRes = await db.query(
      `SELECT COUNT(*)::int AS count FROM ${quotedTable}`,
      [],
      target
    );
    const totalRows = countRes.rows[0]?.count ?? 0;

    const maxExportRows = Number(process.env.SQL_EXPORT_MAX_ROWS) || 50000;
    if (totalRows > maxExportRows) {
      return res.status(413).json({
        error: `Table "${meta.name}" contains ${totalRows.toLocaleString()} rows, which exceeds the export limit of ${maxExportRows.toLocaleString()} rows. Please use a filtered query in the SQL editor to export subsets.`,
        totalRows,
        maxExportRows,
      });
    }

    // Determine deterministic ORDER BY (PK if exists, else first column)
    const pkColumn = meta.columns.find((c) => c.isPrimaryKey)?.name;
    const firstColumn = meta.columns[0]?.name;
    const sortColumn = pkColumn || firstColumn;
    const orderClause = sortColumn ? `ORDER BY ${quoteIdentifier(sortColumn)} ASC` : '';

    const rowsRes = await db.query(
      `SELECT * FROM ${quotedTable} ${orderClause}`,
      [],
      target
    );

    const csvContent = serializeToCsv(meta.columns, rowsRes.rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(meta.name)}.csv"`
    );
    res.setHeader('X-Total-Rows', String(totalRows));
    res.setHeader('X-Exported-Rows', String(rowsRes.rows.length));

    // Prepend UTF-8 BOM so Excel and spreadsheet applications open Unicode correctly
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
