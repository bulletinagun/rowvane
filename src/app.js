const path = require('path');
const express = require('express');
const db = require('./db');
const tablesRouter = require('./routes/tables');

const app = express();

// Body parsers with sensible payload size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * GET /api/health
 * Verifies server readiness and PostgreSQL database connectivity.
 */
app.get('/api/health', async (req, res) => {
  try {
    const target = req.query?.target || req.headers['x-rowvane-target'] || 'default';
    const dbHealth = await db.checkHealth(target);
    res.json({
      status: 'ok',
      service: 'rowvane',
      target,
      db: dbHealth,
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      service: 'rowvane',
      error: 'Database connection failed',
      details: err.message,
    });
  }
});

// Mount API routes
app.use('/api/tables', tablesRouter);

// Register query execution endpoint
const queryRouter = require('./routes/query');
app.use('/api/query', queryRouter);

// Playground & Chaos Mode routes
const playgroundRouter = require('./routes/playground');
app.use('/api/playground', playgroundRouter);

// Database Structure Explorer routes
const explorerRouter = require('./routes/explorer');
app.use('/api/explorer', explorerRouter);

// CSV & SQL Script Import/Export routes
const importExportRouter = require('./routes/importExport');
app.use('/api/import-export', importExportRouter);

// Native PostgreSQL Backup & Restore routes
const backupRestoreRouter = require('./routes/backupRestore');
app.use('/api/backup-restore', backupRestoreRouter);

// Real Database Mode: Custom PostgreSQL Connections
const connectionsRouter = require('./routes/connections');
app.use('/api/connections', connectionsRouter);

// 404 handler for unknown API endpoints
app.use('/api/{*splat}', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || undefined,
  });
});

module.exports = app;
