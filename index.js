const app = require('./src/app');
const db = require('./src/db');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[rowvane] Server listening on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`\n[rowvane] Received ${signal}. Closing server and DB pool...`);
  server.close(async () => {
    try {
      await db.pool.end();
      console.log('[rowvane] Clean shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('[rowvane] Error closing DB pool:', err.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
