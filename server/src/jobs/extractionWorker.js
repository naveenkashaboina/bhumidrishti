const Document = require('../models/Document');
const LandRecord = require('../models/LandRecord');
const VerificationTask = require('../models/VerificationTask');
const SystemConfig = require('../models/SystemConfig');
const StorageService = require('../services/storageService');
const ValidationEngine = require('../services/validationEngine');
const DuplicateDetectionService = require('../services/duplicateDetectionService');
const TesseractAdapter = require('../adapters/ocr/tesseractAdapter');
const RuleBasedNlpClassifier = require('../adapters/nlpClassifier/ruleBasedNlpClassifier');
const MockExternalRegistry = require('../adapters/externalRegistry/mockExternalRegistry');
const LiveExternalRegistry = require('../adapters/externalRegistry/liveExternalRegistry');
const AuditService = require('../services/auditService');
const logger = require('../utils/logger');
const { DOCUMENT_STATUS, RECORD_STATUS, TASK_PRIORITY } = require('../config/constants');
const env = require('../config/env');
const { approximateGeoFromDistrict } = require('../config/districtCentroids');

const ocrAdapter = new TesseractAdapter();

// Select external registry adapter based on environment configuration.
// Default is 'mock' — switch to 'live' only when real LRMS/DILRMP APIs are configured.
const ExternalRegistry = env.EXTERNAL_REGISTRY_MODE === 'live'
  ? LiveExternalRegistry
  : MockExternalRegistry;

