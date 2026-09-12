const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`=======================================================`);
      logger.info(`  BhumiDrishti API Server is running on port ${env.PORT} `);
      logger.info(`  Environment: ${env.NODE_ENV}                         `);
      logger.info(`  Binding: 0.0.0.0:${env.PORT}                         `);
      logger.info(`  Swagger Docs: /api-docs                              `);
      logger.info(`=======================================================`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server: %s', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
