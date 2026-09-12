const mongoose = require('mongoose');
const { API_SCOPES } = require('../config/constants');

const apiClientSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    apiKeyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    apiKeyPrefix: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      enum: API_SCOPES,
      default: ['read:records'],
    },
    allowedRegions: {
      type: [String],
      default: ['*'], // '*' means all regions or specific districts
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.apiKeyHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('ApiClient', apiClientSchema);
