const multer = require('multer');
const Document = require('../models/Document');
const ApiResponse = require('../utils/apiResponse');
const StorageService = require('../services/storageService');
const queueService = require('../services/queueService');
const AuditService = require('../services/auditService');
const env = require('../config/env');
const logger = require('../utils/logger');

// In-memory Multer storage before persisting via StorageService
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'application/pdf',
    'text/plain',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, TIFF, PDF, TXT`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter,
});

class DocumentController {
  static async uploadSingle(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.badRequest(res, 'No document file uploaded');
      }

      const {
        state = req.user.jurisdiction?.state || 'Maharashtra',
        district = req.user.jurisdiction?.district || 'Pune',
        tehsil = req.user.jurisdiction?.tehsil || 'Haveli',
        village = req.user.jurisdiction?.village || 'Wagholi',
        languageHint = 'hin+eng',
      } = req.body;

      const fileInfo = await StorageService.saveFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Check if this exact file was already uploaded
      const existingSameHash = await Document.findOne({ fileHash: fileInfo.fileHash });
      let version = 1;
      let previousVersionId = null;

      if (existingSameHash) {
        version = (existingSameHash.version || 1) + 1;
        previousVersionId = existingSameHash._id;
        logger.warn(`Duplicate file upload detected (SHA-256 match). Created as version ${version}.`);
      }

      const doc = await Document.create({
        originalFileName: fileInfo.originalFileName,
        storageKey: fileInfo.storageKey,
        storageUrl: fileInfo.storageUrl,
        mimeType: fileInfo.mimeType,
        fileSizeBytes: fileInfo.fileSizeBytes,
        fileHash: fileInfo.fileHash,
        uploadedBy: req.user._id,
        sourceOffice: { state, district, tehsil, village },
        languageHint,
        version,
        previousVersionId,
        status: 'UPLOADED',
      });

      // Enqueue async extraction job
      const jobInfo = await queueService.addExtractionJob(doc._id.toString());

      await AuditService.log({
        entityType: 'document',
        entityId: doc._id,
        action: 'CREATE',
        performedBy: req.user._id,
        diff: { fileName: doc.originalFileName, size: doc.fileSizeBytes, version },
      });

      return ApiResponse.created(
        res,
        {
          document: doc,
          job: jobInfo,
          duplicateHashDetected: !!existingSameHash,
        },
        'Document uploaded and queued for multilingual extraction'
      );
    } catch (err) {
      next(err);
    }
  }

  static async uploadBulk(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return ApiResponse.badRequest(res, 'No files provided for bulk upload');
      }

      const {
        state = req.user.jurisdiction?.state || 'Maharashtra',
        district = req.user.jurisdiction?.district || 'Pune',
        tehsil = req.user.jurisdiction?.tehsil || 'Haveli',
        village = req.user.jurisdiction?.village || 'Wagholi',
        languageHint = 'hin+eng',
      } = req.body;

      const createdDocs = [];

      for (const file of req.files) {
        const fileInfo = await StorageService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        const doc = await Document.create({
          originalFileName: fileInfo.originalFileName,
          storageKey: fileInfo.storageKey,
          storageUrl: fileInfo.storageUrl,
          mimeType: fileInfo.mimeType,
          fileSizeBytes: fileInfo.fileSizeBytes,
          fileHash: fileInfo.fileHash,
          uploadedBy: req.user._id,
          sourceOffice: { state, district, tehsil, village },
          languageHint,
          status: 'UPLOADED',
        });

        await queueService.addExtractionJob(doc._id.toString());
        createdDocs.push(doc);
      }

      return ApiResponse.created(
        res,
        {
          count: createdDocs.length,
          documents: createdDocs,
        },
        `Successfully uploaded and queued ${createdDocs.length} documents`
      );
    } catch (err) {
      next(err);
    }
  }

  static async getDocuments(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      const filter = { ...(req.jurisdictionFilter || {}) };
      if (req.query.status) filter.status = req.query.status;
      if (req.query.district) filter['sourceOffice.district'] = new RegExp(`^${req.query.district}$`, 'i');

      const [docs, total] = await Promise.all([
        Document.find(filter).populate('uploadedBy', 'name email role').skip(skip).limit(limit).sort({ createdAt: -1 }),
        Document.countDocuments(filter),
      ]);

      return ApiResponse.success(res, docs, 'Documents retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDocumentById(req, res, next) {
    try {
      const doc = await Document.findById(req.params.id).populate('uploadedBy', 'name email role');
      if (!doc) return ApiResponse.notFound(res, 'Document not found');
      return ApiResponse.success(res, doc, 'Document details');
    } catch (err) {
      next(err);
    }
  }

  static async getDocumentFile(req, res, next) {
    try {
      const doc = await Document.findById(req.params.id);
      if (!doc) return ApiResponse.notFound(res, 'Document not found');

      const { buffer } = await StorageService.getFile(doc.storageKey);
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.originalFileName}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { DocumentController, upload };
