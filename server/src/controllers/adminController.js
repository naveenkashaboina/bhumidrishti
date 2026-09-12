const crypto = require('crypto');
const { z } = require('zod');
const SystemConfig = require('../models/SystemConfig');
const AuditLog = require('../models/AuditLog');
const ApiClient = require('../models/ApiClient');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');

const updateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional(),
});

const createApiClientSchema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  allowedRegions: z.array(z.string()).optional(),
});

class AdminController {
  static async getConfig(req, res, next) {
    try {
      const configs = await SystemConfig.find().populate('updatedBy', 'name email');
      return ApiResponse.success(res, configs, 'System configurations');
    } catch (err) {
      next(err);
    }
  }

  static async updateConfig(req, res, next) {
    try {
      const { key, value, description } = req.body;

      let config = await SystemConfig.findOne({ key });
      const before = config ? config.toJSON() : null;

      if (!config) {
        config = new SystemConfig({ key, value, description, updatedBy: req.user._id });
      } else {
        config.value = value;
        if (description) config.description = description;
        config.updatedBy = req.user._id;
      }

      await config.save();

      await AuditService.log({
        entityType: 'systemConfig',
        entityId: config._id,
        action: before ? 'UPDATE' : 'CREATE',
        performedBy: req.user._id,
        diff: { key, value },
      });

      return ApiResponse.success(res, config, 'System configuration updated');
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '50', 10);
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.entityType) filter.entityType = req.query.entityType;
      if (req.query.action) filter.action = req.query.action;
      if (req.query.entityId) filter.entityId = req.query.entityId;
      if (req.query.performedBy) filter.performedBy = req.query.performedBy;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate('performedBy', 'name email role')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(filter),
      ]);

      return ApiResponse.success(res, logs, 'Global audit trail retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getApiClients(req, res, next) {
    try {
      const clients = await ApiClient.find().sort({ createdAt: -1 });
      return ApiResponse.success(res, clients, 'API clients list');
    } catch (err) {
      next(err);
    }
  }

  static async createApiClient(req, res, next) {
    try {
      const { clientName, scopes, allowedRegions = ['*'] } = req.body;

      // Generate a cryptographically secure 32-byte API key
      const rawApiKey = `bhd_${crypto.randomBytes(24).toString('hex')}`;
      const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
      const apiKeyPrefix = rawApiKey.substring(0, 8);

      const client = await ApiClient.create({
        clientName,
        apiKeyHash,
        apiKeyPrefix,
        scopes,
        allowedRegions,
        isActive: true,
      });

      await AuditService.log({
        entityType: 'apiClient',
        entityId: client._id,
        action: 'CREATE',
        performedBy: req.user._id,
        diff: { clientName, scopes, allowedRegions },
      });

      return ApiResponse.created(
        res,
        {
          client,
          rawApiKey, // Provided only once on creation
        },
        'API Client created successfully. Save this rawApiKey safely; it will not be shown again.'
      );
    } catch (err) {
      next(err);
    }
  }

  static async updateApiClient(req, res, next) {
    try {
      const client = await ApiClient.findById(req.params.id);
      if (!client) return ApiResponse.notFound(res, 'API Client not found');

      if (req.body.isActive !== undefined) client.isActive = req.body.isActive;
      if (req.body.scopes) client.scopes = req.body.scopes;
      if (req.body.allowedRegions) client.allowedRegions = req.body.allowedRegions;

      await client.save();

      await AuditService.log({
        entityType: 'apiClient',
        entityId: client._id,
        action: 'UPDATE',
        performedBy: req.user._id,
        diff: { isActive: client.isActive, scopes: client.scopes },
      });

      return ApiResponse.success(res, client, 'API Client updated');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { AdminController, updateConfigSchema, createApiClientSchema };
