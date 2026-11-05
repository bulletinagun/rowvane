// End-to-end test suite
const http = require('http');
const { Client } = require('pg');
const app = require('./src/app');
const db = require('./src/db');

async function run() {
  console.log('======================================================');
  console.log('         ROWVANE SYSTEM VERIFICATION SUITE            ');
  console.log('======================================================');

  let passed = 0;
  let total = 0;

  function assert(condition, desc) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Spin up ephemeral server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[test] Server running on ${baseUrl}`);

  async function apiGet(path) {
    const res = await fetch(`${baseUrl}${path}`);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  }

  async function apiPost(path, body = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  }

  async function apiPatch(path, body = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  }

  async function apiDelete(path, body = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  }

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: Health & Dual-Target Database Status
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Health & Database Target Isolation ---');
    const healthDef = await apiGet('/api/health?target=default');
    assert(healthDef.status === 200, 'GET /api/health for default target returns 200');
    assert(healthDef.data.db?.connected === true, 'Default database is connected');
    assert(healthDef.data.db?.database === 'rowvane', 'Default database name is "rowvane"');

    const healthPlayground = await apiGet('/api/health?target=playground');
    assert(healthPlayground.status === 200, 'GET /api/health for playground target returns 200');
    assert(healthPlayground.data.db?.connected === true, 'Playground database is connected');
    assert(healthPlayground.data.db?.database === 'rowvane_playground', 'Playground database name is "rowvane_playground"');

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Table Listings & Row Browser in Both Databases
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Dual Database Table Listings & Metadata ---');
    const tablesPlayground = await apiGet('/api/tables?target=playground');
    assert(tablesPlayground.status === 200, 'GET /api/tables?target=playground returns 200');
    const pgTableNames = tablesPlayground.data.tables.map((t) => t.name);
    assert(pgTableNames.includes('departments'), 'Playground contains departments');
    assert(pgTableNames.includes('students'), 'Playground contains students');
    assert(pgTableNames.includes('courses'), 'Playground contains courses');
    assert(pgTableNames.includes('faculty'), 'Playground contains faculty');
    assert(pgTableNames.includes('course_offerings'), 'Playground contains course_offerings');
    assert(pgTableNames.includes('course_prerequisites'), 'Playground contains course_prerequisites');
    assert(pgTableNames.includes('enrollments'), 'Playground contains enrollments');
    assert(pgTableNames.includes('grades'), 'Playground contains grades');
    assert(pgTableNames.includes('audit_logs'), 'Playground contains audit_logs');

    const tablesReal = await apiGet('/api/tables?target=default');
    assert(tablesReal.status === 200, 'GET /api/tables?target=default returns 200');
    const realTableNames = tablesReal.data.tables.map((t) => t.name);
    assert(realTableNames.includes('departments') && realTableNames.includes('students'), 'Real database contains initial tables');
    assert(!realTableNames.includes('grades'), 'Real database is strictly isolated from playground tables');

    // Test row fetch with pagination and sorting
    const studentsRows = await apiGet('/api/tables/students/rows?target=playground&limit=5&sort=cgpa&dir=desc');
    assert(studentsRows.status === 200, 'GET /api/tables/students/rows returns 200');
    assert(studentsRows.data.rows?.length === 5, 'Fetched 5 students with pagination');
    assert(studentsRows.data.totalRows >= 25, 'Total students row count exceeds 25');
    assert(studentsRows.data.rows[0].cgpa >= studentsRows.data.rows[1].cgpa, 'Rows sorted descending by CGPA');

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Curated Playground Demos & Chaos Mode
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Playground Demos & Chaos Operations ---');
    const demosRes = await apiGet('/api/playground/demos');
    assert(demosRes.status === 200, 'GET /api/playground/demos returns 200');
    assert(demosRes.data.demos?.length >= 15, 'Demo library contains 15+ curated demonstrations');

    const chaosDemos = demosRes.data.demos.filter((d) => d.category === 'chaos');
    assert(chaosDemos.length >= 6, 'Chaos Mode contains 6+ destructive & torture scenarios');

    // Execute recursive CTE demo
    const recursiveDemo = demosRes.data.demos.find((d) => d.id === 'adv-1');
    const recRun = await apiPost('/api/query', { sql: recursiveDemo.sql, target: 'playground' });
    assert(recRun.status === 200, 'Recursive CTE prerequisite DAG executes successfully');
    assert(recRun.data.results?.[0]?.rows?.length > 0, 'Recursive CTE returns non-empty dependency paths');

    // Execute Monster SQL demo
    const monsterDemo = demosRes.data.demos.find((d) => d.id === 'chaos-3');
    const monsterRun = await apiPost('/api/query', { sql: monsterDemo.sql, target: 'playground' });
    assert(monsterRun.status === 200, 'Monster SQL analytics matrix executes successfully');
    assert(monsterRun.data.results?.[0]?.rows?.length === 6, 'Monster SQL aggregates across all 6 departments');

    // Constraint Torture Test: Unique Violation (23505)
    const tortureDemo = demosRes.data.demos.find((d) => d.id === 'chaos-4');
    const tortureRun = await apiPost('/api/query', { sql: tortureDemo.sql, target: 'playground' });
    assert(tortureRun.status === 400 || tortureRun.status === 500, 'Constraint torture query correctly fails');
    const pgErrorCode = tortureRun.data.error?.code || tortureRun.data.code;
    assert(pgErrorCode === '23505', 'PostgreSQL error code 23505 (unique_violation) reported');

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Concurrency & Performance Laboratories
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Concurrency & Performance Laboratories ---');
    const lockDemo = await apiPost('/api/playground/concurrency/lock-demo');
    assert(lockDemo.status === 200, 'Concurrency lock simulator executes successfully');
    assert(lockDemo.data.session1?.pid !== lockDemo.data.session2?.pid, 'Two distinct backend PIDs used');
    assert(lockDemo.data.session2?.lockBlocked === true, 'Session 2 was blocked by row-level lock timeout');

    const perfDemo = await apiPost('/api/playground/performance/benchmark');
    assert(perfDemo.status === 200, 'Query performance benchmark executes successfully');
    assert(perfDemo.data.indexedQuery?.nodeType?.includes('Index'), 'Indexed query utilizes Index Scan');
    assert(perfDemo.data.unindexedQuery?.nodeType?.includes('Seq'), 'Unindexed query utilizes Sequential Scan');

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Destructive Operation & 1-Click Reset Restoration
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Destruction & 1-Click Reset Restoration ---');
    // Drop table courses with CASCADE
    const dropRes = await apiPost('/api/query', {
      sql: 'DROP TABLE courses CASCADE;',
      target: 'playground',
    });
    assert(dropRes.status === 200, 'DROP TABLE courses CASCADE executes in playground');

    const statusAfterDrop = await apiGet('/api/playground/status');
    assert(statusAfterDrop.data.isClean === false, 'Playground correctly detects modified/corrupted state');

    // Execute 1-click Reset
    const resetRes = await apiPost('/api/playground/reset', { confirm: true });
    assert(resetRes.status === 200, 'Playground reset endpoint returns 200');
    assert(resetRes.data.success === true, 'Reset reported success');
    assert(resetRes.data.counts?.departments === 6, 'All 6 departments restored');
    assert(resetRes.data.counts?.courses === 19, 'All 19 courses restored after cascading drop');

    const statusAfterReset = await apiGet('/api/playground/status');
    assert(statusAfterReset.data.isClean === true, 'Playground status confirmed pristine and clean');

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Generic Database Structure Explorer
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Generic Database Structure Explorer ---');
    const explorerRes = await apiGet('/api/explorer/schema?target=playground');
    assert(explorerRes.status === 200, 'GET /api/explorer/schema returns 200');
    assert(explorerRes.data.tables?.length >= 9, 'Structure explorer exposes all schema tables');
    assert(explorerRes.data.relationships?.length >= 10, 'Structure explorer captures directed foreign keys');

    const studentsTableMeta = explorerRes.data.tables.find((t) => t.name === 'students');
    assert(studentsTableMeta.primaryKeys.includes('student_id'), 'Students PK identified as student_id');
    const mentorFk = studentsTableMeta.foreignKeys.find((fk) => fk.fromColumn === 'mentor_faculty_id');
    assert(mentorFk?.toTable === 'faculty', 'Mentor foreign key correctly links to faculty table');
    assert(mentorFk?.onDelete === 'SET NULL', 'Mentor foreign key onDelete rule is SET NULL');

    // -------------------------------------------------------------------------
    // TEST SECTION 7: CSV Import with Dynamic Table Generation
    // -------------------------------------------------------------------------
    console.log('\n--- 7. CSV Import & Type Inference ---');
    const testHeaders = ['Product Code', 'Item Description', 'Retail Price', 'In Stock', 'Created At'];
    const testRows = [
      ['PROD-001', 'Quantum Core Processor', '499.99', 'true', '2026-01-15'],
      ['PROD-002', 'Neural Interface Cable', '24.50', 'true', '2026-02-01'],
      ['PROD-003', 'Holographic Display Unit', '1200.00', 'false', '2026-02-10'],
    ];

    const previewRes = await apiPost('/api/import-export/csv/preview', {
      headers: testHeaders,
      rows: testRows,
    });
    assert(previewRes.status === 200, 'CSV preview returns 200');
    assert(previewRes.data.columns[0].inferredType === 'TEXT', 'Product Code inferred as TEXT');
    assert(previewRes.data.columns[2].inferredType.startsWith('NUMERIC'), 'Retail Price inferred as NUMERIC');
    assert(previewRes.data.columns[3].inferredType === 'BOOLEAN', 'In Stock inferred as BOOLEAN');

    // Execute dynamic table creation and import
    const newTableName = 'm4_test_inventory';
    const importRes = await apiPost('/api/import-export/csv/import', {
      tableName: newTableName,
      createNewTable: true,
      columns: [
        { name: 'prod_code', type: 'TEXT', sourceIndex: 0 },
        { name: 'item_desc', type: 'TEXT', sourceIndex: 1 },
        { name: 'price', type: 'NUMERIC(10,2)', sourceIndex: 2 },
        { name: 'in_stock', type: 'BOOLEAN', sourceIndex: 3 },
      ],
      rows: testRows,
      target: 'playground',
    });
    assert(importRes.status === 200, 'Dynamic CSV table import returns 200');
    assert(importRes.data.importedRows === 3, 'Imported 3 rows into dynamically generated table');

    // Verify imported rows in playground
    const verifyImport = await apiGet(`/api/tables/${newTableName}/rows?target=playground`);
    assert(verifyImport.status === 200 && verifyImport.data.totalRows === 3, 'Imported table verified via table rows API');

    // Clean up test table
    await apiPost('/api/query', { sql: `DROP TABLE IF EXISTS ${newTableName};`, target: 'playground' });

    // -------------------------------------------------------------------------
    // TEST SECTION 8: SQL Script Export & Native Utilities Check
    // -------------------------------------------------------------------------
    console.log('\n--- 8. SQL Export & Native Backup Utilities ---');
    const sqlExportRes = await apiGet('/api/import-export/export-sql?mode=schema&target=playground');
    assert(sqlExportRes.status === 200, 'SQL Schema export returns 200');
    assert(sqlExportRes.headers.get('content-type').includes('application/sql'), 'Content-Type is application/sql');
    assert(sqlExportRes.data.includes('CREATE TABLE IF NOT EXISTS "departments"'), 'Export contains DDL for departments');

    const utilsRes = await apiGet('/api/backup-restore/utilities');
    assert(utilsRes.status === 200, 'GET /api/backup-restore/utilities returns 200');
    assert(typeof utilsRes.data.pgDump?.available === 'boolean', 'pg_dump availability checked');
    assert(typeof utilsRes.data.psql?.available === 'boolean', 'psql availability checked');

    // -------------------------------------------------------------------------
    // TEST SECTION 9: Editable Spreadsheet & Direct Database Mutation
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Editable Spreadsheet & Database Mutation ---');
    // Insert new row
    const insertStudentRes = await apiPost('/api/tables/students/rows?target=playground', {
      row: {
        roll_no: 'VERIFY-999',
        full_name: 'Verifiable Student',
        email: 'verify999@campus.edu',
        dept_code: 'CSE',
        semester: 3,
        cgpa: 3.82,
      },
    });
    assert(insertStudentRes.status === 201, 'POST /api/tables/students/rows inserts row with 201');
    const createdStudentId = insertStudentRes.data.row?.student_id;
    assert(Boolean(createdStudentId), 'Inserted row returns assigned primary key ID');

    // Patch single cell
    const patchStudentRes = await apiPatch('/api/tables/students/rows?target=playground', {
      pks: { student_id: createdStudentId },
      updates: { cgpa: 3.98, full_name: 'Verifiable Student (Promoted)' },
    });
    assert(patchStudentRes.status === 200, 'PATCH /api/tables/students/rows updates row with 200');
    assert(Number(patchStudentRes.data.row?.cgpa) === 3.98, 'Cell value updated in PostgreSQL');

    // Patch to explicit SQL NULL
    const nullStudentRes = await apiPatch('/api/tables/students/rows?target=playground', {
      pks: { student_id: createdStudentId },
      updates: { mentor_faculty_id: null },
    });
    assert(nullStudentRes.status === 200 && nullStudentRes.data.row?.mentor_faculty_id === null, 'Cell explicitly set to SQL NULL');

    // Constraint error validation: invalid check constraint cgpa > 10.0
    const badCheckRes = await apiPatch('/api/tables/students/rows?target=playground', {
      pks: { student_id: createdStudentId },
      updates: { cgpa: 15.0 },
    });
    assert(badCheckRes.status === 400 && badCheckRes.data.code === '23514', 'Check constraint error code 23514 returned on invalid edit');

    // Constraint error validation: foreign key violation
    const badFkRes = await apiPatch('/api/tables/students/rows?target=playground', {
      pks: { student_id: createdStudentId },
      updates: { dept_code: 'XYZ' },
    });
    assert(badFkRes.status === 400 && badFkRes.data.code === '23503', 'Foreign key error code 23503 returned on invalid relation edit');

    // Delete row
    const deleteStudentRes = await apiDelete('/api/tables/students/rows?target=playground', {
      pks: { student_id: createdStudentId },
    });
    assert(deleteStudentRes.status === 200, 'DELETE /api/tables/students/rows deletes row with 200');
    assert(deleteStudentRes.data.deletedRow?.student_id === createdStudentId, 'Deleted row returned with verified primary key');

    // -------------------------------------------------------------------------
    // TEST SECTION 10: Real Database Mode & Custom PostgreSQL Connections
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Real Database Mode & Custom Connections ---');
    const testConnRes = await apiPost('/api/connections/test', {
      host: 'localhost',
      port: 5432,
      database: 'rowvane',
    });
    assert(testConnRes.status === 200 && testConnRes.data.success === true, 'POST /api/connections/test validates PostgreSQL connection');
    assert(testConnRes.data.database === 'rowvane', 'Connection test returns connected database name');

    const connectRes = await apiPost('/api/connections/connect', {
      name: 'Test Profile',
      host: 'localhost',
      port: 5432,
      database: 'rowvane',
    });
    assert(connectRes.status === 201 && connectRes.data.success === true, 'POST /api/connections/connect registers active pool');
    const customConnId = connectRes.data.connection?.connectionId;
    assert(Boolean(customConnId), 'Connection profile assigned unique identifier');

    // Verify querying via custom target
    const customTablesRes = await apiGet(`/api/tables?target=${customConnId}`);
    assert(customTablesRes.status === 200, 'GET /api/tables routed seamlessly via custom connection pool');

    // Disconnect
    const disconnectRes = await apiPost('/api/connections/disconnect', { connectionId: customConnId });
    assert(disconnectRes.status === 200 && disconnectRes.data.success === true, 'POST /api/connections/disconnect closes pool cleanly');

    // -------------------------------------------------------------------------
    // TEST SECTION 11: Strict Safeguards & Real Database Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Safety Safeguards & Real Database Protection ---');
    const realDbCheck = await db.pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const realTables = realDbCheck.rows.map((r) => r.table_name);
    assert(
      realTables.length === 2 && realTables.includes('departments') && realTables.includes('students'),
      'Real development database "rowvane" remains 100% untouched and pristine'
    );

  } finally {
    server.close();
    for (const p of db.pools.values()) {
      await p.end();
    }
  }

  console.log(`\n======================================================`);
  console.log(`Verification Complete: ${passed}/${total} tests passed.`);
  console.log(`======================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[fatal] Verification test failed:', err);
  process.exit(1);
});
