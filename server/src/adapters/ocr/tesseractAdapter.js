const { createWorker } = require('tesseract.js');
const OcrAdapterInterface = require('./ocrAdapterInterface');
const logger = require('../../utils/logger');

class TesseractAdapter extends OcrAdapterInterface {
  /**
   * Extract text using Tesseract.js WebAssembly worker
   */
  async extractText(buffer, language = 'hin+eng') {
    let worker = null;
    try {
      // Map combined hints
      const lang = language.includes('hin') ? 'hin+eng' : 'eng';
      logger.info(`Starting Tesseract OCR job with language: ${lang}`);

      worker = await createWorker(lang);
      const ret = await worker.recognize(buffer);
      await worker.terminate();

      const text = ret.data.text || '';
      const confidence = ret.data.confidence || 0;

      const lines = (ret.data.lines || []).map((l) => ({
        text: l.text.trim(),
        confidence: l.confidence,
      }));

      return {
        text,
        confidence,
        lines,
      };
    } catch (error) {
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
      logger.error('Tesseract OCR error: %s', error.message);
      // Return partial or empty response rather than throwing fatal error
      return {
        text: '',
        confidence: 0,
        lines: [],
        error: error.message,
      };
    }
  }
}

module.exports = TesseractAdapter;
