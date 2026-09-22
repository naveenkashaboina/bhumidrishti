const { createWorker } = require('tesseract.js');
const OcrAdapterInterface = require('./ocrAdapterInterface');
const logger = require('../../utils/logger');

/**
 * Multi-pass Tesseract OCR Adapter
 *
 * When the initial OCR pass yields a confidence score below a configurable
 * threshold, the adapter automatically retries with different Tesseract PSM
 * (Page Segmentation Mode) settings to find the best result. This makes our
 * "multi-pass OCR" capability truthful without requiring a separate engine.
 *
 * PSM modes tried (in order):
 *   - PSM 3 (default): Fully automatic page segmentation, no OSD
 *   - PSM 6: Assume a single uniform block of text
 *   - PSM 4: Assume a single column of text of variable sizes
 *   - PSM 1: Automatic page segmentation with OSD
 *
 * The result with the highest confidence is returned.
 */

// PSM modes to try in multi-pass, ordered by general reliability
const PSM_MODES = [
  { psm: '3', label: 'auto (PSM 3)' },
  { psm: '6', label: 'uniform block (PSM 6)' },
  { psm: '4', label: 'single column (PSM 4)' },
  { psm: '1', label: 'auto with OSD (PSM 1)' },
];

// Below this confidence threshold, retry with different PSM modes
const RETRY_CONFIDENCE_THRESHOLD = 60;

class TesseractAdapter extends OcrAdapterInterface {
  /**
   * Extract text using Tesseract.js with multi-pass retry on low confidence.
   * @param {Buffer} buffer - Image/PDF buffer
   * @param {string} [language='hin+eng'] - Language hint
   * @returns {Promise<{ text: string, confidence: number, lines: Array<{ text: string, confidence: number }>, passesAttempted: number }>}
   */
  async extractText(buffer, language = 'hin+eng') {
    // Map combined hints
    const lang = language.includes('hin') ? 'hin+eng' : 'eng';

    // First pass with default PSM
    let bestResult = await this._runSinglePass(buffer, lang, PSM_MODES[0]);
    let passesAttempted = 1;

    // If confidence is below threshold, try remaining PSM modes
    if (bestResult.confidence < RETRY_CONFIDENCE_THRESHOLD) {
      logger.info(
        `Tesseract first pass confidence ${bestResult.confidence}% < ${RETRY_CONFIDENCE_THRESHOLD}% threshold — attempting multi-pass retry`
      );

      for (let i = 1; i < PSM_MODES.length; i++) {
        passesAttempted++;
        const result = await this._runSinglePass(buffer, lang, PSM_MODES[i]);

        if (result.confidence > bestResult.confidence) {
          logger.info(
            `PSM mode "${PSM_MODES[i].label}" yielded higher confidence: ${result.confidence}% vs ${bestResult.confidence}%`
          );
          bestResult = result;
        }

        // If we've reached a good enough confidence, stop trying
        if (bestResult.confidence >= RETRY_CONFIDENCE_THRESHOLD) {
          break;
        }
      }
    }

    logger.info(
      `Tesseract OCR complete: ${bestResult.confidence}% confidence after ${passesAttempted} pass(es)`
    );

    return {
      ...bestResult,
      passesAttempted,
    };
  }

  /**
   * Run a single Tesseract OCR pass with a specific PSM mode
   * @private
   */
  async _runSinglePass(buffer, lang, psmConfig) {
    let worker = null;
    try {
      logger.info(`Starting Tesseract OCR pass with language: ${lang}, mode: ${psmConfig.label}`);

      worker = await createWorker(lang);

      // Set the PSM mode via Tesseract parameters
      await worker.setParameters({
        tessedit_pageseg_mode: psmConfig.psm,
      });

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
      logger.error('Tesseract OCR error (mode: %s): %s', psmConfig.label, error.message);
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
