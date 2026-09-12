const LandRecord = require('../models/LandRecord');
const Document = require('../models/Document');
const VerificationTask = require('../models/VerificationTask');
const Feedback = require('../models/Feedback');
const ApiResponse = require('../utils/apiResponse');

class DashboardController {
  static async getSummary(req, res, next) {
    try {
      const filter = { ...(req.jurisdictionFilter || {}) };

      const [recordStats, totalDocs, pendingTasks, publishedCount] = await Promise.all([
        LandRecord.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              totalRecords: { $sum: 1 },
              avgConfidence: { $avg: '$confidence.overall' },
              statusCounts: {
                $push: '$status',
              },
            },
          },
        ]),
        Document.countDocuments(
          req.jurisdictionFilter
            ? { 'sourceOffice.district': req.jurisdictionFilter['location.district'] }
            : {}
        ),
        VerificationTask.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
        LandRecord.countDocuments({ ...filter, status: 'PUBLISHED' }),
      ]);

      const stats = recordStats[0] || { totalRecords: 0, avgConfidence: 0, statusCounts: [] };

      // Calculate status counts
      const statusMap = {
        EXTRACTED: 0,
        NEEDS_VERIFICATION: 0,
        PENDING_APPROVAL: 0,
        VALIDATED: 0,
        PUBLISHED: 0,
        REJECTED: 0,
        ARCHIVED: 0,
      };

      (stats.statusCounts || []).forEach((st) => {
        if (statusMap[st] !== undefined) statusMap[st]++;
      });

      return ApiResponse.success(
        res,
        {
          totalDocuments: totalDocs,
          totalLandRecords: stats.totalRecords,
          publishedRecords: publishedCount,
          pendingVerifications: pendingTasks,
          averageAccuracyPercentage: Math.round(stats.avgConfidence || 0),
          statusBreakdown: statusMap,
        },
        'Dashboard summary statistics'
      );
    } catch (err) {
      next(err);
    }
  }

  static async getByRegion(req, res, next) {
    try {
      const level = req.query.level === 'state' ? '$location.state' : '$location.district';
      const filter = { ...(req.jurisdictionFilter || {}) };

      const regionalData = await LandRecord.aggregate([
        { $match: filter },
        {
          $group: {
            _id: level,
            totalRecords: { $sum: 1 },
            avgConfidence: { $avg: '$confidence.overall' },
            published: { $sum: { $cond: [{ $eq: ['$status', 'PUBLISHED'] }, 1, 0] } },
            validated: { $sum: { $cond: [{ $eq: ['$status', 'VALIDATED'] }, 1, 0] } },
            needsVerification: {
              $sum: { $cond: [{ $eq: ['$status', 'NEEDS_VERIFICATION'] }, 1, 0] },
            },
            totalArea: { $sum: '$plotArea.value' },
          },
        },
        { $sort: { totalRecords: -1 } },
      ]);

      return ApiResponse.success(res, regionalData, `Regional breakdown by ${req.query.level || 'district'}`);
    } catch (err) {
      next(err);
    }
  }

  static async getErrorStats(req, res, next) {
    try {
      // Aggregation on Feedback collection for field-level error rates
      const [fieldErrors, flagStats] = await Promise.all([
        Feedback.aggregate([
          {
            $group: {
              _id: '$fieldName',
              correctionCount: { $sum: 1 },
              avgInitialConfidence: { $avg: '$originalConfidence' },
            },
          },
          { $sort: { correctionCount: -1 } },
        ]),
        LandRecord.aggregate([
          { $unwind: '$flaggedFields' },
          {
            $group: {
              _id: '$flaggedFields',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

      return ApiResponse.success(
        res,
        {
          topCorrectedFields: fieldErrors,
          commonFlaggedReasons: flagStats,
        },
        'Extraction error and correction statistics'
      );
    } catch (err) {
      next(err);
    }
  }

  static async getTrend(req, res, next) {
    try {
      const days = parseInt(req.query.range || '30', 10);
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const trend = await LandRecord.aggregate([
        { $match: { createdAt: { $gte: sinceDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            processedCount: { $sum: 1 },
            avgAccuracy: { $avg: '$confidence.overall' },
            publishedCount: { $sum: { $cond: [{ $eq: ['$status', 'PUBLISHED'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return ApiResponse.success(res, trend, `Processing and accuracy trend over last ${days} days`);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
