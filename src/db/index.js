const { Pool, Client } = require('pg');
const { performance } = require('perf_hooks');
const { seedShowcaseDatabase } = require('./seedShowcase');

// Build PostgreSQL connection config from environment variables
function createPoolConfig(databaseOverride = null) {
  const config = {
    max: Number(process.env.PGPOOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  if (process.env.DATABASE_URL && !databaseOverride) {
    config.connectionString = process.env.DATABASE_URL;
  } else {
    config.host = process.env.PGHOST || 'localhost';
    config.port = Number(process.env.PGPORT) || 5432;
    config.database = databaseOverride || process.env.PGDATABASE || 'rowvane';
    if (process.env.PGUSER) config.user = process.env.PGUSER;
    if (process.env.PGPASSWORD) config.password = process.env.PGPASSWORD;
  }

  if (
    process.env.PGSSLMODE === 'require' ||
    process.env.DATABASE_SSL === 'true'
  ) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

const defaultPool = new Pool(createPoolConfig());
defaultPool.on('error', (err) => {
  console.error('[db] Unexpected error on idle PostgreSQL client:', err.message);
});

// Registry of pools keyed by database name (e.g. 'rowvane', 'rowvane_playground')
const pools = new Map();
const customConnectionMeta = new Map(); // connectionId -> { name, database, host, port, user, connectedAt }
const defaultDbName = process.env.PGDATABASE || 'rowvane';
pools.set(defaultDbName, defaultPool);

function getPlaygroundDbName() {
  return process.env.PLAYGROUND_DATABASE || 'rowvane_playground';
}

function resolveDbName(target) {
  if (!target || target === 'default') {
    return defaultDbName;
  }
  if (target === 'playground') {
    return getPlaygroundDbName();
  }
  if (customConnectionMeta.has(target)) {
    return customConnectionMeta.get(target).database || target;
  }
  return target;
}

function registerCustomPool(connectionId, pool, meta) {
  pools.set(connectionId, pool);
  customConnectionMeta.set(connectionId, meta);
}

async function unregisterCustomPool(connectionId) {
  if (pools.has(connectionId)) {
    const pool = pools.get(connectionId);
    pools.delete(connectionId);
    customConnectionMeta.delete(connectionId);
    try {
      await pool.end();
    } catch (_e) {}
  }
}

function getCustomConnections() {
  return Array.from(customConnectionMeta.entries()).map(([id, meta]) => ({
    id,
    ...meta,
  }));
}

/**
 * Returns a connection pool for the requested database target.
 * Reuses existing pools or lazily instantiates one.
 * @param {'default'|'playground'|string} [target='default']
 */
function getPool(target = 'default') {
  const dbName = resolveDbName(target);
  if (pools.has(dbName)) {
    return pools.get(dbName);
  }

  const newPool = new Pool(createPoolConfig(dbName));
  newPool.on('error', (err) => {
    console.error(`[db:${dbName}] Unexpected error on idle client:`, err.message);
  });
  pools.set(dbName, newPool);
  return newPool;
}

/**
 * Execute a parameterized query using the appropriate connection pool.
 * @param {string} text - SQL query string with $1, $2... placeholders
 * @param {Array} [params] - Parameter values
 * @param {'default'|'playground'|string} [target='default']
 */
async function query(text, params, target = 'default') {
  const targetPool = getPool(target);
  return targetPool.query(text, params);
}

/**
 * Borrow a dedicated client from the pool for transactional operations.
 * @param {(client: import('pg').PoolClient) => Promise<any>} callback
 * @param {'default'|'playground'|string} [target='default']
 */
async function withClient(callback, target = 'default') {
  const targetPool = getPool(target);
  const client = await targetPool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

/**
 * Ensure the dedicated playground database exists before connecting to it.
 */
async function ensurePlaygroundDatabaseExists() {
  const playgroundDb = getPlaygroundDbName();
  const host = process.env.PGHOST || 'localhost';
  const port = Number(process.env.PGPORT) || 5432;
  const adminDb = process.env.PGDATABASE || 'postgres';

  const adminClient = new Client({
    host,
    port,
    database: adminDb,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [playgroundDb]
    );
    if (res.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE "${playgroundDb}"`);
      console.log(`[db] Created playground database "${playgroundDb}".`);
    }
  } catch (err) {
    console.warn(`[db] Playground existence check note: ${err.message}`);
  } finally {
    try {
      await adminClient.end();
    } catch (_e) {}
  }
}

/**
 * Reset the playground database to the initial showcase schema and seed data.
 * STRICT SAFETY: Rejects reset unless the database is strictly the playground database.
 */
async function resetPlaygroundDatabase() {
  const playgroundDb = getPlaygroundDbName();
  await ensurePlaygroundDatabaseExists();

  const startTime = performance.now();
  const pool = getPool('playground');
  const client = await pool.connect();
  try {
    const dbCheck = await client.query('SELECT current_database() AS db');
    const connectedDb = dbCheck.rows[0]?.db;
    if (connectedDb !== playgroundDb) {
      throw new Error(
        `Safety violation: Attempted to reset database "${connectedDb}", but only "${playgroundDb}" is allowed.`
      );
    }

    const counts = await seedShowcaseDatabase(client);
    const durationMs = Number((performance.now() - startTime).toFixed(2));
    return {
      success: true,
      database: playgroundDb,
      counts,
      durationMs,
    };
  } finally {
    client.release();
  }
}

/**
 * Check database connectivity and metadata for health checks.
 */
async function checkHealth(target = 'default') {
  const start = performance.now();
  const targetPool = getPool(target);
  const result = await targetPool.query(
    `SELECT
       current_database() AS database,
       current_user AS user,
       current_schema() AS schema,
       version() AS version,
       NOW() AS server_time`
  );
  const latencyMs = Number((performance.now() - start).toFixed(2));
  const row = result.rows[0];
  return {
    connected: true,
    database: row.database,
    user: row.user,
    schema: row.schema,
    version: row.version.split(',')[0],
    serverTime: row.server_time,
    latencyMs,
  };
}

module.exports = {
  pool: defaultPool,
  getPool,
  query,
  withClient,
  checkHealth,
  getPlaygroundDbName,
  resolveDbName,
  ensurePlaygroundDatabaseExists,
  resetPlaygroundDatabase,
  registerCustomPool,
  unregisterCustomPool,
  getCustomConnections,
  pools,
};
