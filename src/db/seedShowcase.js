/**
 * Rowvane Showcase University Seed Generator
 * Populates the showcase schema with rich, interconnected, realistic data
 * including deliberate edge cases (students with no enrollments, courses at capacity,
 * recursive prerequisite chains, Unicode names, varied grades, and audit trails).
 */

const fs = require('fs');
const path = require('path');

async function seedShowcaseDatabase(dbClient) {
  // 1. Drop existing tables with CASCADE so all constraints and structures are cleanly recreated
  await dbClient.query(`
    DROP TABLE IF EXISTS
      audit_logs,
      grades,
      enrollments,
      course_offerings,
      course_prerequisites,
      courses,
      students,
      faculty,
      departments
    CASCADE;
  `);

  // 2. Apply Fresh Schema
  const schemaPath = path.join(__dirname, 'showcase_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await dbClient.query(schemaSql);

  // 3. Insert Departments
  await dbClient.query(`
    INSERT INTO departments (code, name, building, budget, established_year) VALUES
      ('CSE', 'Computer Science & Engineering', 'Alan Turing Block', 2850000.00, 1984),
      ('ECE', 'Electronics & Communications', 'Claude Shannon Hall', 1950000.00, 1986),
      ('ME',  'Mechanical Engineering', 'Nikola Tesla Workshop', 1600000.00, 1978),
      ('MATH', 'Mathematics & Computing', 'Leonhard Euler Wing', 1100000.00, 1975),
      ('BIO',  'Biomedical & Neural Sciences', 'Rosalind Franklin Center', 2100000.00, 2005),
      ('HUM',  'Humanities & Social Sciences', 'Aristotle Pavilion', 850000.00, 1972);
  `);

  // 4. Insert Faculty (with Unicode and diverse designations)
  await dbClient.query(`
    INSERT INTO faculty (employee_no, full_name, email, dept_code, designation, hire_date, salary, active) VALUES
      ('FAC-1001', 'Dr. Ada Lovelace', 'ada.lovelace@rowvane.edu', 'CSE', 'Professor', '2012-08-15', 145000.00, true),
      ('FAC-1002', 'Dr. Alan Turing', 'alan.turing@rowvane.edu', 'CSE', 'Professor', '2010-01-10', 152000.00, true),
      ('FAC-1003', 'Dr. Grace Hopper', 'grace.hopper@rowvane.edu', 'CSE', 'Associate Professor', '2016-07-01', 128000.00, true),
      ('FAC-1004', 'Dr. Claude Shannon', 'claude.shannon@rowvane.edu', 'ECE', 'Professor', '2011-09-01', 148000.00, true),
      ('FAC-1005', 'Dr. Émilie du Châtelet', 'emilie.chatelet@rowvane.edu', 'MATH', 'Professor', '2014-03-12', 139000.00, true),
      ('FAC-1006', 'Dr. Nikola Tesla', 'nikola.tesla@rowvane.edu', 'ECE', 'Associate Professor', '2017-11-01', 122000.00, true),
      ('FAC-1007', 'Dr. Srinivasa Ramanujan', 'srinivasa.r@rowvane.edu', 'MATH', 'Professor', '2015-06-20', 146000.00, true),
      ('FAC-1008', 'Dr. Rosalind Franklin', 'rosalind.f@rowvane.edu', 'BIO', 'Professor', '2018-02-01', 138000.00, true),
      ('FAC-1009', 'Dr. René Descartes', 'rene.descartes@rowvane.edu', 'HUM', 'Associate Professor', '2019-08-15', 115000.00, true),
      ('FAC-1010', 'Dr. Søren Kierkegaard', 'soren.k@rowvane.edu', 'HUM', 'Assistant Professor', '2021-01-15', 96000.00, true),
      ('FAC-1011', 'Dr. Richard Feynman', 'richard.feynman@rowvane.edu', 'ME', 'Professor', '2013-05-10', 142000.00, true),
      ('FAC-1012', 'Elena Rostova', 'elena.rostova@rowvane.edu', 'CSE', 'Lecturer', '2023-08-01', 78000.00, true),
      ('FAC-1013', 'Kenjiro Takahashi (山田 太郎)', 'kenjiro.t@rowvane.edu', 'BIO', 'Adjunct Professor', '2022-09-01', 88000.00, false);
  `);

  // 5. Insert Students (Mentored, unmentored, high CGPA, probation, diverse cohorts)
  await dbClient.query(`
    INSERT INTO students (roll_no, full_name, email, dept_code, semester, cgpa, mentor_faculty_id, active, enrolled_on) VALUES
      ('24CSE001', 'Aarav Mehta', 'aarav.mehta@rowvane.edu', 'CSE', 4, 9.65, 1, true, '2024-08-01'),
      ('24CSE002', 'Diya Nair', 'diya.nair@rowvane.edu', 'CSE', 4, 9.82, 1, true, '2024-08-01'),
      ('24CSE003', 'Liam O''Connor', 'liam.oconnor@rowvane.edu', 'CSE', 4, 8.45, 2, true, '2024-08-01'),
      ('24CSE004', 'Chen Wei (陈伟)', 'chen.wei@rowvane.edu', 'CSE', 4, 9.12, 3, true, '2024-08-01'),
      ('23CSE041', 'Sofia Rodriguez', 'sofia.r@rowvane.edu', 'CSE', 6, 8.90, 2, true, '2023-08-01'),
      ('23CSE042', 'Marcus Vance', 'marcus.v@rowvane.edu', 'CSE', 6, 7.34, 3, true, '2023-08-01'),
      ('22CSE088', 'Fatima Al-Mansoor', 'fatima.m@rowvane.edu', 'CSE', 8, 9.91, 1, true, '2022-08-01'),
      
      ('24ECE010', 'Rohan Verma', 'rohan.verma@rowvane.edu', 'ECE', 4, 8.75, 4, true, '2024-08-01'),
      ('24ECE011', 'Ananya Deshmukh', 'ananya.d@rowvane.edu', 'ECE', 4, 9.05, 4, true, '2024-08-01'),
      ('23ECE050', 'Lucas Silva', 'lucas.silva@rowvane.edu', 'ECE', 6, 7.82, 6, true, '2023-08-01'),
      ('23ECE051', 'Maya Angelopoulos', 'maya.a@rowvane.edu', 'ECE', 6, 8.60, 6, true, '2023-08-01'),
      
      ('24MATH01', 'Sanya Iyer', 'sanya.iyer@rowvane.edu', 'MATH', 4, 9.78, 5, true, '2024-08-01'),
      ('24MATH02', 'Nikolai Ivanov', 'nikolai.i@rowvane.edu', 'MATH', 4, 8.94, 7, true, '2024-08-01'),
      ('23MATH15', 'Tariq Habib', 'tariq.h@rowvane.edu', 'MATH', 6, 9.40, 5, true, '2023-08-01'),
      ('22MATH09', 'Chloe Dubois', 'chloe.dubois@rowvane.edu', 'MATH', 8, 8.15, 7, true, '2022-08-01'),

      ('24BIO001', 'Amara Okafor', 'amara.okafor@rowvane.edu', 'BIO', 4, 9.25, 8, true, '2024-08-01'),
      ('24BIO002', 'Zackary Thorne', 'zack.thorne@rowvane.edu', 'BIO', 4, 6.70, 8, true, '2024-08-01'),
      ('23BIO030', 'Hana Tanaka (田中 花)', 'hana.tanaka@rowvane.edu', 'BIO', 6, 9.55, 8, true, '2023-08-01'),

      ('24ME001',  'Vikram Rao', 'vikram.rao@rowvane.edu', 'ME', 4, 7.40, 11, true, '2024-08-01'),
      ('24ME002',  'Hannah Schmidt', 'hannah.s@rowvane.edu', 'ME', 4, 8.88, 11, true, '2024-08-01'),
      ('23ME022',  'Dante Alighieri', 'dante.a@rowvane.edu', 'ME', 6, 6.20, 11, true, '2023-08-01'),
      
      ('24HUM001', 'Julian Assange', 'julian.a@rowvane.edu', 'HUM', 2, 7.10, 9, true, '2025-01-10'),
      ('24HUM002', 'Simone de Beauvoir', 'simone.b@rowvane.edu', 'HUM', 4, 9.70, 9, true, '2024-08-01'),
      ('23HUM018', 'Arthur Schopenhauer', 'arthur.s@rowvane.edu', 'HUM', 6, 8.30, 10, true, '2023-08-01'),

      -- Edge case: Students with no mentor faculty
      ('25CSE991', 'Newcomer Alex', 'alex.new@rowvane.edu', 'CSE', 1, 8.00, NULL, true, '2025-08-01'),
      ('25BIO992', 'Newcomer Beatrice', 'beatrice.new@rowvane.edu', 'BIO', 1, 7.50, NULL, true, '2025-08-01'),

      -- Edge case: Inactive / dropped-out students
      ('22ME999',  'Inactive John Doe', 'john.doe@rowvane.edu', 'ME', 3, 5.10, 11, false, '2022-08-01'),

      -- Edge case: Students with NO enrollments anywhere (ideal for LEFT JOIN testing)
      ('25GHOST1', 'Casper The Unenrolled', 'ghost1@rowvane.edu', 'CSE', 1, NULL, NULL, true, '2025-08-01'),
      ('25GHOST2', 'Phantom Scholar', 'ghost2@rowvane.edu', 'MATH', 1, NULL, 5, true, '2025-08-01');
  `);

  // 6. Insert Courses (Deep hierarchical dependency chain for recursive CTEs)
  await dbClient.query(`
    INSERT INTO courses (code, title, dept_code, credits, max_capacity, is_elective, academic_level) VALUES
      ('CS101', 'Introduction to Computing & Python', 'CSE', 4, 60, false, 'Undergraduate'),
      ('CS201', 'Data Structures & Algorithms', 'CSE', 4, 50, false, 'Undergraduate'),
      ('CS301', 'Design & Analysis of Algorithms', 'CSE', 4, 45, false, 'Undergraduate'),
      ('CS401', 'Distributed Systems & Cloud Architecture', 'CSE', 3, 35, true, 'Undergraduate'),
      ('CS501', 'Advanced Topics in Distributed Consensus', 'CSE', 4, 20, true, 'Postgraduate'),

      ('MATH101', 'Calculus & Linear Algebra', 'MATH', 4, 70, false, 'Undergraduate'),
      ('MATH201', 'Discrete Mathematics & Graph Theory', 'MATH', 4, 55, false, 'Undergraduate'),
      ('MATH301', 'Probability & Stochastic Processes', 'MATH', 3, 40, false, 'Undergraduate'),
      ('MATH401', 'Quantum Computing & Information Theory', 'MATH', 4, 25, true, 'Postgraduate'),

      ('EC101', 'Digital Logic & Circuit Theory', 'ECE', 4, 50, false, 'Undergraduate'),
      ('EC201', 'Signals, Systems & DSP', 'ECE', 4, 40, false, 'Undergraduate'),
      ('EC301', 'VLSI Design & Embedded Systems', 'ECE', 4, 30, true, 'Undergraduate'),

      ('BIO101', 'Molecular & Cellular Biology', 'BIO', 4, 45, false, 'Undergraduate'),
      ('BIO201', 'Genetics, Genomics & Bioinformatics', 'BIO', 4, 35, false, 'Undergraduate'),

      ('ME101', 'Engineering Mechanics & Thermodynamics', 'ME', 4, 55, false, 'Undergraduate'),
      ('ME201', 'Fluid Dynamics & Heat Transfer', 'ME', 4, 40, false, 'Undergraduate'),

      ('HUM101', 'Ethics in Technology & AI Governance', 'HUM', 3, 80, true, 'Undergraduate'),
      ('HUM201', 'Philosophy of Mind & Epistemology', 'HUM', 3, 40, true, 'Undergraduate'),

      -- Edge case: Empty course with zero enrollments
      ('CS999', 'Theoretical Quantum Teleportation', 'CSE', 4, 15, true, 'Doctoral');
  `);

  // 7. Insert Course Prerequisites (Directed Acyclic Graph DAG)
  // CS101 -> CS201 -> CS301 -> CS401 -> CS501
  // MATH101 -> MATH201 -> CS201
  // MATH301 -> MATH401
  // EC101 -> EC201 -> EC301
  // BIO101 -> BIO201
  // ME101 -> ME201
  await dbClient.query(`
    INSERT INTO course_prerequisites (course_id, prerequisite_id) VALUES
      (2, 1),  -- CS201 requires CS101
      (2, 7),  -- CS201 requires MATH201
      (3, 2),  -- CS301 requires CS201
      (4, 3),  -- CS401 requires CS301
      (5, 4),  -- CS501 requires CS401
      (7, 6),  -- MATH201 requires MATH101
      (9, 8),  -- MATH401 requires MATH301
      (9, 7),  -- MATH401 requires MATH201
      (11, 10), -- EC201 requires EC101
      (12, 11), -- EC301 requires EC201
      (14, 13), -- BIO201 requires BIO101
      (16, 15), -- ME201 requires ME101
      (18, 17); -- HUM201 requires HUM101
  `);

  // 8. Insert Course Offerings
  await dbClient.query(`
    INSERT INTO course_offerings (course_id, faculty_id, academic_year, term, classroom, schedule) VALUES
      (1, 1, '2024-2025', 'Fall', 'Turing 101', 'Mon/Wed 09:00-10:30'),
      (2, 2, '2024-2025', 'Spring', 'Turing 202', 'Tue/Thu 11:00-12:30'),
      (3, 2, '2025-2026', 'Fall', 'Turing 305', 'Mon/Wed 14:00-15:30'),
      (4, 3, '2025-2026', 'Fall', 'Cloud Lab A', 'Fri 10:00-13:00'),
      (5, 1, '2025-2026', 'Spring', 'Consensus Lab', 'Tue/Thu 16:00-17:30'),
      
      (6, 5, '2024-2025', 'Fall', 'Euler Auditorium', 'Mon/Wed/Fri 08:00-09:00'),
      (7, 7, '2024-2025', 'Spring', 'Euler 104', 'Tue/Thu 09:30-11:00'),
      (8, 7, '2025-2026', 'Fall', 'Euler 201', 'Mon/Wed 11:00-12:30'),
      (9, 5, '2025-2026', 'Spring', 'Quantum Suite', 'Wed/Fri 14:00-15:30'),

      (10, 4, '2024-2025', 'Fall', 'Shannon 101', 'Mon/Wed 10:00-11:30'),
      (11, 6, '2024-2025', 'Spring', 'Shannon DSP Lab', 'Tue/Thu 13:00-14:30'),

      (13, 8, '2024-2025', 'Fall', 'Franklin Lab 1', 'Mon/Wed 13:00-15:00'),
      (14, 8, '2025-2026', 'Fall', 'Genomics Suite', 'Tue/Thu 10:00-12:00'),

      (15, 11, '2024-2025', 'Fall', 'Tesla Workshop A', 'Tue/Thu 08:30-10:30'),
      (17, 9,  '2024-2025', 'Fall', 'Aristotle Main', 'Fri 14:00-17:00'),
      (18, 10, '2024-2025', 'Spring', 'Philosophy Hall', 'Mon/Wed 15:30-17:00');
  `);

  // 9. Insert Enrollments
  await dbClient.query(`
    INSERT INTO enrollments (student_id, offering_id, enrolled_at, status) VALUES
      -- CS101 (offering 1)
      (1, 1, '2024-08-10', 'Completed'),
      (2, 1, '2024-08-10', 'Completed'),
      (3, 1, '2024-08-11', 'Completed'),
      (4, 1, '2024-08-11', 'Completed'),
      (8, 1, '2024-08-12', 'Completed'),

      -- CS201 (offering 2)
      (1, 2, '2025-01-10', 'Completed'),
      (2, 2, '2025-01-10', 'Completed'),
      (3, 2, '2025-01-11', 'Completed'),
      (4, 2, '2025-01-11', 'Completed'),
      (12, 2, '2025-01-12', 'Completed'),

      -- CS301 (offering 3)
      (1, 3, '2025-08-15', 'Enrolled'),
      (2, 3, '2025-08-15', 'Enrolled'),
      (5, 3, '2025-08-16', 'Enrolled'),
      (6, 3, '2025-08-16', 'Enrolled'),

      -- CS401 (offering 4)
      (5, 4, '2025-08-20', 'Enrolled'),
      (7, 4, '2025-08-20', 'Enrolled'),

      -- MATH101 (offering 6)
      (1, 6, '2024-08-05', 'Completed'),
      (2, 6, '2024-08-05', 'Completed'),
      (8, 6, '2024-08-06', 'Completed'),
      (12, 6, '2024-08-06', 'Completed'),
      (13, 6, '2024-08-07', 'Completed'),
      (19, 6, '2024-08-07', 'Completed'),

      -- MATH201 (offering 7)
      (1, 7, '2025-01-08', 'Completed'),
      (12, 7, '2025-01-08', 'Completed'),
      (13, 7, '2025-01-09', 'Completed'),
      (14, 7, '2025-01-09', 'Completed'),

      -- BIO101 (offering 12)
      (16, 12, '2024-08-10', 'Completed'),
      (17, 12, '2024-08-10', 'Completed'),
      (18, 12, '2024-08-11', 'Completed'),

      -- ME101 (offering 14)
      (19, 14, '2024-08-12', 'Completed'),
      (20, 14, '2024-08-12', 'Completed'),
      (21, 14, '2024-08-13', 'Dropped'),

      -- Ethics HUM101 (offering 15)
      (1, 15, '2024-08-15', 'Completed'),
      (2, 15, '2024-08-15', 'Completed'),
      (5, 15, '2024-08-15', 'Completed'),
      (8, 15, '2024-08-16', 'Completed'),
      (12, 15, '2024-08-16', 'Completed'),
      (22, 15, '2024-08-17', 'Completed'),
      (23, 15, '2024-08-17', 'Completed');
  `);

  // 10. Insert Grades
  await dbClient.query(`
    INSERT INTO grades (enrollment_id, score, letter_grade, credits_earned, recorded_at) VALUES
      (1, 98.50, 'A+', 4, '2024-12-20'),
      (2, 99.00, 'A+', 4, '2024-12-20'),
      (3, 84.00, 'B+', 4, '2024-12-20'),
      (4, 91.50, 'A',  4, '2024-12-20'),
      (5, 87.00, 'B+', 4, '2024-12-20'),

      (6, 96.00, 'A+', 4, '2025-05-18'),
      (7, 98.00, 'A+', 4, '2025-05-18'),
      (8, 81.00, 'B',  4, '2025-05-18'),
      (9, 89.50, 'A',  4, '2025-05-18'),
      (10, 95.00, 'A+', 4, '2025-05-18'),

      (17, 95.00, 'A+', 4, '2024-12-22'),
      (18, 97.50, 'A+', 4, '2024-12-22'),
      (19, 88.00, 'A',  4, '2024-12-22'),
      (20, 99.50, 'A+', 4, '2024-12-22'),
      (21, 92.00, 'A',  4, '2024-12-22'),
      (22, 76.50, 'C+', 4, '2024-12-22'),

      (23, 97.00, 'A+', 4, '2025-05-20'),
      (24, 99.00, 'A+', 4, '2025-05-20'),
      (25, 89.00, 'A',  4, '2025-05-20'),
      (26, 94.00, 'A+', 4, '2025-05-20'),

      (27, 94.50, 'A+', 4, '2024-12-19'),
      (28, 68.00, 'D',  4, '2024-12-19'),
      (29, 96.00, 'A+', 4, '2024-12-19'),

      (30, 78.00, 'C+', 4, '2024-12-21'),
      (31, 89.50, 'A',  4, '2024-12-21'),

      (33, 98.00, 'A+', 3, '2024-12-23'),
      (34, 100.00, 'A+', 3, '2024-12-23'),
      (35, 91.00, 'A',  3, '2024-12-23'),
      (36, 88.50, 'A',  3, '2024-12-23'),
      (37, 96.50, 'A+', 3, '2024-12-23'),
      (38, 72.00, 'C',  3, '2024-12-23'),
      (39, 99.00, 'A+', 3, '2024-12-23');
  `);

  // 11. Insert Initial Audit Logs
  await dbClient.query(`
    INSERT INTO audit_logs (action, table_name, record_id, changed_by, recorded_at, details) VALUES
      ('SCHEMA_INIT', 'ALL', 'INITIAL', 'system_admin', CURRENT_TIMESTAMP, '{"event": "Showcase schema created", "version": "4.0.0"}'),
      ('SEED_POPULATED', 'departments', '6', 'seed_generator', CURRENT_TIMESTAMP, '{"departments_seeded": 6}'),
      ('SEED_POPULATED', 'faculty', '13', 'seed_generator', CURRENT_TIMESTAMP, '{"faculty_seeded": 13}'),
      ('SEED_POPULATED', 'students', '28', 'seed_generator', CURRENT_TIMESTAMP, '{"students_seeded": 28}'),
      ('SEED_POPULATED', 'courses', '19', 'seed_generator', CURRENT_TIMESTAMP, '{"courses_seeded": 19, "prerequisites": 13}');
  `);

  return {
    departments: 6,
    faculty: 13,
    students: 28,
    courses: 19,
    offerings: 16,
    enrollments: 39,
    grades: 31,
  };
}

module.exports = {
  seedShowcaseDatabase,
};
