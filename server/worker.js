const { connectDB } = require('./src/config/db');
const queueService = require('./src/services/queueService');
const logger = require('./src/utils/logger');

const startWorker = async () => {
  try {
    await connectDB();
    logger.info('BhumiDrishti Extraction Worker process started and listening for jobs');

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down worker gracefully...`);
      await queueService.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Worker failed to start: %s', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startWorker();
}

module.exports = { startWorker };