class ExtractionWorker {
  /**
   * Process a single document through the end-to-end extraction pipeline
   * @param {string} documentId
   * @returns {Promise<Object>} Processed LandRecord document
   */
  static async processDocument(documentId) {
    logger.info(`ExtractionWorker: Starting processing for Document ${documentId}`);

    const doc = await Document.findById(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    doc.status = DOCUMENT_STATUS.PROCESSING;
    await doc.save();

    try {
      // Step 1: Fetch stored file buffer
      const { buffer } = await StorageService.getFile(doc.storageKey);

      // Step 2: OCR Text Extraction
      let rawText = '';
      let ocrConfidence = 85;

      // If text or json, read directly, otherwise run Tesseract
      if (doc.mimeType.startsWith('text/') || doc.mimeType.includes('json')) {
        rawText = buffer.toString('utf-8');
        ocrConfidence = 95;
      } else {
        const ocrResult = await ocrAdapter.extractText(buffer, doc.languageHint);
        rawText = ocrResult.text;
        ocrConfidence = ocrResult.confidence || 75;
      }

      // If OCR yielded insufficient text, mark the document as OCR_FAILED and
      // do NOT create a LandRecord. This replaces the previous fallback that
      // fabricated fake Hindi land record data.
      if (!rawText || rawText.trim().length < 5) {
        logger.warn(`Document ${documentId} yielded insufficient OCR text (${(rawText || '').trim().length} chars) — marking as OCR_FAILED`);
        doc.status = DOCUMENT_STATUS.OCR_FAILED;
        doc.processingError = 'OCR yielded insufficient text — document may be illegible or corrupted. ' +
          'Please re-upload a clearer scan or manually enter the record data.';
        await doc.save();
        return null;
      }

      // Step 3: NLP Field Classification
      const classification = RuleBasedNlpClassifier.classify(rawText, {
        state: doc.sourceOffice.state,
        district: doc.sourceOffice.district,
        tehsil: doc.sourceOffice.tehsil,
        village: doc.sourceOffice.village,
      });

      const structured = classification.structuredData;
      const confidence = classification.confidence;
      const flaggedFields = [...classification.flaggedFields];

      // Blend OCR confidence into overall confidence
      // Formula: overall = (NLP confidence × 0.7) + (OCR confidence × 0.3)
      // Rationale: NLP field extraction quality is more indicative of record
      // accuracy than raw OCR confidence, but OCR quality still matters.
      confidence.overall = Math.round((confidence.overall * 0.7) + (ocrConfidence * 0.3));

      // Step 4: Business Rules Validation Engine
      const validationResult = ValidationEngine.validate(structured);
      if (!validationResult.isValid) {
        validationResult.errors.forEach((err) => {
          flaggedFields.push(`validation_error: ${err}`);
        });
      }

      // Step 5: Duplicate Detection Check
      const duplicateResult = await DuplicateDetectionService.checkDuplicates(structured);
      let duplicateOfId = null;
      if (duplicateResult.isDuplicate) {
        duplicateOfId = duplicateResult.duplicateOf?._id || null;
        flaggedFields.push(`duplicate: ${duplicateResult.message}`);
      }

      // Step 6: Cross-Database Verification (LRMS & DILRMP)
      // When using MockExternalRegistry, responses include simulated: true
      // so API consumers can distinguish simulated from live results.
      const lrmsCheck = await ExternalRegistry.checkLrms(structured);
      const dilrmpCheck = await ExternalRegistry.checkDilrmp(structured);

      if (lrmsCheck.status === 'DISCREPANCY') {
        flaggedFields.push('crosscheck_discrepancy: State LRMS registry mismatch');
      }

      // Step 7: Dynamic Thresholds & Routing Decision
      const confConfig = await SystemConfig.findOne({ key: 'confidenceThresholdOverall' }).lean();
      const thresholdOverall = confConfig?.value || env.CONFIDENCE_THRESHOLD_OVERALL;

      let status = RECORD_STATUS.EXTRACTED;
      const hasCriticalFlags = flaggedFields.length > 0 || confidence.overall < thresholdOverall;

      if (hasCriticalFlags) {
        status = RECORD_STATUS.NEEDS_VERIFICATION;
      } else {
        status = RECORD_STATUS.PENDING_APPROVAL;
      }

      // Step 8: Persist LandRecord
      // Generate a deterministic approximate polygon from the district centroid.
      // This is labeled as geoSource: 'approximate' so consumers can tell it's
      // not a real surveyed boundary. If the district isn't in our centroid table,
      // geo is set to null with geoSource: 'none'.
      const district = structured.location?.district || doc.sourceOffice.district;
      const surveyNum = structured.surveyNumber || '';
      const { geo: approxGeo, geoSource } = approximateGeoFromDistrict(district, surveyNum);

      const landRecord = await LandRecord.create({
        documentId: doc._id,
        landownerDetails: structured.landownerDetails,
        surveyNumber: structured.surveyNumber || `SV-${Date.now().toString().slice(-4)}`,
        khasraNumber: structured.khasraNumber,
        khataNumber: structured.khataNumber,
        plotArea: structured.plotArea,
        location: {
          ...structured.location,
          geo: approxGeo,
          geoSource,
        },
        landClassification: structured.landClassification,
        ownershipDetails: structured.ownershipDetails,
        mutationRecords: structured.mutationRecords,
        registrationInfo: structured.registrationInfo,
        status,
        confidence,
        flaggedFields,
        duplicateOf: duplicateOfId,
        crossCheck: {
          lrms: lrmsCheck,
          dilrmp: dilrmpCheck,
        },
        rawExtractedText: rawText,
      });

      // Step 9: Auto-create VerificationTask if needed
      if (status === RECORD_STATUS.NEEDS_VERIFICATION) {
        let priority = TASK_PRIORITY.MEDIUM;
        if (duplicateResult.isDuplicate || confidence.overall < 50) {
          priority = TASK_PRIORITY.HIGH;
        }

        await VerificationTask.create({
          landRecordId: landRecord._id,
          priority,
          status: 'OPEN',
          notes: flaggedFields.join('; '),
        });
      }

      // Mark Document as PROCESSED
      doc.status = DOCUMENT_STATUS.PROCESSED;
      await doc.save();

      // Step 10: Immutable Audit Log
      await AuditService.log({
        entityType: 'landRecord',
        entityId: landRecord._id,
        action: 'CREATE',
        performedBy: doc.uploadedBy,
        diff: { status, confidenceOverall: confidence.overall, flaggedFieldsCount: flaggedFields.length },
      });

      logger.info(`ExtractionWorker: Document ${documentId} successfully processed -> LandRecord ${landRecord._id} (Status: ${status}, Confidence: ${confidence.overall}%)`);
      return landRecord;
    } catch (error) {
      logger.error(`ExtractionWorker failed for Document ${documentId}: %s`, error.message);
      doc.status = DOCUMENT_STATUS.FAILED;
      doc.processingError = error.message;
      await doc.save();
      throw error;
    }
  }
}

module.exports = ExtractionWorker;
