const ExternalRegistryInterface = require('./externalRegistryInterface');

/**
 * ============================================================================
 * SIMULATION NOTICE — MockExternalRegistry
 * ============================================================================
 *
 * This adapter provides DETERMINISTIC SIMULATED cross-checks against:
 *   - State LRMS (Land Records Management System)
 *   - Central DILRMP (Digital India Land Records Modernization Programme)
 *
 * NO LIVE API CALLS are made. Results are generated deterministically based on
 * the numeric portion of the record's survey number, so the same record always
 * produces the same cross-check result. This allows reproducible demos and tests.
 *
 * Every response includes `simulated: true` so API consumers (including the
 * frontend and judges' demo) can clearly distinguish simulated results from
 * real registry lookups.
 *
 * To switch to real registry integration when available, set:
 *   EXTERNAL_REGISTRY_MODE=live
 * in your environment. See liveExternalRegistry.js for the stub.
 * ============================================================================
 */

class MockExternalRegistry extends ExternalRegistryInterface {
  /**
   * Cross-check record against mock State LRMS (Land Records Management System)
   * @param {Object} record
   * @returns {Promise<{ status: 'MATCHED'|'DISCREPANCY'|'NOT_FOUND'|'UNAVAILABLE', checkedAt: Date, referenceId: string, simulated: boolean, details?: Object }>}
   */
  static async checkLrms(record) {
    // Deterministic simulation based on survey number
    const num = parseInt(String(record.surveyNumber).replace(/[^0-9]/g, '') || '10', 10);
    const now = new Date();

    if (num % 17 === 0) {
      // 1 in 17 simulated discrepancy
      return {
        status: 'DISCREPANCY',
        checkedAt: now,
        referenceId: `LRMS-DISC-${num}`,
        simulated: true,
        details: { message: 'Area discrepancy reported with State LRMS (simulated check)' },
      };
    } else if (num % 31 === 0) {
      return {
        status: 'NOT_FOUND',
        checkedAt: now,
        referenceId: `LRMS-NF-${num}`,
        simulated: true,
        details: { message: 'Survey number not found in legacy cadastral sheet (simulated check)' },
      };
    }

    return {
      status: 'MATCHED',
      checkedAt: now,
      referenceId: `LRMS-VERIFIED-${num}-${Date.now().toString().slice(-4)}`,
      simulated: true,
      details: { verifiedRegistry: 'State LRMS Portal (simulated)', matchConfidence: 98.4 },
    };
  }

  /**
   * Cross-check record against mock DILRMP (Digital India Land Records Modernization Programme)
   * @param {Object} record
   * @returns {Promise<{ status: 'MATCHED'|'DISCREPANCY'|'NOT_FOUND'|'UNAVAILABLE', checkedAt: Date, referenceId: string, simulated: boolean, details?: Object }>}
   */
  static async checkDilrmp(record) {
    const num = parseInt(String(record.surveyNumber).replace(/[^0-9]/g, '') || '10', 10);
    const now = new Date();

    if (num % 23 === 0) {
      return {
        status: 'DISCREPANCY',
        checkedAt: now,
        referenceId: `DILRMP-FLAG-${num}`,
        simulated: true,
        details: { message: 'ULPIN (Unique Land Parcel Identification Number) mismatch (simulated check)' },
      };
    }

    return {
      status: 'MATCHED',
      checkedAt: now,
      referenceId: `DILRMP-ULPIN-${num.toString().padStart(6, '0')}`,
      simulated: true,
      details: { ulpinAssigned: true, cadastralMapped: true },
    };
  }
}

module.exports = MockExternalRegistry;
