-- Rowvane Showcase University Database Schema
-- Designed for PostgreSQL 14+
-- Demonstrates sound relational modeling, primary/foreign/composite keys,
-- check constraints, referential cascades, indexes, and directed acyclic graphs (prerequisites).

BEGIN;

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
  dept_id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  building VARCHAR(60) NOT NULL,
  budget NUMERIC(14, 2) NOT NULL DEFAULT 500000.00 CHECK (budget >= 0),
  established_year INTEGER NOT NULL CHECK (established_year BETWEEN 1800 AND 2100)
);

-- 2. Faculty
CREATE TABLE IF NOT EXISTS faculty (
  faculty_id SERIAL PRIMARY KEY,
  employee_no VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  dept_code VARCHAR(10) NOT NULL REFERENCES departments(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  designation VARCHAR(50) NOT NULL CHECK (designation IN ('Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Adjunct Professor')),
  hire_date DATE NOT NULL,
  salary NUMERIC(10, 2) NOT NULL CHECK (salary > 0),
  active BOOLEAN NOT NULL DEFAULT true
);

-- 3. Students
CREATE TABLE IF NOT EXISTS students (
  student_id SERIAL PRIMARY KEY,
  roll_no VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  dept_code VARCHAR(10) NOT NULL REFERENCES departments(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  cgpa NUMERIC(4, 2) CHECK (cgpa BETWEEN 0.00 AND 10.00),
  mentor_faculty_id INTEGER REFERENCES faculty(faculty_id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  enrolled_on DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 4. Courses
CREATE TABLE IF NOT EXISTS courses (
  course_id SERIAL PRIMARY KEY,
  code VARCHAR(15) UNIQUE NOT NULL,
  title VARCHAR(120) NOT NULL,
  dept_code VARCHAR(10) NOT NULL REFERENCES departments(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  credits INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 6),
  max_capacity INTEGER NOT NULL DEFAULT 40 CHECK (max_capacity > 0),
  is_elective BOOLEAN NOT NULL DEFAULT false,
  academic_level VARCHAR(20) NOT NULL DEFAULT 'Undergraduate' CHECK (academic_level IN ('Undergraduate', 'Postgraduate', 'Doctoral'))
);

-- 5. Course Prerequisites (Junction for Recursive DAG queries)
CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  prerequisite_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, prerequisite_id),
  CHECK (course_id <> prerequisite_id)
);

-- 6. Course Offerings (Facilitates faculty teaching assignments per term)
CREATE TABLE IF NOT EXISTS course_offerings (
  offering_id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  faculty_id INTEGER REFERENCES faculty(faculty_id) ON DELETE SET NULL,
  academic_year VARCHAR(9) NOT NULL, -- e.g. '2025-2026'
  term VARCHAR(10) NOT NULL CHECK (term IN ('Fall', 'Spring', 'Summer')),
  classroom VARCHAR(40),
  schedule VARCHAR(50),
  UNIQUE (course_id, academic_year, term)
);

-- 7. Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  offering_id INTEGER NOT NULL REFERENCES course_offerings(offering_id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'Enrolled' CHECK (status IN ('Enrolled', 'Completed', 'Dropped', 'Waitlisted')),
  UNIQUE (student_id, offering_id)
);

-- 8. Grades
CREATE TABLE IF NOT EXISTS grades (
  grade_id SERIAL PRIMARY KEY,
  enrollment_id INTEGER UNIQUE NOT NULL REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
  score NUMERIC(5, 2) CHECK (score BETWEEN 0.00 AND 100.00),
  letter_grade VARCHAR(2) CHECK (letter_grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F')),
  credits_earned INTEGER CHECK (credits_earned >= 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Logs (Used for DDL/DML trigger and audit demonstrations)
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id SERIAL PRIMARY KEY,
  action VARCHAR(20) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id VARCHAR(50),
  changed_by VARCHAR(50) NOT NULL DEFAULT CURRENT_USER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSONB
);

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_students_dept ON students(dept_code);
CREATE INDEX IF NOT EXISTS idx_students_cgpa ON students(cgpa DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(dept_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_offering ON enrollments(offering_id);
CREATE INDEX IF NOT EXISTS idx_grades_score ON grades(score);

COMMIT;
