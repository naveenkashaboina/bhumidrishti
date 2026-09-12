const {
  LAND_CLASSIFICATIONS,
  AREA_UNITS,
  OWNERSHIP_TYPES,
} = require('../config/constants');

class ValidationEngine {
  /**
   * Validate a land record candidate according to revenue business rules
   * @param {Object} record - candidate structured land record
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  static validate(record) {
    const errors = [];
    const warnings = [];

    // 1. Mandatory Core Identifiers
    if (!record.surveyNumber || String(record.surveyNumber).trim() === '') {
      errors.push('Mandatory field "surveyNumber" is missing or empty');
    }

    if (!record.location || typeof record.location !== 'object') {
      errors.push('Mandatory "location" block is missing');
    } else {
      if (!record.location.state || String(record.location.state).trim() === '') {
        errors.push('Mandatory field "location.state" is missing');
      }
      if (!record.location.district || String(record.location.district).trim() === '') {
        errors.push('Mandatory field "location.district" is missing');
      }
      if (!record.location.tehsil || String(record.location.tehsil).trim() === '') {
        errors.push('Mandatory field "location.tehsil" is missing');
      }
      if (!record.location.village || String(record.location.village).trim() === '') {
        errors.push('Mandatory field "location.village" is missing');
      }
    }

    // 2. Landowner Details
    if (
      !record.landownerDetails ||
      !Array.isArray(record.landownerDetails) ||
      record.landownerDetails.length === 0
    ) {
      errors.push('At least one landowner entry in "landownerDetails" is mandatory');
    } else {
      record.landownerDetails.forEach((owner, idx) => {
        if (!owner.name || String(owner.name).trim().length < 2) {
          errors.push(`Landowner at index ${idx} has an invalid or missing name`);
        }
      });
    }

    // 3. Plot Area Validation
    if (!record.plotArea || typeof record.plotArea !== 'object') {
      errors.push('Mandatory "plotArea" is missing');
    } else {
      const areaVal = Number(record.plotArea.value);
      if (isNaN(areaVal) || areaVal <= 0) {
        errors.push('Plot area value must be a strictly positive number (> 0)');
      }
      if (!record.plotArea.unit || !AREA_UNITS.includes(record.plotArea.unit)) {
        errors.push(
          `Plot area unit "${record.plotArea.unit}" is invalid. Allowed units: ${AREA_UNITS.join(', ')}`
        );
      }
      // Heuristic warning for unusually large plot
      if (record.plotArea.unit === 'acres' && areaVal > 1000) {
        warnings.push(`Plot area of ${areaVal} acres is unusually large; requires senior review`);
      }
    }

    // 4. Land Classification Enum
    if (
      record.landClassification &&
      !LAND_CLASSIFICATIONS.includes(record.landClassification)
    ) {
      errors.push(
        `Land classification "${record.landClassification}" is invalid. Allowed classifications: ${LAND_CLASSIFICATIONS.join(', ')}`
      );
    }

    // 5. Ownership Type
    if (
      record.ownershipDetails?.type &&
      !OWNERSHIP_TYPES.includes(record.ownershipDetails.type)
    ) {
      errors.push(
        `Ownership type "${record.ownershipDetails.type}" is invalid. Allowed types: ${OWNERSHIP_TYPES.join(', ')}`
      );
    }

    // 6. Warnings on optional but recommended identifiers
    if (!record.khasraNumber || String(record.khasraNumber).trim() === '') {
      warnings.push('Khasra number is not specified in the extracted record');
    }
    if (!record.khataNumber || String(record.khataNumber).trim() === '') {
      warnings.push('Khata/Khatauni number is not specified in the extracted record');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

module.exports = ValidationEngine;
