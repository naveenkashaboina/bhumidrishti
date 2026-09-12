const ApiResponse = require('../utils/apiResponse');

/**
 * Zod validation middleware factory
 * @param {Object} schemaObject - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
const validate = (schemaObject) => {
  return (req, res, next) => {
    try {
      if (schemaObject.body) {
        req.body = schemaObject.body.parse(req.body);
      }
      if (schemaObject.query) {
        req.query = schemaObject.query.parse(req.query);
      }
      if (schemaObject.params) {
        req.params = schemaObject.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return ApiResponse.badRequest(res, 'Request validation failed', formattedErrors);
      }
      return ApiResponse.badRequest(res, error.message);
    }
  };
};

module.exports = validate;
