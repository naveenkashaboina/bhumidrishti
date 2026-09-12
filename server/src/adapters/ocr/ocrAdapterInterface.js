/**
 * Base OCR Adapter Interface
 */
class OcrAdapterInterface {
  /**
   * Extract text and metadata from image/PDF buffer
   * @param {Buffer} buffer
   * @param {string} [language='hin+eng']
   * @returns {Promise<{ text: string, confidence: number, lines: Array<{ text: string, confidence: number }> }>}
   */
  async extractText(buffer, language = 'hin+eng') {
    throw new Error('extractText method must be implemented by subclass');
  }
}

module.exports = OcrAdapterInterface;
