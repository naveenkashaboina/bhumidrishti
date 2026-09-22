const ExternalRegistryInterface = require('./externalRegistryInterface');

/**
 * Live External Registry Adapter (Stub)
 *
 * This adapter is intended to make real HTTP calls to state LRMS portals
 * and the central DILRMP API. It is NOT yet implemented — both methods
 * throw a clear error directing the operator to use mock mode until
 * real API credentials and endpoints are configured.
 *
 * To activate: set environment variable EXTERNAL_REGISTRY_MODE=live
 * (Only do this once real LRMS/DILRMP API integration is complete.)
 */
class LiveExternalRegistry extends ExternalRegistryInterface {
  /**
   * @inheritdoc
   */
  static async checkLrms(record) {
    throw new Error(
      'NotImplementedError: Live LRMS integration is not yet configured. ' +
      'Set EXTERNAL_REGISTRY_MODE=mock to use deterministic simulated checks, ' +
      'or implement this method with real LRMS API credentials and endpoints.'
    );
  }

  /**
   * @inheritdoc
   */
  static async checkDilrmp(record) {
    throw new Error(
      'NotImplementedError: Live DILRMP integration is not yet configured. ' +
      'Set EXTERNAL_REGISTRY_MODE=mock to use deterministic simulated checks, ' +
      'or implement this method with real DILRMP API credentials and endpoints.'
    );
  }
}

module.exports = LiveExternalRegistry;
