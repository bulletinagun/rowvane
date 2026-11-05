/**
 * CLI script to seed the dedicated Rowvane Playground database.
 * Run directly or via: npm run seed:playground
 */

const { Client } = require('pg');
const { seedShowcaseDatabase } = require('./seedShowcase');

async function run() {
  const host = process.env.PGHOST || 'localhost';
  const port = Number(process.env.PGPORT) || 5432;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const playgroundDb = process.env.PLAYGROUND_DATABASE || 'rowvane_playground';

  // Ensure DB exists
  const adminDb = process.env.PGDATABASE || 'postgres';
  const adminClient = new Client({
    host,
    port,
    database: adminDb,
    user,
    password,
  });

  try {
    await adminClient.connect();
    const checkRes = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [playgroundDb]
    );
    if (checkRes.rows.length === 0) {
      console.log(`[playground] Creating database "${playgroundDb}"...`);
      await adminClient.query(`CREATE DATABASE "${playgroundDb}"`);
    }
  } catch (err) {
    console.warn(`[playground] Note checking/creating database: ${err.message}`);
  } finally {
    try {
      await adminClient.end();
    } catch (_e) {}
  }

  // Connect to playground DB and apply schema + seeds
  const pgClient = new Client({
    host,
    port,
    database: playgroundDb,
    user,
    password,
  });

  try {
    await pgClient.connect();
    console.log(`[playground] Seeding showcase university dataset into "${playgroundDb}"...`);
    const counts = await seedShowcaseDatabase(pgClient);
    console.log('[playground] Showcase database seeded successfully!');
    console.table(counts);
  } catch (err) {
    console.error('[playground] Failed to seed playground database:', err.message);
    process.exitCode = 1;
  } finally {
    try {
      await pgClient.end();
    } catch (_e) {}
  }
}

run();
