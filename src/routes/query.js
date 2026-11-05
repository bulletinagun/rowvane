// SQL query execution and cancellation routes
const express = require('express');
const { performance } = require('perf_hooks');
const db = require('../db');

const router = express.Router();

// Active queries registry for cancellation
const activeQueries = new Map(); // queryId -> { pid, client, target, startedAt }

/**
 * Resolves and validates the maximum row limit for serialized query results.
 *
 * Precedence:
 *   1. process.env.SQL_QUERY_MAX_ROWS (canonical configuration)
 *   2. process.env.SQL_MAX_ROWS (legacy fallback)
 *   3. 1000 (standard default when neither variable is configured)
 *
 * Validation:
 *   - The value must be a finite positive integer (> 0).
 *   - Zero, negative numbers, fractions, NaN, and non-numeric strings are explicitly
 *     treated as invalid configuration. When detected, a diagnostic warning is logged
 *     and the system falls back to the safe default of 1000.
 */
function resolveMaxResultRows() {
  const DEFAULT_LIMIT = 1000;

  // Determine candidate by precedence: canonical -> legacy fallback -> none
  let candidate = null;
  if (
    process.env.SQL_QUERY_MAX_ROWS !== undefined &&
    process.env.SQL_QUERY_MAX_ROWS !== ''
  ) {
    candidate = {
      name: 'SQL_QUERY_MAX_ROWS',
      raw: process.env.SQL_QUERY_MAX_ROWS,
    };
  } else if (
    process.env.SQL_MAX_ROWS !== undefined &&
    process.env.SQL_MAX_ROWS !== ''
  ) {
    candidate = {
      name: 'SQL_MAX_ROWS (legacy fallback)',
      raw: process.env.SQL_MAX_ROWS,
    };
  }

  // If neither variable is configured, return the standard default 1000
  if (!candidate) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(candidate.raw);

  // Validate: must be finite, must be an integer, must be strictly greater than 0
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    console.warn(
      `[query] Invalid ${candidate.name} configuration: "${candidate.raw}". Must be a finite positive integer. Falling back to default ${DEFAULT_LIMIT}.`
    );
    return DEFAULT_LIMIT;
  }

  return parsed;
}

/**
 * POST /api/query/cancel
 * Body: { queryId?: string, pid?: number, target?: string }
 * Cancels a running backend query using PostgreSQL's pg_cancel_backend.
 */
