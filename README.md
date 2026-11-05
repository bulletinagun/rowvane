# Rowvane

> **Project Title:** SQL to Excel Drag n Drop  
> **Course:** 2nd Year B.Tech CSE — Database Management Systems (DBMS)

Rowvane is a web-based database workspace for PostgreSQL built with vanilla JavaScript, modern CSS, and Node.js/Express. It combines spreadsheet-style table viewing and inline editing with a multi-statement SQL query runner, schema structure explorer, and CSV import/export.

---

## Features

### 1. Spreadsheet Data Grid
- **Tabular Data Viewer:** Type-aware alignment for integers, decimals, booleans, timestamps, UUIDs, and text.
- **Inline Cell Editing:** Double-click or press <kbd>Enter</kbd> to edit cells directly in place.
- **SQL NULL Support:** Explicit toggle button and <kbd>Alt+N</kbd> keyboard shortcut to distinguish between empty strings `""` and database `NULL`.
- **Keyboard Navigation:** Navigate rows and columns using <kbd>Tab</kbd>, <kbd>Shift+Tab</kbd>, <kbd>Enter</kbd>, and <kbd>Esc</kbd>.
- **Row Operations:** Fast dialogs to add new rows (with auto-generated or manual primary keys) and safely delete rows.
- **Pagination & Sorting:** Server-side pagination paired with column header sorting (`ASC`/`DESC`).

### 2. SQL Query Editor & Multi-Tab Results
- **Multi-Statement Execution:** Run multiple SQL queries separated by semicolons in a single execution; each result appears in its own numbered tab.
- **Run Selected Text:** Select any portion of a query to run only that part, or run the entire editor if nothing is highlighted.
- **Query History:** Slide-out history drawer that records executed queries with execution times and one-click reload into the editor.
- **Execution Safety:** Configurable statement timeouts, automatic rollback of uncommitted transaction blocks, and interactive query cancellation via `pg_cancel_backend`.

### 3. Database Structure Explorer
- **Visual Schema Browser:** Inspect tables, column types, default values, nullability, primary keys, and table sizes.
- **Foreign Key Relationships:** Visual mapping of foreign key links with `ON DELETE` and `ON UPDATE` constraint rules.

### 4. CSV Import & Export
- **Drag-and-Drop Import:** Upload CSV files to create new tables automatically (with inferred column types) or append into existing tables with column mapping.
- **1-Click Export:** Download full tables or SQL query result sets directly as CSV files.

### 5. Demos, Chaos Mode & Sandbox Playground
- **Pre-loaded SQL Demos:** 15+ pre-written queries demonstrating Recursive CTEs, Window Functions, Multidimensional Aggregations (`CUBE`/`ROLLUP`), and Full-Text Search.
- **Chaos Mode & Concurrency Labs:** Safe sandbox to test cascading table drops, constraint violations, and row-level locking timeouts.
- **1-Click Reset:** Instantly restore the playground database back to its original clean state at any time.

### 6. Native PostgreSQL Backup & Restore
- Run native `pg_dump` and `psql` directly from the interface to download `.sql` schema/data dumps or restore from backup files.

---

## Tech Stack

- **Backend:** Node.js (v22+ LTS), Express 5
- **Database:** PostgreSQL (v14 through v18)
- **Driver:** `pg` (node-postgres) with connection pooling and query cancellation
- **CSV Parser:** `papaparse`
- **Frontend:** Semantic HTML5, CSS3 (CSS Variables, Flexbox/Grid), Vanilla ES6 JavaScript (Zero frontend build tools or bundlers)

---

## Getting Started

### Prerequisites

