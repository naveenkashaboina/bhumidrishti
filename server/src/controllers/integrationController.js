const LandRecord = require('../models/LandRecord');
const ApiResponse = require('../utils/apiResponse');

class IntegrationController {
  /**
   * Mask sensitive PII fields if client lacks 'read:pii' scope
   */
  static sanitizeRecord(record, hasPiiScope = false) {
    const rec = typeof record.toObject === 'function' ? record.toObject() : { ...record };

    if (!hasPiiScope && rec.landownerDetails) {
      rec.landownerDetails = rec.landownerDetails.map((o) => {
        // Mask full name slightly or hide aadhaar/guardian info
        const parts = (o.name || '').split(' ');
        const maskedName = parts
          .map((p) => (p.length > 2 ? `${p[0]}***${p[p.length - 1]}` : p))
          .join(' ');

        return {
          name: maskedName,
          share: o.share,
          isPiiMasked: true,
        };
      });
    }

    delete rec.__v;
    delete rec.rawExtractedText;
    return rec;
  }

  static async getRecords(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '50', 10);
      const skip = (page - 1) * limit;

      const filter = { status: { $in: ['VALIDATED', 'PUBLISHED'] } };

      // Apply client's allowed regions
      if (req.apiClient && !req.apiClient.allowedRegions.includes('*')) {
        filter['location.district'] = { $in: req.apiClient.allowedRegions };
      }

      if (req.query.district) {
        filter['location.district'] = new RegExp(`^${req.query.district}$`, 'i');
      }
      if (req.query.village) {
        filter['location.village'] = new RegExp(`^${req.query.village}$`, 'i');
      }

      const [records, total] = await Promise.all([
        LandRecord.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        LandRecord.countDocuments(filter),
      ]);

      const sanitized = records.map((r) => IntegrationController.sanitizeRecord(r, req.hasPiiScope));

      return ApiResponse.success(res, sanitized, 'External integration records retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        piiMasked: !req.hasPiiScope,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRecordBySurveyNumber(req, res, next) {
    try {
      const { surveyNumber } = req.params;
      const filter = {
        surveyNumber,
        status: { $in: ['VALIDATED', 'PUBLISHED'] },
      };

      if (req.query.district) {
        filter['location.district'] = new RegExp(`^${req.query.district}$`, 'i');
      }

      const record = await LandRecord.findOne(filter).lean();
      if (!record) {
        return ApiResponse.notFound(
          res,
          `No published record found with survey number ${surveyNumber}`
        );
      }

      const sanitized = IntegrationController.sanitizeRecord(record, req.hasPiiScope);
      return ApiResponse.success(res, sanitized, 'Record found');
    } catch (err) {
      next(err);
    }
  }

  static async getGisPlots(req, res, next) {
    try {
      const filter = {
        status: { $in: ['VALIDATED', 'PUBLISHED'] },
        'location.geo': { $ne: null },
      };

      if (req.query.district) {
        filter['location.district'] = new RegExp(`^${req.query.district}$`, 'i');
      }

      const records = await LandRecord.find(filter)
        .select('surveyNumber location plotArea landClassification status')
        .lean();

      // Format as standard GeoJSON FeatureCollection
      const features = records.map((r) => ({
        type: 'Feature',
        id: r._id,
        geometry: r.location?.geo || null,
        properties: {
          surveyNumber: r.surveyNumber,
          district: r.location?.district,
          tehsil: r.location?.tehsil,
          village: r.location?.village,
          plotArea: r.plotArea,
          landClassification: r.landClassification,
          status: r.status,
        },
      }));

      const featureCollection = {
        type: 'FeatureCollection',
        features: features.filter((f) => f.geometry !== null),
      };

      return ApiResponse.success(res, featureCollection, 'GeoJSON FeatureCollection for integration');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = IntegrationController;
