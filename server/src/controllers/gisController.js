const LandRecord = require('../models/LandRecord');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');

class GisController {
  static async getPlots(req, res, next) {
    try {
      const filter = { 'location.geo': { $ne: null } };

      if (req.query.district) {
        filter['location.district'] = new RegExp(`^${req.query.district}$`, 'i');
      }
      if (req.query.tehsil) {
        filter['location.tehsil'] = new RegExp(`^${req.query.tehsil}$`, 'i');
      }
      if (req.query.village) {
        filter['location.village'] = new RegExp(`^${req.query.village}$`, 'i');
      }
      if (req.query.status) {
        filter.status = req.query.status;
      }

      const records = await LandRecord.find(filter)
        .select('surveyNumber khasraNumber khataNumber landownerDetails plotArea location landClassification status confidence')
        .lean();

      const features = records.map((r) => ({
        type: 'Feature',
        id: r._id,
        geometry: r.location?.geo || null,
        properties: {
          recordId: r._id,
          surveyNumber: r.surveyNumber,
          khasraNumber: r.khasraNumber,
          khataNumber: r.khataNumber,
          ownerName: r.landownerDetails?.[0]?.name || 'N/A',
          district: r.location?.district,
          tehsil: r.location?.tehsil,
          village: r.location?.village,
          plotArea: r.plotArea,
          landClassification: r.landClassification,
          status: r.status,
          confidence: r.confidence?.overall || 0,
        },
      }));

      const featureCollection = {
        type: 'FeatureCollection',
        features: features.filter((f) => f.geometry !== null),
      };

      return ApiResponse.success(res, featureCollection, 'GIS plots GeoJSON');
    } catch (err) {
      next(err);
    }
  }

  static async updatePlotBoundary(req, res, next) {
    try {
      const { id } = req.params;
      const { geo } = req.body;

      if (!geo || !geo.coordinates) {
        return ApiResponse.badRequest(res, 'Valid GeoJSON geometry is required');
      }

      const record = await LandRecord.findById(id);
      if (!record) return ApiResponse.notFound(res, 'Land record not found');

      const before = record.location.geo;
      record.location.geo = geo;
      record.version += 1;
      await record.save();

      await AuditService.log({
        entityType: 'landRecord',
        entityId: record._id,
        action: 'GEO_UPDATE',
        performedBy: req.user._id,
        diff: { before, after: geo },
      });

      return ApiResponse.success(res, record, 'Plot geographic boundary updated');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = GisController;