router.post('/cancel', async (req, res, next) => {
  try {
    const { queryId, pid, target = 'default' } = req.body || {};
    let targetPid = pid;

    if (!targetPid && queryId && activeQueries.has(queryId)) {
      targetPid = activeQueries.get(queryId).pid;
    }

    if (!targetPid) {
      return res.status(404).json({ error: 'No active query found matching the identifier.' });
    }

    const cancelRes = await db.query(
      'SELECT pg_cancel_backend($1) AS cancelled',
      [targetPid],
      target
    );
    const wasCancelled = cancelRes.rows[0]?.cancelled ?? false;

    res.json({
      success: true,
      queryId,
      pid: targetPid,
      cancelled: wasCancelled,
      message: wasCancelled
        ? `Backend PID ${targetPid} cancellation signal delivered.`
        : `Backend PID ${targetPid} was not active or could not be cancelled.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/query
 * Body: { sql: string, target?: string, queryId?: string }
 */
router.post('/', async (req, res, next) => {
  let client = null;
  let isFinished = false;
  let queryId = null;
  let backendPid = null;

  try {
    const { sql } = req.body || {};
    if (typeof sql !== 'string' || sql.trim() === '') {
      const err = new Error('Request body must contain a non‑empty "sql" string');
      err.status = 400;
      throw err;
    }

    // Determine target database ('default' or 'playground')
    const target =
      req.body?.target ||
      req.query?.target ||
      req.headers['x-rowvane-target'] ||
      'default';

    queryId =
      req.body?.queryId ||
      `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Acquire a client from the appropriate pool
    const pool = db.getPool(target);
    client = await pool.connect();
    backendPid = client.processID;

    activeQueries.set(queryId, {
      pid: backendPid,
      client,
      target,
      startedAt: Date.now(),
    });

    let released = false;
    const safeRelease = (cleanupErr) => {
      if (released) return;
      released = true;
      if (cleanupErr) {
        client.release(cleanupErr);
      } else {
        client.release();
      }
    };

    // Client disconnect handler: if browser cancels or drops connection,
    // immediately cancel the PostgreSQL backend process to prevent runaway CPU burn.
    req.on('close', async () => {
      if (!isFinished && backendPid) {
        try {
          await db.query('SELECT pg_cancel_backend($1)', [backendPid], target);
        } catch (_e) {}
      }
    });

    try {
      // -------------------------------------------------
      // Apply strict statement and idle transaction timeouts.
      // Enforces a hard ceiling so queries cannot run indefinitely.
      // -------------------------------------------------
      const timeoutMs = Number(process.env.SQL_STATEMENT_TIMEOUT_MS) || 10000;
      await client.query(
        `SET statement_timeout = ${timeoutMs}; SET idle_in_transaction_session_timeout = ${timeoutMs};`
      );

      // Execute raw SQL script
      const start = performance.now();
      const rawResult = await client.query(sql);
      const duration = performance.now() - start;

      isFinished = true;

      // Normalise to an array for uniform processing.
      const resultsArray = Array.isArray(rawResult) ? rawResult : [rawResult];

      // -------------------------------------------------
      // Serialization Row Cap:
      //
      // IMPORTANT DISTINCTION:
      // client.query(sql) sends the query through PostgreSQL's simple query protocol.
      // PostgreSQL executes the query to completion and sends ALL matching rows
      // across the wire, which the pg driver buffers in Node.js heap memory.
      //
      // The row cap below ONLY limits the number of rows serialized into JSON and
      // sent over HTTP to the browser client (res.rows.slice(0, maxRows)).
      // It protects the browser DOM and network payload size from exploding.
      // It does NOT limit the rows fetched from PostgreSQL or heap allocations within pg.
      // Queries requiring database-level memory or fetch bounding must use an explicit
      // SQL "LIMIT" clause or server-side cursor streaming.
      // -------------------------------------------------
      const maxRows = resolveMaxResultRows();

      const results = resultsArray.map((res) => {
        const truncated = res.rowCount > maxRows;
        const rows = truncated ? res.rows.slice(0, maxRows) : res.rows;
        const fields = (res.fields || []).map((f) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
        }));
        return {
          statement: sql,
          command: res.command,
          rowCount: res.rowCount,
          fields,
          rows,
          truncated,
          durationMs: Number(duration.toFixed(2)),
        };
      });

      // -------------------------------------------------
      // Check for unfinished explicit transactions:
      // Ordinary statements without an explicit BEGIN are autocommitted by PostgreSQL.
      // If the user opened an explicit transaction (BEGIN) that was not explicitly committed
      // or rolled back before script execution ended, ROLLBACK will close it without
      // emitting a "there is no transaction in progress" notice.
      // -------------------------------------------------
      let rolledBackUnfinishedTx = false;
      let hadNoTxNotice = false;
      const onNotice = (n) => {
        if (n && n.message && n.message.includes('there is no transaction in progress')) {
          hadNoTxNotice = true;
        }
      };
      client.on('notice', onNotice);
      await client.query('ROLLBACK');
      client.off('notice', onNotice);
      rolledBackUnfinishedTx = !hadNoTxNotice;

      res.json({
        success: true,
        queryId,
        pid: backendPid,
        results,
        rolledBackUnfinishedTx,
      });
    } finally {
      isFinished = true;
      activeQueries.delete(queryId);

      // -------------------------------------------------
      // Connection sanitization:
      // 1. ROLLBACK closes any active or aborted transaction block.
      // 2. DISCARD ALL resets all session GUCs, temp tables, and locks.
      // 3. If cleanup fails at either stage, destroy client via safeRelease(err).
      // -------------------------------------------------
      try {
        await client.query('ROLLBACK');
        await client.query('DISCARD ALL');
        safeRelease();
      } catch (cleanupErr) {
        console.error(
          '[db] Error cleaning up query connection, destroying client:',
          cleanupErr.message
        );
        safeRelease(cleanupErr);
      }
    }
  } catch (err) {
    isFinished = true;
    if (queryId) activeQueries.delete(queryId);

    const status = err.status || (err.code ? 400 : 500);
    const payload = {
      success: false,
      queryId,
      error: {
        message: err.message,
        ...(err.code ? { code: err.code } : {}),
        ...(err.position ? { position: err.position } : {}),
      },
    };
    res.status(status).json(payload);
  }
});

router.resolveMaxResultRows = resolveMaxResultRows;

module.exports = router;
