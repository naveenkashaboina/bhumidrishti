const mongoose = require('mongoose');
const {
  RECORD_STATUS,
  LAND_CLASSIFICATIONS,
  AREA_UNITS,
  OWNERSHIP_TYPES,
} = require('../config/constants');

const landownerDetailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    guardianName: { type: String, trim: true, default: '' },
    share: { type: String, trim: true, default: '1/1' },
    aadhaarHash: { type: String, default: null }, // PII field, masked by default
  },
  { _id: false }
);

const mutationRecordSchema = new mongoose.Schema(
  {
    mutationNumber: { type: String, trim: true },
    date: { type: String, trim: true },
    type: { type: String, trim: true }, // e.g., SALE, INHERITANCE, PARTITION, GIFT
    description: { type: String, trim: true },
  },
  { _id: false }
);

const geoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon', 'Point'],
      default: 'Polygon',
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
  },
  { _id: false }
);

const landRecordSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    landownerDetails: {
      type: [landownerDetailSchema],
      required: true,
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'At least one landowner detail is required',
      ],
    },
    surveyNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    khasraNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    khataNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    plotArea: {
      value: { type: Number, required: true, min: [0.0001, 'Plot area must be positive'] },
      unit: { type: String, enum: AREA_UNITS, default: 'acres', required: true },
    },
    location: {
      state: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true, index: true },
      tehsil: { type: String, required: true, trim: true },
      village: { type: String, required: true, trim: true },
      geo: { type: geoSchema, default: null },
      geoSource: {
        type: String,
        enum: ['surveyed', 'approximate', 'none'],
        default: 'none',
      },
    },
    landClassification: {
      type: String,
      enum: LAND_CLASSIFICATIONS,
      default: 'AGRICULTURAL_UNIRRIGATED',
      required: true,
    },
    ownershipDetails: {
      type: { type: String, enum: OWNERSHIP_TYPES, default: 'INDIVIDUAL' },
      remarks: { type: String, trim: true, default: '' },
    },
    mutationRecords: {
      type: [mutationRecordSchema],
      default: [],
    },
    registrationInfo: {
      registrationNumber: { type: String, trim: true, default: '' },
      date: { type: String, trim: true, default: '' },
      registrar: { type: String, trim: true, default: '' },
    },
    status: {
      type: String,
      enum: Object.values(RECORD_STATUS),
      default: RECORD_STATUS.EXTRACTED,
      index: true,
    },
    confidence: {
      overall: { type: Number, min: 0, max: 100, default: 0 },
      fields: {
        type: Map,
        of: Number,
        default: {},
      },
    },
    flaggedFields: {
      type: [String],
      default: [],
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LandRecord',
      default: null,
      index: true,
    },
    crossCheck: {
      lrms: {
        status: { type: String, enum: ['MATCHED', 'DISCREPANCY', 'NOT_FOUND', 'UNAVAILABLE'], default: 'UNAVAILABLE' },
        checkedAt: { type: Date, default: null },
        referenceId: { type: String, default: null },
        simulated: { type: Boolean, default: false },
      },
      dilrmp: {
        status: { type: String, enum: ['MATCHED', 'DISCREPANCY', 'NOT_FOUND', 'UNAVAILABLE'], default: 'UNAVAILABLE' },
        checkedAt: { type: Date, default: null },
        referenceId: { type: String, default: null },
        simulated: { type: Boolean, default: false },
      },
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rawExtractedText: {
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
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

// Compound index for composite duplicate check & location-based query
landRecordSchema.index(
  {
    'location.district': 1,
    'location.tehsil': 1,
    'location.village': 1,
    surveyNumber: 1,
  },
  { background: true }
);

// Geo spatial index
landRecordSchema.index({ 'location.geo': '2dsphere' }, { sparse: true });

// Text index on landowner name for fuzzy search
landRecordSchema.index({ 'landownerDetails.name': 'text' });

module.exports = mongoose.model('LandRecord', landRecordSchema);
