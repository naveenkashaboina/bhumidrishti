const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bhumidrishti',
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  ENABLE_REDIS_QUEUE: process.env.ENABLE_REDIS_QUEUE === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'bhumidrishti_jwt_dev_secret_key_change_in_prod_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'bhumidrishti_jwt_refresh_dev_secret_key_change_in_prod_2026',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  OCR_PROVIDER: process.env.OCR_PROVIDER || 'tesseract', // tesseract | mock | cloud_vision
  CONFIDENCE_THRESHOLD_OVERALL: parseInt(process.env.CONFIDENCE_THRESHOLD_OVERALL || '80', 10),
  CONFIDENCE_THRESHOLD_FIELD: parseInt(process.env.CONFIDENCE_THRESHOLD_FIELD || '60', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  EXTERNAL_REGISTRY_MODE: process.env.EXTERNAL_REGISTRY_MODE || 'mock',
};

module.exports = env;
