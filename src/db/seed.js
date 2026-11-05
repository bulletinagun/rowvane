const fs = require('fs');
const path = require('path');
const db = require('./index');

async function seed() {
  const sqlPath = path.join(__dirname, 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('[seed] Applying src/db/init.sql...');
    await db.query(sql);
    const tables = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    console.log(
      '[seed] Completed. Public tables:',
      tables.rows.map((r) => r.table_name).join(', ')
    );
  } catch (err) {
    console.error('[seed] Failed to seed database:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

seed();
