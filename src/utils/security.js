/**
 * Security utilities for SQL operations
 */

// Whitelist of allowed table names
const ALLOWED_TABLES = [
  'users',
  'query_logs',
  'data_health',
  'sync_status',
  'backups',
  'analytics_events',
  'storage_metrics',
  'cache'
];

/**
 * Validate table name against whitelist
 * @param {string} tableName - Table name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidTableName(tableName) {
  return ALLOWED_TABLES.includes(tableName);
}

/**
 * Validate and sanitize table name
 * Throws error if invalid
 * @param {string} tableName - Table name to validate
 * @returns {string} - Validated table name
 */
function validateTableName(tableName) {
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('Invalid table name: must be a non-empty string');
  }

  if (!isValidTableName(tableName)) {
    throw new Error(`Invalid table name: ${tableName} is not in the whitelist`);
  }

  return tableName;
}

/**
 * Validate time range input
 * @param {string} timeRange - Time range to validate
 * @returns {number} - Hours corresponding to the time range
 */
function validateTimeRange(timeRange) {
  const validTimeRanges = {
    '1h': 1,
    '24h': 24,
    '7d': 168,
    '30d': 720
  };

  return validTimeRanges[timeRange] || 24;
}

module.exports = {
  ALLOWED_TABLES,
  isValidTableName,
  validateTableName,
  validateTimeRange,
};
