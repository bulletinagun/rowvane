const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

/**
 * Validate that a SQL identifier (table or column name) is safe and standard.
 * @param {string} name
 * @returns {boolean}
 */
function isValidIdentifier(name) {
  return typeof name === 'string' && IDENTIFIER_REGEX.test(name);
}

/**
 * Safely double-quote a validated PostgreSQL identifier.
 * Throws if the identifier fails validation.
 * @param {string} name
 * @returns {string}
 */
function quoteIdentifier(name) {
  if (!isValidIdentifier(name)) {
    const err = new Error(`Invalid SQL identifier: "${name}"`);
    err.status = 400;
    throw err;
  }
  return `"${name.replace(/"/g, '""')}"`;
}

module.exports = {
  IDENTIFIER_REGEX,
  isValidIdentifier,
  quoteIdentifier,
};
