// CSV serialization utility
function escapeCsvField(val) {
  if (val === null || val === undefined) {
    // Unquoted empty representation for SQL NULL
    return '';
  }
  if (val === '') {
    // Explicitly quoted empty string to distinguish from NULL
    return '""';
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (val instanceof Date) {
    return `"${val.toISOString()}"`;
  }
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes column definitions and rows into an RFC 4180 CSV string.
 * @param {Array<string|{name: string}>} columns - List of column names or column metadata objects
 * @param {Array<Object>} rows - Array of database row objects
 * @returns {string}
 */
function serializeToCsv(columns, rows) {
  const colNames = columns.map((c) =>
    typeof c === 'object' && c !== null ? c.name : String(c)
  );

  const headerLine = colNames.map(escapeCsvField).join(',');
  const lines = [headerLine];

  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row) continue;
      const rowLine = colNames.map((col) => escapeCsvField(row[col])).join(',');
      lines.push(rowLine);
    }
  }

  return lines.join('\r\n');
}

module.exports = {
  escapeCsvField,
  serializeToCsv,
};
