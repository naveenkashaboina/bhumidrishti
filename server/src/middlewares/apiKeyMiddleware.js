const crypto = require('crypto');
const ApiClient = require('../models/ApiClient');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate external integration consumers via x-api-key header
 * @param {string} [requiredScope='read:records']
 */
const requireApiKey = (requiredScope = 'read:records') => {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return ApiResponse.unauthorized(res, 'Missing API key in "x-api-key" header');
    }

    try {
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const client = await ApiClient.findOne({ apiKeyHash, isActive: true });

      if (!client) {
        logger.warn('Invalid or inactive API key attempt');
        return ApiResponse.unauthorized(res, 'Invalid or inactive API key');
      }

      // Check scope
      if (requiredScope && !client.scopes.includes(requiredScope)) {
        return ApiResponse.forbidden(
          res,
          `API Client lacks the required scope: "${requiredScope}". Assigned scopes: [${client.scopes.join(', ')}]`
        );
      }

      // Update last accessed
      client.lastAccessedAt = new Date();
      await client.save();

      req.apiClient = client;
      req.hasPiiScope = client.scopes.includes('read:pii');
      next();
    } catch (err) {
      logger.error('API key verification error: %s', err.message);
      return ApiResponse.error(res, 'Internal error during API key verification', 500);
    }
  };
};

module.exports = requireApiKey;
