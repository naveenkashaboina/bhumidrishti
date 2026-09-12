const { z } = require('zod');
const LandRecord = require('../models/LandRecord');
const Feedback = require('../models/Feedback');
const AuditLog = require('../models/AuditLog');
const VerificationTask = require('../models/VerificationTask');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');
const DuplicateDetectionService = require('../services/duplicateDetectionService');
const { RECORD_STATUS, AUDIT_ACTIONS } = require('../config/constants');

const updateRecordSchema = z.object({
  version: z.number({ required_error: 'Version number is required for optimistic concurrency control' }),
  landownerDetails: z
    .array(
      z.object({
        name: z.string().min(1),
        guardianName: z.string().optional(),
        share: z.string().optional(),
      })
    )
    .optional(),
  surveyNumber: z.string().optional(),
  khasraNumber: z.string().optional(),
  khataNumber: z.string().optional(),
  plotArea: z
    .object({
      value: z.number().positive(),
      unit: z.string(),
    })
    .optional(),
  location: z
    .object({
      state: z.string().optional(),
      district: z.string().optional(),
      tehsil: z.string().optional(),
      village: z.string().optional(),
      geo: z.any().optional(),
    })
    .optional(),
  landClassification: z.string().optional(),
  ownershipDetails: z
    .object({
      type: z.string().optional(),
      remarks: z.string().optional(),
    })
    .optional(),
  status: z.string().optional(),
});

