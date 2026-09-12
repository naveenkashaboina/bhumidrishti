const { Queue, Worker } = require('bullmq');
const env = require('../config/env');
const logger = require('../utils/logger');
const ExtractionWorker = require('../jobs/extractionWorker');

class QueueService {
  constructor() {
    this.queue = null;
    this.worker = null;
    this.isRedisEnabled = env.ENABLE_REDIS_QUEUE;
    this.init();
  }

  init() {
    if (this.isRedisEnabled) {
      try {
        const connection = {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD,
          maxRetriesPerRequest: null,
        };

        this.queue = new Queue('extraction-queue', { connection });
        this.worker = new Worker(
          'extraction-queue',
          async (job) => {
            logger.info(`BullMQ Worker processing job ${job.id} for document ${job.data.documentId}`);
            return ExtractionWorker.processDocument(job.data.documentId);
          },
          { connection, concurrency: 2 }
        );

        this.worker.on('failed', (job, err) => {
          logger.error(`BullMQ Job ${job?.id} failed: %s`, err.message);
        });

        logger.info(`QueueService initialized with Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
      } catch (err) {
        logger.warn('Failed to connect to Redis BullMQ, falling back to in-memory async runner: %s', err.message);
        this.isRedisEnabled = false;
        this.queue = null;
      }
    } else {
      logger.info('QueueService running in in-memory async fallback mode (Redis disabled/local mode)');
    }
  }

  /**
   * Enqueue a document for OCR extraction
   * @param {string} documentId
   */
  async addExtractionJob(documentId) {
    if (this.isRedisEnabled && this.queue) {
      try {
        const job = await this.queue.add('process-document', { documentId }, {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
        });
        logger.info(`Job enqueued in BullMQ: ${job.id} (Document ${documentId})`);
        return { jobId: job.id, mode: 'bullmq' };
      } catch (err) {
        logger.warn('Failed to push to Redis queue, switching to immediate async fallback: %s', err.message);
      }
    }

    // Direct asynchronous execution without blocking caller
    setImmediate(async () => {
      try {
        await ExtractionWorker.processDocument(documentId);
      } catch (err) {
        logger.error(`Direct async processing failed for Document ${documentId}: %s`, err.message);
      }
    });

    return { jobId: `async-${Date.now()}`, mode: 'in-memory-async' };
  }

  async close() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}

const queueServiceInstance = new QueueService();
module.exports = queueServiceInstance;
