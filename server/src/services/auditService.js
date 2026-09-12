const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Log an immutable audit action
   * @param {Object} params
   * @param {string} params.entityType - 'document' | 'landRecord' | 'user' | 'systemConfig' | 'apiClient' | 'verificationTask'
   * @param {string|ObjectId} params.entityId
   * @param {string} params.action - CREATE | UPDATE | STATUS_CHANGE | etc.
   * @param {string|ObjectId} [params.performedBy] - User ID, or null for system
   * @param {Object} [params.diff] - Snapshot of changes { before, after }
   * @param {string} [params.ipAddress]
   */
  static async log({
    entityType,
    entityId,
    action,
    performedBy = null,
    diff = null,
    ipAddress = '127.0.0.1',
  }) {
    try {
      const entry = await AuditLog.create({
        entityType,
        entityId,
        action,
        performedBy,
        diff,
        ipAddress,
        timestamp: new Date(),
      });
      return entry;
    } catch (err) {
      logger.error('Failed to create audit log: %s', err.message);
      // Non-blocking in case of audit failure, but logged
      return null;
    }
  }

  /**
   * Compute a simple field-level diff between two objects
   */
  static computeDiff(before = {}, after = {}) {
    const diff = { before: {}, after: {} };
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

    for (const key of allKeys) {
      if (key === '_id' || key === 'updatedAt' || key === 'createdAt' || key === '__v') continue;
      const bVal = JSON.stringify(before?.[key]);
      const aVal = JSON.stringify(after?.[key]);
      if (bVal !== aVal) {
        diff.before[key] = before?.[key];
        diff.after[key] = after?.[key];
      }
    }
    return Object.keys(diff.before).length > 0 ? diff : null;
  }
}

module.exports = AuditService;
