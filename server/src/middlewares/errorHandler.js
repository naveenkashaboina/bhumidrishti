const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const env = require('../config/env');

// Centralized Express error-handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled Exception on %s %s: %s', req.method, req.originalUrl, err.message, {
    stack: err.stack,
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.badRequest(res, 'Database validation error', errors);
  }

  // Handle MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return ApiResponse.conflict(res, `Duplicate value for unique index: ${field}`);
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    return ApiResponse.badRequest(res, `File upload error: ${err.message}`);
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational || env.NODE_ENV !== 'production' ? err.message : 'Internal Server Error';

  return ApiResponse.error(res, message, statusCode);
};

module.exports = errorHandler;