Make sure you have installed:
1. **Node.js** (v22.9.0 or higher recommended) — [Download Node.js](https://nodejs.org/)
2. **PostgreSQL** (v14 or higher) running locally, OR **Docker**
3. *(Optional)* PostgreSQL CLI tools (`psql`, `pg_dump`) if using the native backup/restore feature.

---

### Option A: Quickstart via Setup Scripts (Recommended)

#### On macOS / Linux:
```bash
git clone https://github.com/bulletinagun/rowvane.git
cd rowvane
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

#### On Windows (PowerShell):
```powershell
git clone https://github.com/bulletinagun/rowvane.git
cd rowvane
.\setup.ps1
.\start.ps1
```

*What the setup script does automatically:*
- Verifies Node.js and PostgreSQL versions.
- Copies `.env.example` to `.env` (if not already present).
- Installs npm dependencies.
- Seeds both the main `rowvane` database and the `rowvane_playground` database.
- Launches the application at `http://localhost:3000`.

---

### Option B: Manual Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bulletinagun/rowvane.git
   cd rowvane
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and verify your PostgreSQL credentials:
   ```ini
   PORT=3000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rowvane
   PLAYGROUND_DATABASE=rowvane_playground
   ```

4. **Create the databases (if not already created):**
   ```bash
   # In terminal or psql:
   createdb rowvane
   createdb rowvane_playground
   ```

5. **Seed sample data:**
   ```bash
   npm run seed            # Seeds primary rowvane database
   npm run seed:playground # Seeds the interactive playground database
   ```

6. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option C: Docker Compose

If you have Docker installed, you can spin up Rowvane alongside an isolated PostgreSQL container:

```bash
docker compose up -d
```
The app will be running at [http://localhost:3000](http://localhost:3000).

---

## Running Automated Tests

Run the full end-to-end verification test suite:

```bash
npm test
```

This executes 80 automated assertions verifying:
- Database connectivity and playground isolation
- Table browsing, sorting, and pagination
- Direct cell editing (INSERT, UPDATE, DELETE, and explicit NULLs)
- Multi-statement SQL query execution and cancellation
- CSV import, type detection, and table creation
- Concurrency locking and playground 1-click database reset

---

## Project Structure

```
rowvane/
├── index.js                     # Application entry point
├── package.json                 # Dependencies and npm scripts
├── docker-compose.yml           # Docker container configuration
├── setup.sh / setup.ps1         # Automated setup scripts
├── start.sh / start.ps1         # Application launch scripts
├── test_m4_verification.js      # Automated 80-assertion test suite
├── README.md                    # Project documentation & setup guide
├── public/                      # Static frontend assets (Zero-build)
│   ├── index.html               # Main application layout
│   ├── assets/
│   │   └── rowvane-mark.svg     # Rowvane vector branding & favicon
│   ├── css/
│   │   └── styles.css           # UI styles and themes
│   └── js/
│       ├── api.js               # Frontend API client
│       ├── app.js               # Main workspace coordinator
│       ├── backupRestore.js     # Native pg_dump/psql modal controller
│       ├── customization.js     # Theme, density, and layout settings
│       ├── editor.js            # SQL editor and split resizer
│       ├── explorer.js          # Table schema explorer & foreign key viewer
│       ├── grid.js              # Editable spreadsheet grid component
│       ├── importExport.js      # CSV import/export controller
│       ├── playground.js        # Playground demos & Chaos Mode controller
│       └── results.js           # Query results viewer
└── src/                         # Backend Express application
    ├── app.js                   # Express server setup & middleware
    ├── db/
    │   ├── index.js             # PostgreSQL connection pool manager
    │   ├── init.sql             # Primary database schema & seed
    │   ├── seed.js              # Primary database seeder
    │   ├── seedPlaygroundCli.js # Playground seeder CLI
    │   ├── seedShowcase.js      # University showcase data generator
    │   └── showcase_schema.sql  # Playground database schema
    ├── routes/
    │   ├── backupRestore.js     # Native pg_dump / psql endpoints
    │   ├── connections.js       # Custom PostgreSQL connection pool routes
    │   ├── explorer.js          # Schema and foreign key inspection endpoints
    │   ├── importExport.js      # CSV parsing, import, and SQL export routes
    │   ├── playground.js        # Playground catalog, chaos & reset routes
    │   ├── query.js             # SQL query execution & cancellation routes
    │   └── tables.js            # Table grid data, sorting, and editing routes
    └── utils/
        ├── csv.js               # CSV formatting utility
        ├── processRunner.js     # Safe subprocess runner for pg_dump/psql
        └── sqlSafety.js         # SQL identifier validation helper
```

---

## License

ISC License. Built for educational and academic submission purposes.