class RecordController {
  static async getRecords(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      const filter = { ...(req.jurisdictionFilter || {}) };

      if (req.query.status) filter.status = req.query.status;
      if (req.query.district) filter['location.district'] = new RegExp(`^${req.query.district}$`, 'i');
      if (req.query.tehsil) filter['location.tehsil'] = new RegExp(`^${req.query.tehsil}$`, 'i');
      if (req.query.village) filter['location.village'] = new RegExp(`^${req.query.village}$`, 'i');
      if (req.query.surveyNumber) filter.surveyNumber = new RegExp(req.query.surveyNumber, 'i');
      if (req.query.ownerName) filter['landownerDetails.name'] = new RegExp(req.query.ownerName, 'i');
      if (req.query.confidenceMin) filter['confidence.overall'] = { $gte: Number(req.query.confidenceMin) };

      const [records, total] = await Promise.all([
        LandRecord.find(filter)
          .populate('documentId', 'originalFileName storageUrl status createdAt')
          .populate('verifiedBy', 'name email role')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        LandRecord.countDocuments(filter),
      ]);

      return ApiResponse.success(res, records, 'Land records retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRecordById(req, res, next) {
    try {
      const record = await LandRecord.findById(req.params.id)
        .populate('documentId')
        .populate('verifiedBy', 'name email role')
        .populate('duplicateOf', 'surveyNumber location landownerDetails status');

      if (!record) return ApiResponse.notFound(res, 'Land record not found');
      return ApiResponse.success(res, record, 'Land record details');
    } catch (err) {
      next(err);
    }
  }

  static async updateRecord(req, res, next) {
    try {
      const record = await LandRecord.findById(req.params.id);
      if (!record) return ApiResponse.notFound(res, 'Land record not found');

      // Optimistic concurrency check
      if (record.version !== req.body.version) {
        return ApiResponse.conflict(
          res,
          `Conflict: This record was modified by another user. Current database version is ${record.version}, but provided version was ${req.body.version}. Please refresh.`
        );
      }

      const before = record.toJSON();
      const feedbackEntries = [];

      // Track field-level corrections and populate Feedback collection
      const checkAndRecordFieldCorrection = async (fieldName, originalVal, newVal) => {
        if (newVal !== undefined && JSON.stringify(originalVal) !== JSON.stringify(newVal)) {
          const originalConfidence = record.confidence?.fields instanceof Map
            ? record.confidence.fields.get(fieldName) || 0
            : record.confidence?.fields?.[fieldName] || 0;

          const fb = await Feedback.create({
            landRecordId: record._id,
            fieldName,
            originalValue: originalVal,
            correctedValue: newVal,
            originalConfidence,
            correctedBy: req.user._id,
          });
          feedbackEntries.push(fb);
        }
      };

      if (req.body.surveyNumber) {
        await checkAndRecordFieldCorrection('surveyNumber', record.surveyNumber, req.body.surveyNumber);
        record.surveyNumber = req.body.surveyNumber;
      }
      if (req.body.khasraNumber !== undefined) {
        await checkAndRecordFieldCorrection('khasraNumber', record.khasraNumber, req.body.khasraNumber);
        record.khasraNumber = req.body.khasraNumber;
      }
      if (req.body.khataNumber !== undefined) {
        await checkAndRecordFieldCorrection('khataNumber', record.khataNumber, req.body.khataNumber);
        record.khataNumber = req.body.khataNumber;
      }
      if (req.body.plotArea) {
        await checkAndRecordFieldCorrection('plotArea', record.plotArea, req.body.plotArea);
        record.plotArea = req.body.plotArea;
      }
      if (req.body.landClassification) {
        await checkAndRecordFieldCorrection('landClassification', record.landClassification, req.body.landClassification);
        record.landClassification = req.body.landClassification;
      }
      if (req.body.landownerDetails) {
        await checkAndRecordFieldCorrection('landownerDetails', record.landownerDetails, req.body.landownerDetails);
        record.landownerDetails = req.body.landownerDetails;
      }
      if (req.body.location) {
        await checkAndRecordFieldCorrection('location', record.location, { ...record.location, ...req.body.location });
        record.location = { ...record.location, ...req.body.location };
      }
      if (req.body.ownershipDetails) {
        record.ownershipDetails = { ...record.ownershipDetails, ...req.body.ownershipDetails };
      }

      // Increment optimistic version
      record.version += 1;
      record.verifiedBy = req.user._id;
      record.verifiedAt = new Date();

      if (req.body.status) {
        record.status = req.body.status;
      }

      await record.save();

      // Write immutable audit trail
      const diff = AuditService.computeDiff(before, record.toJSON());
      await AuditService.log({
        entityType: 'landRecord',
        entityId: record._id,
        action: AUDIT_ACTIONS.UPDATE,
        performedBy: req.user._id,
        diff,
      });

      return ApiResponse.success(
        res,
        {
          record,
          feedbackCount: feedbackEntries.length,
        },
        'Record updated successfully and feedback recorded for model learning'
      );
    } catch (err) {
      next(err);
    }
  }

  static async approveRecord(req, res, next) {
    try {
      const record = await LandRecord.findById(req.params.id);
      if (!record) return ApiResponse.notFound(res, 'Land record not found');

      record.status = RECORD_STATUS.VALIDATED;
      record.verifiedBy = req.user._id;
      record.verifiedAt = new Date();
      record.version += 1;
      await record.save();

      // Mark associated task as completed
      await VerificationTask.updateMany(
        { landRecordId: record._id },
        { status: 'COMPLETED', completedAt: new Date() }
      );

      await AuditService.log({
        entityType: 'landRecord',
        entityId: record._id,
        action: AUDIT_ACTIONS.APPROVE,
        performedBy: req.user._id,
        diff: { status: RECORD_STATUS.VALIDATED },
      });

      return ApiResponse.success(res, record, 'Land record approved and validated');
    } catch (err) {
      next(err);
    }
  }

  static async rejectRecord(req, res, next) {
    try {
      const record = await LandRecord.findById(req.params.id);
      if (!record) return ApiResponse.notFound(res, 'Land record not found');

      const reason = req.body.reason || 'Verification rejected by official';
      record.status = RECORD_STATUS.REJECTED;
      record.version += 1;
      await record.save();

      await VerificationTask.updateMany(
        { landRecordId: record._id },
        { status: 'COMPLETED', notes: `Rejected: ${reason}`, completedAt: new Date() }
      );

      await AuditService.log({
        entityType: 'landRecord',
        entityId: record._id,
        action: AUDIT_ACTIONS.REJECT,
        performedBy: req.user._id,
        diff: { status: RECORD_STATUS.REJECTED, reason },
      });

      return ApiResponse.success(res, record, 'Land record rejected');
    } catch (err) {
      next(err);
    }
  }

  static async publishRecord(req, res, next) {
    try {
      const record = await LandRecord.findById(req.params.id);
      if (!record) return ApiResponse.notFound(res, 'Land record not found');

      if (record.status !== RECORD_STATUS.VALIDATED) {
        return ApiResponse.badRequest(
          res,
          `Only validated records can be published. Current status is: ${record.status}`
        );
      }

      record.status = RECORD_STATUS.PUBLISHED;
      record.version += 1;
      await record.save();

      await AuditService.log({
        entityType: 'landRecord',
        entityId: record._id,
        action: AUDIT_ACTIONS.PUBLISH,
        performedBy: req.user._id,
        diff: { status: RECORD_STATUS.PUBLISHED },
      });

      return ApiResponse.success(res, record, 'Land record published to open registry');
    } catch (err) {
      next(err);
    }
  }

  static async getDuplicates(req, res, next) {
    try {
      const record = await LandRecord.findById(req.params.id);
      if (!record) return ApiResponse.notFound(res, 'Land record not found');

      const check = await DuplicateDetectionService.checkDuplicates(record, record._id);
      return ApiResponse.success(res, check, 'Duplicate analysis result');
    } catch (err) {
      next(err);
    }
  }

  static async getRecordAudit(req, res, next) {
    try {
      const logs = await AuditLog.find({ entityId: req.params.id })
        .populate('performedBy', 'name email role')
        .sort({ timestamp: -1 });

      return ApiResponse.success(res, logs, 'Record audit trail');
    } catch (err) {
      next(err);
    }
  }

  static async exportRecords(req, res, next) {
    try {
      const format = req.query.format || 'json';
      const filter = { ...(req.jurisdictionFilter || {}) };

      if (req.query.status) filter.status = req.query.status;
      if (req.query.district) filter['location.district'] = new RegExp(`^${req.query.district}$`, 'i');

      const records = await LandRecord.find(filter).lean();

      await AuditService.log({
        entityType: 'landRecord',
        entityId: req.user._id,
        action: AUDIT_ACTIONS.EXPORT,
        performedBy: req.user._id,
        diff: { count: records.length, format },
      });

      if (format === 'csv') {
        const headers = ['Survey No', 'Khasra No', 'District', 'Tehsil', 'Village', 'Owner Name', 'Plot Area', 'Unit', 'Status'];
        const rows = records.map((r) => [
          r.surveyNumber,
          r.khasraNumber || '',
          r.location.district,
          r.location.tehsil,
          r.location.village,
          r.landownerDetails?.[0]?.name || '',
          r.plotArea?.value || '',
          r.plotArea?.unit || '',
          r.status,
        ]);

        const csvContent = [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="bhumidrishti_records_export.csv"');
        return res.send(csvContent);
      }

      return ApiResponse.success(res, records, 'Records exported', 200, { count: records.length, exportedAt: new Date() });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { RecordController, updateRecordSchema };
