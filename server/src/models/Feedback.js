const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    landRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LandRecord',
      required: true,
      index: true,
    },
    fieldName: {
      type: String,
      required: true,
      index: true,
    },
    originalValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    correctedValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    originalConfidence: {
      type: Number,
      default: 0,
    },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

feedbackSchema.index({ fieldName: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
