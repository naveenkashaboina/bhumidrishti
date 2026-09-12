const mongoose = require('mongoose');
const dns = require('dns');
const env = require('./env');
const logger = require('../utils/logger');

let isConnected = false;

// Fallback to public DNS if using SRV records on Windows/local networks
if (env.MONGODB_URI && env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (_) {
    // Keep system defaults if cannot override
  }
}

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = conn.connections[0].readyState === 1;
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    logger.error('MongoDB Connection Error: %s', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB Disconnected');
};

module.exports = { connectDB, disconnectDB };
