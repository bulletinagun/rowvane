// Playground and demo query routes
const express = require('express');
const { performance } = require('perf_hooks');
const db = require('../db');

const router = express.Router();

// Demo SQL queries
const DEMO_LIBRARY = [
  // --- 1. FUNDAMENTALS ---
  {
    id: 'fund-1',
    category: 'fundamentals',
    difficulty: 'Beginner',
    title: 'Top Departments by Budget',
    description: 'Retrieve all academic departments ordered from highest to lowest allocated budget.',
    sql: `SELECT
  dept_id,
  code,
  name,
  building,
  budget,
  established_year
FROM departments
ORDER BY budget DESC;`,
  },
  {
    id: 'fund-2',
    category: 'fundamentals',
    difficulty: 'Beginner',
    title: 'High-Performing Active Students',
    description: 'Filter active undergraduate students who maintain a CGPA of 9.00 or higher.',
    sql: `SELECT
  roll_no,
  full_name,
  dept_code,
  semester,
  cgpa,
  enrolled_on
FROM students
WHERE active = true
  AND cgpa >= 9.00
ORDER BY cgpa DESC;`,
  },
  {
    id: 'fund-3',
    category: 'fundamentals',
    difficulty: 'Beginner',
    title: 'Faculty Designation Breakdown',
    description: 'Aggregate faculty members by academic rank, counting headcount and calculating average salary.',
    sql: `SELECT
  designation,
  COUNT(*) AS faculty_count,
  ROUND(AVG(salary), 2) AS average_salary,
  MIN(salary) AS min_salary,
  MAX(salary) AS max_salary
FROM faculty
WHERE active = true
GROUP BY designation
ORDER BY average_salary DESC;`,
  },

  // --- 2. INTERMEDIATE ---
  {
    id: 'inter-1',
    category: 'intermediate',
    difficulty: 'Intermediate',
    title: 'Students with Assigned Faculty Mentors',
    description: 'Perform an INNER JOIN across students, faculty, and departments to inspect academic mentorship.',
    sql: `SELECT
  s.roll_no,
  s.full_name AS student_name,
  s.dept_code,
  s.cgpa,
  f.full_name AS mentor_name,
  f.designation AS mentor_title,
  f.email AS mentor_email
FROM students s
INNER JOIN faculty f ON s.mentor_faculty_id = f.faculty_id
INNER JOIN departments d ON s.dept_code = d.code
ORDER BY s.cgpa DESC;`,
  },
  {
    id: 'inter-2',
    category: 'intermediate',
    difficulty: 'Intermediate',
    title: 'Orphan Detection (Students with Zero Enrollments)',
    description: 'Demonstrate a classic LEFT JOIN with NULL check to uncover students who have never registered for any course.',
    sql: `SELECT
  s.student_id,
  s.roll_no,
  s.full_name,
  s.dept_code,
  s.semester,
  s.enrolled_on
FROM students s
LEFT JOIN enrollments e ON s.student_id = e.student_id
WHERE e.enrollment_id IS NULL
ORDER BY s.student_id ASC;`,
  },
  {
    id: 'inter-3',
    category: 'intermediate',
    difficulty: 'Intermediate',
    title: 'Course Enrollment Load & Capacity Status',
    description: 'Count active enrollments per course offering and classify utilization using a conditional CASE statement.',
    sql: `SELECT
  c.code AS course_code,
  c.title AS course_title,
  c.max_capacity,
  COUNT(e.enrollment_id) AS current_enrolled,
  c.max_capacity - COUNT(e.enrollment_id) AS seats_remaining,
  CASE
    WHEN COUNT(e.enrollment_id) >= c.max_capacity THEN 'FULL / OVERLOAD'
    WHEN COUNT(e.enrollment_id) >= (c.max_capacity * 0.75) THEN 'HIGH DEMAND'
    WHEN COUNT(e.enrollment_id) > 0 THEN 'OPEN SEATS'
    ELSE 'NO ENROLLMENTS'
  END AS capacity_status
FROM courses c
LEFT JOIN course_offerings co ON c.course_id = co.course_id
LEFT JOIN enrollments e ON co.offering_id = e.offering_id AND e.status = 'Enrolled'
GROUP BY c.course_id, c.code, c.title, c.max_capacity
ORDER BY current_enrolled DESC;`,
  },
  {
    id: 'inter-4',
    category: 'intermediate',
    difficulty: 'Intermediate',
    title: 'Department Budget vs Total Faculty Payroll',
    description: 'Compare departmental operational budget against current faculty payroll using HAVING filters.',
    sql: `SELECT
  d.code AS dept_code,
  d.name AS department_name,
  d.budget AS operational_budget,
  COUNT(f.faculty_id) AS total_faculty,
  COALESCE(SUM(f.salary), 0) AS total_payroll,
  ROUND(d.budget - COALESCE(SUM(f.salary), 0), 2) AS remaining_budget
FROM departments d
LEFT JOIN faculty f ON d.code = f.dept_code AND f.active = true
GROUP BY d.dept_id, d.code, d.name, d.budget
ORDER BY total_payroll DESC;`,
  },

  // --- 3. ADVANCED ---
  {
    id: 'adv-1',
    category: 'advanced',
    difficulty: 'Advanced',
    title: 'Recursive Prerequisite Hierarchy (DAG Traversal)',
    description: 'Traverse the course prerequisite graph using a PostgreSQL RECURSIVE Common Table Expression (CTE) to calculate dependency depth.',
    sql: `WITH RECURSIVE prereq_tree AS (
  -- Base case: courses that have direct prerequisites
  SELECT
    cp.course_id,
    cp.prerequisite_id,
    c_target.code AS target_course,
    c_prereq.code AS required_prereq,
    1 AS chain_depth,
    ARRAY[c_prereq.code, c_target.code]::text[] AS dependency_path
  FROM course_prerequisites cp
  JOIN courses c_target ON cp.course_id = c_target.course_id
  JOIN courses c_prereq ON cp.prerequisite_id = c_prereq.course_id

  UNION ALL

  -- Recursive step: find prerequisites of prerequisites
  SELECT
    pt.course_id,
    cp_next.prerequisite_id,
    pt.target_course,
    c_deep.code AS required_prereq,
    pt.chain_depth + 1,
    array_prepend(c_deep.code, pt.dependency_path)
  FROM prereq_tree pt
  JOIN course_prerequisites cp_next ON pt.prerequisite_id = cp_next.course_id
  JOIN courses c_deep ON cp_next.prerequisite_id = c_deep.course_id
)
SELECT
  target_course,
  chain_depth,
  required_prereq,
  array_to_string(dependency_path, ' -> ') AS full_prerequisite_chain
FROM prereq_tree
ORDER BY target_course, chain_depth DESC;`,
  },
  {
    id: 'adv-2',
    category: 'advanced',
    difficulty: 'Advanced',
    title: 'Student Cohort Window Ranking by Department',
    description: 'Calculate student academic standing using DENSE_RANK() and PERCENT_RANK() partitioned by department.',
    sql: `SELECT
  s.dept_code,
  s.roll_no,
  s.full_name,
  s.semester,
  s.cgpa,
  DENSE_RANK() OVER (
    PARTITION BY s.dept_code
    ORDER BY s.cgpa DESC NULLS LAST
  ) AS dept_rank,
  ROUND((PERCENT_RANK() OVER (
    PARTITION BY s.dept_code
    ORDER BY s.cgpa ASC NULLS FIRST
  ) * 100)::numeric, 1) AS dept_percentile,
  ROUND((AVG(s.cgpa) OVER (
    PARTITION BY s.dept_code
  ))::numeric, 2) AS dept_avg_cgpa
FROM students s
WHERE s.active = true
ORDER BY s.dept_code, dept_rank ASC;`,
  },
  {
    id: 'adv-3',
    category: 'advanced',
    difficulty: 'Advanced',
    title: 'Comprehensive Transcript Generator (Deep Join & JSON Agg)',
    description: 'Synthesize student grades across offerings into structured JSON documents with calculated GPA and total credits.',
    sql: `SELECT
  s.roll_no,
  s.full_name,
  s.dept_code,
  COUNT(g.grade_id) AS total_courses_graded,
  COALESCE(SUM(g.credits_earned), 0) AS total_credits_earned,
  ROUND(AVG(g.score), 2) AS transcript_avg_score,
  jsonb_agg(
    jsonb_build_object(
      'course', c.code,
      'title', c.title,
      'term', co.term || ' ' || co.academic_year,
      'score', g.score,
      'letter', g.letter_grade
    ) ORDER BY co.academic_year, co.term
  ) AS transcript_details
FROM students s
JOIN enrollments e ON s.student_id = e.student_id
JOIN course_offerings co ON e.offering_id = co.offering_id
JOIN courses c ON co.course_id = c.course_id
LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
GROUP BY s.student_id, s.roll_no, s.full_name, s.dept_code
HAVING COUNT(g.grade_id) > 0
ORDER BY transcript_avg_score DESC;`,
  },
  {
    id: 'adv-4',
    category: 'advanced',
    difficulty: 'Advanced',
    title: 'PostgreSQL Query Planner Analysis (EXPLAIN ANALYZE)',
    description: 'Inspect the actual execution engine, node execution times, and index scan mechanisms.',
    sql: `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
  s.roll_no,
  s.full_name,
  s.cgpa,
  d.name AS dept_name
FROM students s
JOIN departments d ON s.dept_code = d.code
WHERE s.cgpa >= 9.00
ORDER BY s.cgpa DESC;`,
  },

  // --- 4. CHAOS MODE: CONTROLLED DESTRUCTION & TORTURE ---
  {
    id: 'chaos-1',
    category: 'chaos',
    difficulty: 'Destructive',
    badge: 'DESTRUCTIVE',
    title: 'The Cascading Drop Disaster',
    description: 'Demonstrate real PostgreSQL cascading destruction: drops the "courses" table with CASCADE, wiping courses, prerequisites, offerings, enrollments, and grades simultaneously. (Can be repaired with 1-click Reset).',
    sql: `DROP TABLE courses CASCADE;

-- Confirm what happened to dependent tables
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;`,
  },
  {
    id: 'chaos-2',
    category: 'chaos',
    difficulty: 'Destructive',
    badge: 'DESTRUCTIVE',
    title: 'Emergency Grade Purge (TRUNCATE CASCADE)',
    description: 'Wipes all historical grades and resets primary key sequences instantly via TRUNCATE RESTART IDENTITY.',
    sql: `TRUNCATE TABLE grades RESTART IDENTITY;

-- Verify table is empty
SELECT count(*) AS remaining_grades FROM grades;`,
  },
  {
    id: 'chaos-3',
    category: 'chaos',
    difficulty: 'Monster SQL',
    badge: 'ADVANCED SQL',
    title: 'The Multi-Tier Departmental Analytics Matrix',
    description: 'A 60-line SQL query chaining multiple CTEs, recursive depth, window functions, statistical variance, and rollup metrics.',
    sql: `WITH dept_metrics AS (
  SELECT
    d.code AS dept_code,
    d.name AS dept_name,
    d.budget,
    COUNT(DISTINCT s.student_id) AS student_count,
    COUNT(DISTINCT f.faculty_id) AS faculty_count,
    ROUND(AVG(s.cgpa), 2) AS avg_cgpa,
    ROUND(COALESCE(SUM(f.salary), 0), 2) AS total_payroll
  FROM departments d
  LEFT JOIN students s ON d.code = s.dept_code AND s.active = true
  LEFT JOIN faculty f ON d.code = f.dept_code AND f.active = true
  GROUP BY d.dept_id, d.code, d.name, d.budget
),
course_metrics AS (
  SELECT
    c.dept_code,
    COUNT(DISTINCT c.course_id) AS total_courses,
    COALESCE(SUM(c.max_capacity), 0) AS total_capacity,
    COUNT(DISTINCT e.enrollment_id) AS active_enrollments
  FROM courses c
  LEFT JOIN course_offerings co ON c.course_id = co.course_id
  LEFT JOIN enrollments e ON co.offering_id = e.offering_id
  GROUP BY c.dept_code
)
SELECT
  dm.dept_code,
  dm.dept_name,
  dm.budget,
  dm.total_payroll,
  ROUND(dm.budget - dm.total_payroll, 2) AS surplus,
  dm.student_count,
  dm.faculty_count,
  CASE
    WHEN dm.faculty_count > 0 THEN ROUND((dm.student_count::numeric / dm.faculty_count), 1)
    ELSE NULL
  END AS student_faculty_ratio,
  dm.avg_cgpa,
  COALESCE(cm.total_courses, 0) AS catalog_size,
  COALESCE(cm.active_enrollments, 0) AS total_enrolled,
  DENSE_RANK() OVER (ORDER BY dm.budget DESC) AS budget_rank,
  DENSE_RANK() OVER (ORDER BY dm.avg_cgpa DESC NULLS LAST) AS academic_rank
FROM dept_metrics dm
LEFT JOIN course_metrics cm ON dm.dept_code = cm.dept_code
ORDER BY dm.budget DESC;`,
  },
  {
    id: 'chaos-4',
    category: 'chaos',
    difficulty: 'Torture Test',
    badge: 'CONSTRAINT TEST',
    title: 'Duplicate Primary Key Torture Test',
    description: 'Attempts to insert an existing primary key into "departments". Triggers real PostgreSQL error 23505 (unique_violation).',
    sql: `INSERT INTO departments (dept_id, code, name, building, budget, established_year)
VALUES (1, 'CONFLICT', 'Duplicate PK Department', 'Nowhere Hall', 100000.00, 2026);`,
  },
  {
    id: 'chaos-5',
    category: 'chaos',
    difficulty: 'Torture Test',
    badge: 'CONSTRAINT TEST',
    title: 'Foreign Key Violation Torture Test',
    description: 'Attempts to insert a student referencing a non-existent department code. Triggers PostgreSQL error 23503 (foreign_key_violation).',
    sql: `INSERT INTO students (roll_no, full_name, email, dept_code, semester, cgpa)
VALUES ('99BAD001', 'Ghost In The Machine', 'ghost@invalid.edu', 'NONEXISTENT_DEPT', 1, 9.00);`,
  },
  {
    id: 'chaos-6',
    category: 'chaos',
    difficulty: 'Torture Test',
    badge: 'CONSTRAINT TEST',
    title: 'CHECK Constraint Boundary Violation',
    description: 'Attempts to assign an invalid CGPA of 15.50 (schema enforces cgpa BETWEEN 0.00 AND 10.00). Triggers error 23514 (check_violation).',
    sql: `INSERT INTO students (roll_no, full_name, email, dept_code, semester, cgpa)
VALUES ('99BAD002', 'Superhuman Scholar', 'super@rowvane.edu', 'CSE', 4, 15.50);`,
  },
  {
    id: 'chaos-7',
    category: 'chaos',
    difficulty: 'Torture Test',
    badge: 'CONSTRAINT TEST',
    title: 'Referential Restriction Defense (ON DELETE RESTRICT)',
    description: 'Attempts to DROP/DELETE a department that contains active students. Foreign key ON DELETE RESTRICT blocks the deletion.',
    sql: `DELETE FROM departments WHERE code = 'CSE';`,
  },
  {
    id: 'chaos-8',
    category: 'chaos',
    difficulty: 'Transaction Lab',
    badge: 'TRANSACTION LAB',
    title: 'Multi-Stage Transaction with Savepoint Rollback',
    description: 'Executes a multi-stage transaction: grants everyone a 10.0 CGPA, sets a SAVEPOINT, mistakenly truncates grades, rolls back to the savepoint, and commits the clean change.',
    sql: `BEGIN;

-- Stage 1: Update student CGPAs
UPDATE students SET cgpa = LEAST(10.00, cgpa + 0.50) WHERE active = true;

-- Stage 2: Create a named rollback savepoint
SAVEPOINT gpa_bumped;

-- Stage 3: A dangerous mistaken deletion inside the transaction
DELETE FROM grades WHERE score < 95.00;

-- Stage 4: Recover from the mistake using ROLLBACK TO SAVEPOINT
ROLLBACK TO SAVEPOINT gpa_bumped;

-- Stage 5: Commit the transaction safely
COMMIT;

-- Inspect students to confirm CGPA bump was preserved while grades were saved
SELECT roll_no, full_name, cgpa FROM students WHERE active = true LIMIT 5;`,
  },
];

// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------

/**
 * GET /api/playground/demos
 * Returns the curated demonstration library.
 */
router.get('/demos', (req, res) => {
  const category = req.query.category;
  if (category) {
    return res.json({
      demos: DEMO_LIBRARY.filter((d) => d.category === category),
    });
  }
  res.json({ demos: DEMO_LIBRARY });
});

/**
 * GET /api/playground/status
 * Returns current status and table inventory of the playground database.
 */
router.get('/status', async (req, res, next) => {
  try {
    const playgroundDb = db.getPlaygroundDbName();
    const targetPool = db.getPool('playground');

    const result = await targetPool.query(`
      SELECT
        t.table_name,
        (SELECT COUNT(*)::int FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `);

    // Fetch exact row counts for each table
    const tableStats = [];
    let totalRows = 0;
    for (const row of result.rows) {
      try {
        const countRes = await targetPool.query(
          `SELECT COUNT(*)::int AS count FROM "${row.table_name}"`
        );
        const count = countRes.rows[0]?.count ?? 0;
        totalRows += count;
        tableStats.push({
          name: row.table_name,
          columns: row.column_count,
          rows: count,
        });
      } catch (_e) {
        tableStats.push({
          name: row.table_name,
          columns: row.column_count,
          rows: null,
        });
      }
    }

    const REQUIRED_TABLES = [
      'departments',
      'faculty',
      'students',
      'courses',
      'course_prerequisites',
      'course_offerings',
      'enrollments',
      'grades',
      'audit_logs',
    ];
    const currentTableNames = new Set(tableStats.map((t) => t.name));
    const hasAllTables = REQUIRED_TABLES.every((t) => currentTableNames.has(t));
    const isClean = hasAllTables && totalRows >= 170;

    res.json({
      database: playgroundDb,
      tableCount: tableStats.length,
      totalRows,
      tables: tableStats,
      isClean,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/playground/reset
 * Restores the playground database to the clean initial university showcase state.
 * STRICT SAFETY: Only operates on rowvane_playground.
 */
router.post('/reset', async (req, res, next) => {
  try {
    const { confirm } = req.body || {};
    if (!confirm) {
      return res.status(400).json({
        error:
          'Reset confirmation required. Send { "confirm": true } to reset the playground database.',
      });
    }

    const resetResult = await db.resetPlaygroundDatabase();
    res.json({
      message: 'Playground database successfully reset to clean showcase state.',
      ...resetResult,
    });
  } catch (err) {
    next(err);
  }
});

let isConcurrencyDemoActive = false;

/**
 * POST /api/playground/concurrency/lock-demo
 * Demonstrates real PostgreSQL multi-session row-level locking and lock timeouts.
 * Session 1 acquires an exclusive row lock (SELECT FOR UPDATE).
 * Session 2 attempts an UPDATE and encounters a lock wait / statement timeout.
 * Returns diagnostic metrics including blocked PID, lock modes, and session status.
 */
router.post('/concurrency/lock-demo', async (req, res, next) => {
  if (isConcurrencyDemoActive) {
    return res.status(429).json({
      error:
        'Another concurrency demonstration is actively running. Please wait for it to complete.',
    });
  }
  isConcurrencyDemoActive = true;

  const pool = db.getPool('playground');
  let client1 = null;
  let client2 = null;

  try {
    client1 = await pool.connect();
    client2 = await pool.connect();

    // 1. Session 1: Begin transaction and hold exclusive lock on student 1
    await client1.query('BEGIN');
    const lockTarget = await client1.query(
      'SELECT student_id, roll_no, full_name, cgpa FROM students WHERE student_id = 1 FOR UPDATE'
    );
    const lockedStudent = lockTarget.rows[0];

    // Get backend PIDs
    const pid1Res = await client1.query('SELECT pg_backend_pid() AS pid');
    const pid2Res = await client2.query('SELECT pg_backend_pid() AS pid');
    const pid1 = pid1Res.rows[0]?.pid;
    const pid2 = pid2Res.rows[0]?.pid;

    // 2. Session 2: Attempt update with a 1500ms statement_timeout
    let session2Error = null;
    const s2Start = performance.now();
    try {
      await client2.query('SET statement_timeout = 1500');
      await client2.query(
        'UPDATE students SET cgpa = 10.00 WHERE student_id = 1'
      );
    } catch (err) {
      session2Error = {
        message: err.message,
        code: err.code,
        routine: err.routine,
      };
    }
    const s2DurationMs = Number((performance.now() - s2Start).toFixed(2));

    // Release Session 1 cleanly
    await client1.query('ROLLBACK');

    res.json({
      success: true,
      scenario: 'Row-Level Exclusive Lock Conflict (SELECT ... FOR UPDATE)',
      session1: {
        pid: pid1,
        action: 'Held exclusive row-level lock on student_id = 1 inside active transaction',
        lockedRecord: lockedStudent,
      },
      session2: {
        pid: pid2,
        action: 'Attempted UPDATE on locked row with 1500ms statement_timeout',
        durationMs: s2DurationMs,
        lockBlocked: Boolean(session2Error),
        errorEncountered: session2Error,
      },
      explanation:
        'PostgreSQL row-level locking prevented Session 2 from dirty-updating the row currently held by Session 1 until the lock timeout aborted Session 2. Once Session 1 rolled back, lock contention was released.',
    });
  } catch (err) {
    next(err);
  } finally {
    isConcurrencyDemoActive = false;
    if (client1) {
      try {
        await client1.query('ROLLBACK');
        await client1.query('DISCARD ALL');
        client1.release();
      } catch (e) {
        client1.release(e);
      }
    }
    if (client2) {
      try {
        await client2.query('ROLLBACK');
        await client2.query('DISCARD ALL');
        client2.release();
      } catch (e) {
        client2.release(e);
      }
    }
  }
});

/**
 * POST /api/playground/generate-workload
 * Generates an adaptive, bounded synthetic dataset for benchmarking query plans and disk usage.
 * Presets:
 *   - 'small':  1,000 rows (suitable for modest laptops, ~15ms, < 1MB RAM)
 *   - 'medium': 5,000 rows (~60ms, ~3MB RAM)
 *   - 'large':  25,000 rows (~250ms, ~15MB RAM)
 * Body: { preset?: 'small'|'medium'|'large', customRows?: number }
 */
router.post('/generate-workload', async (req, res, next) => {
  const pool = db.getPool('playground');
  const client = await pool.connect();

  try {
    const { preset = 'small', customRows } = req.body || {};
    const PRESETS = {
      small: 1000,
      medium: 5000,
      large: 25000,
    };

    let targetRows = PRESETS[preset] || PRESETS.small;
    if (typeof customRows === 'number' && !isNaN(customRows)) {
      targetRows = Math.max(100, Math.min(customRows, 50000));
    }

    const MAX_ALLOWED = Number(process.env.CHAOS_MAX_GENERATION_ROWS) || 50000;
    targetRows = Math.min(targetRows, MAX_ALLOWED);

    const start = performance.now();
    await client.query('BEGIN');

    // Create benchmark table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chaos_benchmark_dataset (
        id SERIAL PRIMARY KEY,
        device_tag VARCHAR(30) NOT NULL,
        reading_value NUMERIC(10, 2) NOT NULL,
        category VARCHAR(40) NOT NULL,
        payload JSONB,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Clear existing generated benchmark rows
    await client.query('TRUNCATE TABLE chaos_benchmark_dataset RESTART IDENTITY;');

    // Ingest in bounded chunks of 1,000 rows to ensure low memory consumption (< 2MB)
    const BATCH_SIZE = 1000;
    const CATEGORIES = ['TELEMETRY', 'SENSOR', 'DIAGNOSTIC', 'NETWORK', 'SECURITY'];
    const DEVICES = ['EDGE-NODE-01', 'CORE-ROUTER-99', 'CLUSTER-ALPHA', 'SATELLITE-RELAY', 'IOT-GATEWAY'];

    for (let i = 0; i < targetRows; i += BATCH_SIZE) {
      const currentBatchSize = Math.min(BATCH_SIZE, targetRows - i);
      const params = [];
      const rowPlaceholders = [];

      for (let j = 0; j < currentBatchSize; j++) {
        const itemIdx = i + j + 1;
        const dev = DEVICES[itemIdx % DEVICES.length];
        const val = Number(((itemIdx * 17.3) % 1000).toFixed(2));
        const cat = CATEGORIES[itemIdx % CATEGORIES.length];
        const payload = JSON.stringify({ seq: itemIdx, status: 'OK', checksum: itemIdx * 31 });

        params.push(dev, val, cat, payload);
        const pLen = params.length;
        rowPlaceholders.push(`($${pLen - 3}, $${pLen - 2}, $${pLen - 1}, $${pLen}::jsonb)`);
      }

      await client.query(
        `INSERT INTO chaos_benchmark_dataset (device_tag, reading_value, category, payload)
         VALUES ${rowPlaceholders.join(', ')};`,
        params
      );
    }

    // Create index on reading_value for query planning tests
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chaos_benchmark_val
      ON chaos_benchmark_dataset (reading_value DESC);
    `);

    await client.query('COMMIT');
    const durationMs = Number((performance.now() - start).toFixed(2));

    // Inspect actual table size on disk
    const sizeRes = await client.query(`
      SELECT
        pg_size_pretty(pg_total_relation_size('chaos_benchmark_dataset')) AS pretty_size,
        pg_total_relation_size('chaos_benchmark_dataset') AS bytes
      FROM pg_class
      WHERE relname = 'chaos_benchmark_dataset';
    `);

    res.json({
      success: true,
      table: 'chaos_benchmark_dataset',
      preset,
      rowsGenerated: targetRows,
      durationMs,
      diskUsage: sizeRes.rows[0]?.pretty_size || 'Unknown',
      diskBytes: sizeRes.rows[0]?.bytes || 0,
      safetyCeiling: MAX_ALLOWED,
      message: `Successfully generated ${targetRows.toLocaleString()} rows in bounded batches (${durationMs}ms).`,
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
 * DELETE /api/playground/generate-workload
 * Drops the benchmark dataset table to reclaim storage immediately.
 */
router.delete('/generate-workload', async (req, res, next) => {
  try {
    const pool = db.getPool('playground');
    await pool.query('DROP TABLE IF EXISTS chaos_benchmark_dataset CASCADE;');
    res.json({
      success: true,
      message: 'Benchmark dataset table chaos_benchmark_dataset dropped. Storage reclaimed.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/playground/performance/benchmark
 * Runs real EXPLAIN (ANALYZE, FORMAT JSON) query plan comparisons on indexed vs unindexed queries.
 */
router.post('/performance/benchmark', async (req, res, next) => {
  try {
    const pool = db.getPool('playground');
    const client = await pool.connect();

    try {
      function findScanNode(plan) {
        if (!plan) return 'Unknown';
        if (Array.isArray(plan.Plans)) {
          for (const sub of plan.Plans) {
            const res = findScanNode(sub);
            if (res.includes('Index')) return res;
          }
        }
        if (typeof plan['Node Type'] === 'string' && plan['Node Type'].includes('Scan')) {
          return plan['Node Type'];
        }
        if (Array.isArray(plan.Plans)) {
          for (const sub of plan.Plans) {
            const res = findScanNode(sub);
            if (res !== 'Unknown') return res;
          }
        }
        return plan['Node Type'] || 'Unknown';
      }

      // 1. Query with indexed lookup on cgpa (forcing index scan inside transaction)
      await client.query('BEGIN');
      await client.query('SET LOCAL enable_seqscan = off');
      const indexedExplain = await client.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM students WHERE cgpa >= 9.50 ORDER BY cgpa DESC;
      `);
      await client.query('ROLLBACK');

      // 2. Query with function expression on full_name (forcing sequential scan)
      await client.query('BEGIN');
      await client.query('SET LOCAL enable_seqscan = on');
      const unindexedExplain = await client.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM students WHERE lower(full_name) LIKE '%a%' ORDER BY length(full_name);
      `);
      await client.query('ROLLBACK');

      const indexedPlan = indexedExplain.rows[0]?.['QUERY PLAN']?.[0] || {};
      const unindexedPlan = unindexedExplain.rows[0]?.['QUERY PLAN']?.[0] || {};

      const indexedNodeType = findScanNode(indexedPlan.Plan);
      const unindexedNodeType = findScanNode(unindexedPlan.Plan);

      res.json({
        success: true,
        indexedQuery: {
          sql: 'SELECT * FROM students WHERE cgpa >= 9.50 ORDER BY cgpa DESC',
          nodeType: indexedNodeType,
          indexName: 'idx_students_cgpa',
          executionTimeMs: indexedPlan['Execution Time'],
          planningTimeMs: indexedPlan['Planning Time'],
          totalCost: indexedPlan.Plan?.['Total Cost'],
        },
        unindexedQuery: {
          sql: "SELECT * FROM students WHERE lower(full_name) LIKE '%a%' ORDER BY length(full_name)",
          nodeType: unindexedNodeType,
          executionTimeMs: unindexedPlan['Execution Time'],
          planningTimeMs: unindexedPlan['Planning Time'],
          totalCost: unindexedPlan.Plan?.['Total Cost'],
        },
        rawPlans: {
          indexed: indexedPlan,
          unindexed: unindexedPlan,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
