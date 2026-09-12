class MockExternalRegistry {
  /**
   * Cross-check record against mock State LRMS (Land Records Management System)
   * @param {Object} record
   * @returns {Promise<{ status: 'MATCHED'|'DISCREPANCY'|'NOT_FOUND'|'UNAVAILABLE', checkedAt: Date, referenceId: string, details?: Object }>}
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
        details: { message: 'Area discrepancy reported with State LRMS live registry' },
      };
    } else if (num % 31 === 0) {
      return {
        status: 'NOT_FOUND',
        checkedAt: now,
        referenceId: `LRMS-NF-${num}`,
        details: { message: 'Survey number not found in legacy cadastral sheet' },
      };
    }

    return {
      status: 'MATCHED',
      checkedAt: now,
      referenceId: `LRMS-VERIFIED-${num}-${Date.now().toString().slice(-4)}`,
      details: { verifiedRegistry: 'State LRMS Portal', matchConfidence: 98.4 },
    };
  }

  /**
   * Cross-check record against mock DILRMP (Digital India Land Records Modernization Programme)
   * @param {Object} record
   * @returns {Promise<{ status: 'MATCHED'|'DISCREPANCY'|'NOT_FOUND'|'UNAVAILABLE', checkedAt: Date, referenceId: string, details?: Object }>}
   */
  static async checkDilrmp(record) {
    const num = parseInt(String(record.surveyNumber).replace(/[^0-9]/g, '') || '10', 10);
    const now = new Date();

    if (num % 23 === 0) {
      return {
        status: 'DISCREPANCY',
        checkedAt: now,
        referenceId: `DILRMP-FLAG-${num}`,
        details: { message: 'ULPIN (Unique Land Parcel Identification Number) mismatch' },
      };
    }

    return {
      status: 'MATCHED',
      checkedAt: now,
      referenceId: `DILRMP-ULPIN-${num.toString().padStart(6, '0')}`,
      details: { ulpinAssigned: true, cadastralMapped: true },
    };
  }
}

module.exports = MockExternalRegistry;
