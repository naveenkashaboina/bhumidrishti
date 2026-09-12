const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

// Ensure upload directory exists
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

class StorageService {
  /**
   * Save a file buffer to storage
   * @param {Buffer} buffer 
   * @param {string} originalFileName 
   * @param {string} mimeType 
   * @returns {Promise<{ storageKey: string, storageUrl: string, fileSizeBytes: number, fileHash: string }>}
   */
  static async saveFile(buffer, originalFileName, mimeType) {
    const ext = path.extname(originalFileName) || '.dat';
    const storageKey = `${Date.now()}_${crypto.randomUUID()}${ext}`;
    const targetPath = path.join(env.UPLOAD_DIR, storageKey);

    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    await fs.promises.writeFile(targetPath, buffer);
    logger.info(`Saved file ${storageKey} (${buffer.length} bytes) to ${targetPath}`);

    return {
      storageKey,
      storageUrl: `/api/v1/documents/file/${storageKey}`,
      fileSizeBytes: buffer.length,
      fileHash,
      mimeType,
      originalFileName,
    };
  }

  /**
   * Get file stream or buffer from storage
   * @param {string} storageKey 
   * @returns {Promise<{ buffer: Buffer, filePath: string }>}
   */
  static async getFile(storageKey) {
    const sanitizedKey = path.basename(storageKey);
    const filePath = path.join(env.UPLOAD_DIR, sanitizedKey);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found in storage: ${storageKey}`);
    }

    const buffer = await fs.promises.readFile(filePath);
    return { buffer, filePath };
  }

  /**
   * Check if file exists by SHA-256 hash
   */
  static calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

module.exports = StorageService;
