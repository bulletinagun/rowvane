-- Rowvane Minimal Reproducible Seed Data
-- Creates sample tables for testing the workspace, grid, and SQL queries.

BEGIN;

CREATE TABLE IF NOT EXISTS departments (
  dept_id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  building VARCHAR(60) NOT NULL,
  budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS students (
  student_id SERIAL PRIMARY KEY,
  roll_no VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  dept_code VARCHAR(10) NOT NULL REFERENCES departments(code) ON UPDATE CASCADE,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  cgpa NUMERIC(4, 2) CHECK (cgpa BETWEEN 0.00 AND 10.00),
  active BOOLEAN NOT NULL DEFAULT true,
  enrolled_on DATE NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO departments (code, name, building, budget)
VALUES
  ('CSE', 'Computer Science & Engineering', 'Turing Block', 1450000.00),
  ('ECE', 'Electronics & Communication', 'Shannon Hall', 980000.00),
  ('ME',  'Mechanical Engineering', 'Tesla Workshop', 820000.00),
  ('MATH', 'Mathematics & Computing', 'Euler Wing', 640000.00)
ON CONFLICT (code) DO NOTHING;

INSERT INTO students (roll_no, full_name, dept_code, semester, cgpa, active, enrolled_on)
VALUES
  ('24CSE101', 'Aarav Mehta', 'CSE', 4, 9.14, true, '2024-08-01'),
  ('24CSE102', 'Diya Nair', 'CSE', 4, 9.48, true, '2024-08-01'),
  ('24ECE201', 'Rohan Verma', 'ECE', 4, 8.62, true, '2024-08-01'),
  ('24MATH301', 'Sanya Iyer', 'MATH', 4, 9.31, true, '2024-08-02'),
  ('23CSE044', 'Kabir Sharma', 'CSE', 6, 8.85, true, '2023-08-01'),
  ('23ME112', 'Vikram Rao', 'ME', 6, 7.95, false, '2023-08-01')
ON CONFLICT (roll_no) DO NOTHING;

COMMIT;
