// Database schema explorer routes
const express = require('express');
const db = require('../db');
const { isValidIdentifier } = require('../utils/sqlSafety');

const router = express.Router();

function getTarget(req) {
  return req.query?.target || req.headers['x-rowvane-target'] || 'default';
}

/**
 * GET /api/explorer/schema
 * Returns complete database structure for the connected database:
 * tables, views, columns, foreign keys, indexes, and relationship topology.
 */
router.get('/schema', async (req, res, next) => {
  try {
    const target = getTarget(req);
    const pool = db.getPool(target);

    // 1. Fetch all user tables and views
    const tablesQuery = await pool.query(`
      SELECT
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_type ASC, table_name ASC;
    `);

    // 2. Fetch all column definitions
    const columnsQuery = await pool.query(`
      SELECT
        table_name,
        column_name,
        ordinal_position,
        column_default,
        is_nullable,
        data_type,
        udt_name,
        character_maximum_length,
        numeric_precision
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    // 3. Fetch Primary Keys (supporting composite keys)
    const pkQuery = await pool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `);

    // 4. Fetch Foreign Keys with referential action rules
    const fkQuery = await pool.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
       AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    // 5. Fetch Check & Unique Constraints
    const constraintsQuery = await pool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
       AND tc.table_schema = cc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('CHECK', 'UNIQUE')
        AND tc.constraint_name NOT LIKE '%_not_null'
      ORDER BY tc.table_name, tc.constraint_name;
    `);

    // 6. Fetch Indexes from pg_catalog
    const indexesQuery = await pool.query(`
      SELECT
        tablename AS table_name,
        indexname AS index_name,
        indexdef AS index_definition
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    // Grouping metadata
    const columnsByTable = new Map();
    columnsQuery.rows.forEach((c) => {
      if (!columnsByTable.has(c.table_name)) columnsByTable.set(c.table_name, []);
      columnsByTable.get(c.table_name).push({
        name: c.column_name,
        position: c.ordinal_position,
        dataType: c.data_type,
        udtName: c.udt_name,
        nullable: c.is_nullable === 'YES',
        defaultValue: c.column_default,
        maxLength: c.character_maximum_length,
        precision: c.numeric_precision,
      });
    });

    const pksByTable = new Map();
    pkQuery.rows.forEach((pk) => {
      if (!pksByTable.has(pk.table_name)) pksByTable.set(pk.table_name, []);
      pksByTable.get(pk.table_name).push(pk.column_name);
    });

    const fksByTable = new Map();
    const relationships = [];
    fkQuery.rows.forEach((fk) => {
      if (!fksByTable.has(fk.from_table)) fksByTable.set(fk.from_table, []);
      const fkObj = {
        name: fk.constraint_name,
        fromColumn: fk.from_column,
        toTable: fk.to_table,
        toColumn: fk.to_column,
        onUpdate: fk.update_rule,
        onDelete: fk.delete_rule,
      };
      fksByTable.get(fk.from_table).push(fkObj);
      relationships.push({
        fromTable: fk.from_table,
        fromColumn: fk.from_column,
        toTable: fk.to_table,
        toColumn: fk.to_column,
        constraintName: fk.constraint_name,
        onDelete: fk.delete_rule,
      });
    });

    const constraintsByTable = new Map();
    constraintsQuery.rows.forEach((cn) => {
      if (!constraintsByTable.has(cn.table_name))
        constraintsByTable.set(cn.table_name, []);
      constraintsByTable.get(cn.table_name).push({
        name: cn.constraint_name,
        type: cn.constraint_type,
        clause: cn.check_clause,
      });
    });

    const indexesByTable = new Map();
    indexesQuery.rows.forEach((idx) => {
      if (!indexesByTable.has(idx.table_name))
        indexesByTable.set(idx.table_name, []);
      indexesByTable.get(idx.table_name).push({
        name: idx.index_name,
        definition: idx.index_definition,
      });
    });

    // Construct table objects
    const tables = tablesQuery.rows.map((t) => {
      const primaryKeys = pksByTable.get(t.table_name) || [];
      const columns = (columnsByTable.get(t.table_name) || []).map((col) => ({
        ...col,
        isPrimaryKey: primaryKeys.includes(col.name),
      }));

      return {
        name: t.table_name,
        type: t.table_type === 'VIEW' ? 'VIEW' : 'TABLE',
        columns,
        primaryKeys,
        foreignKeys: fksByTable.get(t.table_name) || [],
        constraints: constraintsByTable.get(t.table_name) || [],
        indexes: indexesByTable.get(t.table_name) || [],
      };
    });

    res.json({
      database: db.resolveDbName(target),
      target,
      tables,
      relationships,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
