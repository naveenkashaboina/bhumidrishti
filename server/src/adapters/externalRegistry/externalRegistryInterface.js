/**
 * Base External Registry Adapter Interface
 *
 * Defines the contract for cross-checking land records against external
 * government registries (LRMS, DILRMP). Implementations must override
 * both static methods.
 */
class ExternalRegistryInterface {
  /**
   * Cross-check record against State LRMS (Land Records Management System)
   * @param {Object} record - Structured land record data
   * @returns {Promise<{ status: 'MATCHED'|'DISCREPANCY'|'NOT_FOUND'|'UNAVAILABLE', checkedAt: Date, referenceId: string, simulated: boolean, details?: Object }>}
   */
  static async checkLrms(record) {
    throw new Error('checkLrms method must be implemented by subclass');
  }

  /**
   * Cross-check record against DILRMP (Digital India Land Records Modernization Programme)
   * @param {Object} record - Structured land record data
   * @returns {Promise<{ status: 'MATCHED'|'DISCREPANCY'|'NOT_FOUND'|'UNAVAILABLE', checkedAt: Date, referenceId: string, simulated: boolean, details?: Object }>}
   */
  static async checkDilrmp(record) {
    throw new Error('checkDilrmp method must be implemented by subclass');
  }
}

module.exports = ExternalRegistryInterface;
