const LandRecord = require('../models/LandRecord');

class DuplicateDetectionService {
  /**
   * Compute normalized Levenshtein similarity between 0 and 1
   */
  static similarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    if (str1 === str2) return 1.0;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, 1 - distance / maxLen);
  }

  /**
   * Check for duplicate records in the database
   * @param {Object} candidate - Record to check
   * @param {string} [excludeId] - ID of current record if updating
   * @returns {Promise<{ isDuplicate: boolean, duplicateOf: Object|null, matchType: string|null, similarityScore: number, message: string|null }>}
   */
  static async checkDuplicates(candidate, excludeId = null) {
    const { surveyNumber, location, landownerDetails } = candidate;
    if (!surveyNumber || !location?.district || !location?.tehsil || !location?.village) {
      return { isDuplicate: false, duplicateOf: null, matchType: null, similarityScore: 0, message: null };
    }

    const query = {
      'location.district': new RegExp(`^${location.district.trim()}$`, 'i'),
      'location.tehsil': new RegExp(`^${location.tehsil.trim()}$`, 'i'),
      'location.village': new RegExp(`^${location.village.trim()}$`, 'i'),
      surveyNumber: String(surveyNumber).trim(),
      status: { $ne: 'ARCHIVED' },
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingExact = await LandRecord.findOne(query).lean();
    if (existingExact) {
      // Compare landowner names for higher diagnostic accuracy
      const candidateOwner = landownerDetails?.[0]?.name || '';
      const existingOwner = existingExact.landownerDetails?.[0]?.name || '';
      const nameSim = this.similarity(candidateOwner, existingOwner);

      return {
        isDuplicate: true,
        duplicateOf: existingExact,
        matchType: 'EXACT_COMPOSITE_KEY',
        similarityScore: nameSim,
        message: `Exact composite key match found (Survey No: ${surveyNumber}, Village: ${location.village}). Landowner name similarity: ${(nameSim * 100).toFixed(1)}%`,
      };
    }

    // Secondary check: Same village + high fuzzy name match on landowner + similar plot area
    if (landownerDetails?.[0]?.name) {
      const candidateName = landownerDetails[0].name.trim();
      const villageRecords = await LandRecord.find({
        'location.district': new RegExp(`^${location.district.trim()}$`, 'i'),
        'location.village': new RegExp(`^${location.village.trim()}$`, 'i'),
        status: { $ne: 'ARCHIVED' },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
        .limit(25)
        .lean();

      for (const rec of villageRecords) {
        const existingName = rec.landownerDetails?.[0]?.name || '';
        const sim = this.similarity(candidateName, existingName);
        if (sim >= 0.85) {
          return {
            isDuplicate: true,
            duplicateOf: rec,
            matchType: 'FUZZY_NAME_PROXIMITY',
            similarityScore: sim,
            message: `High landowner name similarity (${(sim * 100).toFixed(1)}%) in village ${location.village} with Survey No: ${rec.surveyNumber}`,
          };
        }
      }
    }

    return {
      isDuplicate: false,
      duplicateOf: null,
      matchType: null,
      similarityScore: 0,
      message: null,
    };
  }
}

module.exports = DuplicateDetectionService;
