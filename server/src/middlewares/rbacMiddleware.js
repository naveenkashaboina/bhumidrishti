const ApiResponse = require('../utils/apiResponse');
const { ROLES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Role-Based Access Control Middleware
 * @param {string[]} allowedRoles
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required before checking roles');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `RBAC: Access denied for user ${req.user._id} (${req.user.role}). Required: [${allowedRoles.join(', ')}]`
      );
      return ApiResponse.forbidden(
        res,
        `Access denied. Role "${req.user.role}" does not have permission for this resource.`
      );
    }

    next();
  };
};

/**
 * Jurisdiction scoping middleware:
 * State & Super Admins have unrestricted access.
 * District Officers, Verifiers, and DEOs are restricted to their assigned district / tehsil.
 */
const requireJurisdiction = (fieldPrefix = 'location') => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Admins bypass local jurisdiction scoping
    if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.STATE_ADMIN) {
      req.jurisdictionFilter = {};
      return next();
    }

    const { district, tehsil } = req.user.jurisdiction || {};

    if (!district) {
      return ApiResponse.forbidden(
        res,
        'User has no assigned administrative district jurisdiction'
      );
    }

    // Attach filter object to request for controller query scoping
    req.jurisdictionFilter = {
      [`${fieldPrefix}.district`]: new RegExp(`^${district}$`, 'i'),
    };

    if (tehsil && req.user.role === ROLES.DEO) {
      req.jurisdictionFilter[`${fieldPrefix}.tehsil`] = new RegExp(`^${tehsil}$`, 'i');
    }

    next();
  };
};

module.exports = { requireRole, requireJurisdiction };
