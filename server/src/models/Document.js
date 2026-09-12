const mongoose = require('mongoose');
const { DOCUMENT_STATUS } = require('../config/constants');

const documentSchema = new mongoose.Schema(
  {
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    storageUrl: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
    },
    fileHash: {
      type: String, // SHA-256 for exact duplicate upload detection
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceOffice: {
      state: { type: String, trim: true, required: true },
      district: { type: String, trim: true, required: true, index: true },
      tehsil: { type: String, trim: true, required: true },
      village: { type: String, trim: true, required: true },
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.UPLOADED,
      index: true,
    },
    languageHint: {
      type: String,
      default: 'hin+eng', // Hindi + English default
    },
    version: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    processingError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

documentSchema.index({ 'sourceOffice.district': 1, status: 1 });

module.exports = mongoose.model('Document', documentSchema);
