const {
  LAND_CLASSIFICATIONS,
  AREA_UNITS,
  OWNERSHIP_TYPES,
} = require('../../config/constants');

/**
 * Dynamic confidence calculation helpers.
 *
 * Instead of returning hardcoded confidence constants per field, we compute
 * confidence dynamically from actual regex match quality:
 *   - matchRatio: proportion of the matched text relative to surrounding context
 *   - anchorBonus: bonus for presence of confirming anchor keywords
 *   - inputPenalty: penalty for very short input text
 *
 * This makes "confidence scoring" genuinely reflective of extraction quality.
 */

/**
 * Compute dynamic confidence for a regex match
 * @param {Object} params
 * @param {RegExpMatchArray|null} params.match - The regex match result
 * @param {string} params.inputText - The full input text
 * @param {string[]} [params.anchorWords=[]] - Additional anchor words that confirm context
 * @param {number} [params.baseConfidence=85] - Base confidence when match is found
 * @param {number} [params.noMatchConfidence=35] - Confidence when no match is found
 * @param {boolean} [params.hasHintFallback=false] - Whether metadata hints provided a fallback
 * @returns {number} Confidence score 0-100
 */
function computeMatchConfidence({
  match,
  inputText,
  anchorWords = [],
  baseConfidence = 85,
  noMatchConfidence = 35,
  hasHintFallback = false,
}) {
  const text = inputText || '';

  if (!match) {
    // No regex match — return hint-based or low confidence
    return hasHintFallback ? Math.min(70, noMatchConfidence + 30) : noMatchConfidence;
  }

  let confidence = baseConfidence;

  // 1. Match length ratio: longer captured groups relative to the full matched
  //    substring indicate higher quality extraction
  const captured = (match[1] || '').trim();
  const fullMatch = (match[0] || '').trim();
  if (fullMatch.length > 0 && captured.length > 0) {
    const ratio = captured.length / fullMatch.length;
    // Bonus for high capture ratio (field value is most of the match)
    if (ratio > 0.5) confidence += 3;
    // Penalty for very low ratio (too much noise in the match)
    if (ratio < 0.2) confidence -= 5;
  }

  // 2. Anchor word bonus: each confirmed anchor word adds confidence
  const lowerText = text.toLowerCase();
  let anchorHits = 0;
  for (const anchor of anchorWords) {
    if (lowerText.includes(anchor.toLowerCase())) {
      anchorHits++;
    }
  }
  // Each anchor hit adds 2 points, up to +8
  confidence += Math.min(8, anchorHits * 2);

  // 3. Input text length penalty: very short OCR text means less context
  //    to reliably extract fields from
  if (text.length < 50) {
    confidence -= 15;
  } else if (text.length < 200) {
    confidence -= 5;
  }

  // 4. Captured value sanity: very short captures are less reliable
  if (captured.length < 2) {
    confidence -= 10;
  }

  return Math.min(100, Math.max(0, Math.round(confidence)));
}


class RuleBasedNlpClassifier {
  /**
   * Classify raw extracted OCR text into structured land record fields with confidence scores
   * @param {string} rawText
   * @param {Object} [metadataHints={}] - Hints from source office or upload
   * @returns {{ structuredData: Object, confidence: { overall: number, fields: Object }, flaggedFields: string[] }}
   */
  static classify(rawText = '', metadataHints = {}) {
    const text = String(rawText || '');
    const fieldsConfidence = {};
    const flaggedFields = [];

    // Helper to record confidence and flag low-confidence fields
    const addConfidence = (field, score) => {
      fieldsConfidence[field] = Math.min(100, Math.max(0, Math.round(score)));
      if (fieldsConfidence[field] < 60) {
        flaggedFields.push(field);
      }
    };

    // 1. Survey Number
    let surveyNumber = '';
    const surveyRegex = /(?:survey\s*(?:no\.?|number|num)?|सर्वे\s*(?:नं\.?|संख्या|क्रमांक)?)\s*[:\-]?\s*([0-9]+(?:\/[0-9]+|[A-Za-z0-9\-_]+)?)/i;
    const surveyMatch = text.match(surveyRegex);
    if (surveyMatch) {
      surveyNumber = surveyMatch[1].trim();
      addConfidence('surveyNumber', computeMatchConfidence({
        match: surveyMatch,
        inputText: text,
        anchorWords: ['survey', 'सर्वे', 'संख्या', 'number'],
        baseConfidence: 85,
      }));
    } else {
      surveyNumber = metadataHints.surveyNumber || '';
      addConfidence('surveyNumber', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 35,
        hasHintFallback: !!surveyNumber,
      }));
    }

    // 2. Khasra Number
    let khasraNumber = '';
    const khasraRegex = /(?:khasra\s*(?:no\.?|number)?|खसरा\s*(?:नं\.?|संख्या|क्रमांक)?)\s*[:\-]?\s*([0-9]+(?:\/[0-9]+|[A-Za-z0-9\-_]+)?)/i;
    const khasraMatch = text.match(khasraRegex);
    if (khasraMatch) {
      khasraNumber = khasraMatch[1].trim();
      addConfidence('khasraNumber', computeMatchConfidence({
        match: khasraMatch,
        inputText: text,
        anchorWords: ['khasra', 'खसरा', 'संख्या'],
        baseConfidence: 83,
      }));
    } else {
      khasraNumber = surveyNumber || '';
      addConfidence('khasraNumber', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 40,
        hasHintFallback: !!khasraNumber,
      }));
    }

    // 3. Khata / Khatauni Number
    let khataNumber = '';
    const khataRegex = /(?:khata(?:uni)?\s*(?:no\.?|number)?|खाता(?:\s*खतौनी)?\s*(?:नं\.?|संख्या)?)\s*[:\-]?\s*([0-9]+(?:\/[0-9]+|[A-Za-z0-9\-_]+)?)/i;
    const khataMatch = text.match(khataRegex);
    if (khataMatch) {
      khataNumber = khataMatch[1].trim();
      addConfidence('khataNumber', computeMatchConfidence({
        match: khataMatch,
        inputText: text,
        anchorWords: ['khata', 'खाता', 'खतौनी'],
        baseConfidence: 83,
      }));
    } else {
      khataNumber = '';
      addConfidence('khataNumber', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 40,
      }));
    }

    // 4. Landowner Details
    const landownerDetails = [];
    const ownerRegex = /(?:land\s*owner|owner|holder|काश्तकार|खातेदार|भूमिस्वामी|मालिक|खाताधारक)\s*(?:का\s*नाम|name)?\s*[:\-]?\s*([A-Za-z\u0900-\u097F\s\.]+?)(?=(?:पिता|पति|son\s*of|w\/o|s\/o|guardian|क्षेत्रफल|रकबा|खसरा|$|\n))/i;
    const ownerMatch = text.match(ownerRegex);

    const guardianRegex = /(?:पिता|पति|son\s*of|w\/o|s\/o|c\/o|father|husband)\s*[:\-]?\s*([A-Za-z\u0900-\u097F\s\.]+?)(?=(?:पता|निवासी|जाति|रकबा|क्षेत्रफल|$|\n))/i;
    const guardianMatch = text.match(guardianRegex);

    if (ownerMatch && ownerMatch[1].trim().length > 2) {
      landownerDetails.push({
        name: ownerMatch[1].trim(),
        guardianName: guardianMatch ? guardianMatch[1].trim() : '',
        share: '1/1',
      });
      addConfidence('landownerDetails', computeMatchConfidence({
        match: ownerMatch,
        inputText: text,
        anchorWords: ['owner', 'काश्तकार', 'खातेदार', 'मालिक', 'नाम', 'name'],
        baseConfidence: 80,
      }));
    } else {
      // Fallback hint or generic placeholder
      const fallbackName = metadataHints.ownerName || 'Unknown Landowner';
      landownerDetails.push({
        name: fallbackName,
        guardianName: '',
        share: '1/1',
      });
      addConfidence('landownerDetails', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 45,
        hasHintFallback: !!metadataHints.ownerName,
      }));
    }

    // 5. Plot Area & Unit
    let plotArea = { value: 1.0, unit: 'acres' };
    const areaRegex = /(?:area|plot\s*area|क्षेत्रफल|रकबा)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(acres?|hectares?|bigha|sq_meters?|हेक्टेयर|एकड़|बीघा|वर्ग\s*मीटर)?/i;
    const areaMatch = text.match(areaRegex);

    if (areaMatch) {
      const val = parseFloat(areaMatch[1]);
      let unit = 'acres';
      const rawUnit = (areaMatch[2] || '').toLowerCase();
      if (rawUnit.includes('hec') || rawUnit.includes('हेक्टे')) unit = 'hectares';
      else if (rawUnit.includes('bigha') || rawUnit.includes('बीघा')) unit = 'bigha';
      else if (rawUnit.includes('sq') || rawUnit.includes('वर्ग')) unit = 'sq_meters';
      else if (rawUnit.includes('acre') || rawUnit.includes('एकड़')) unit = 'acres';

      plotArea = { value: val || 1.0, unit };
      addConfidence('plotArea', computeMatchConfidence({
        match: areaMatch,
        inputText: text,
        anchorWords: ['area', 'क्षेत्रफल', 'रकबा', 'plot'],
        baseConfidence: 84,
      }));
    } else {
      plotArea = {
        value: metadataHints.plotAreaValue ? Number(metadataHints.plotAreaValue) : 1.5,
        unit: metadataHints.plotAreaUnit || 'acres',
      };
      addConfidence('plotArea', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 50,
        hasHintFallback: !!metadataHints.plotAreaValue,
      }));
    }

    // 6. Location: Village, Tehsil, District, State
    const districtRegex = /(?:district|ज़िला|जिला)\s*[:\-]?\s*([A-Za-z\u0900-\u097F\s]+?)(?=[,\n\r;]|tehsil|तहसील|$)/i;
    const tehsilRegex = /(?:tehsil|taluka|तहसील|तालुका)\s*[:\-]?\s*([A-Za-z\u0900-\u097F\s]+?)(?=[,\n\r;]|village|गाँव|ग्राम|$)/i;
    const villageRegex = /(?:village|mauza|ग्राम|गाँव|मौजा)\s*[:\-]?\s*([A-Za-z\u0900-\u097F\s]+?)(?=[,\n\r;]|khasra|खसरा|$)/i;

    const districtMatch = text.match(districtRegex);
    const tehsilMatch = text.match(tehsilRegex);
    const villageMatch = text.match(villageRegex);

    const location = {
      state: metadataHints.state || 'Maharashtra',
      district: districtMatch ? districtMatch[1].trim() : metadataHints.district || 'Pune',
      tehsil: tehsilMatch ? tehsilMatch[1].trim() : metadataHints.tehsil || 'Haveli',
      village: villageMatch ? villageMatch[1].trim() : metadataHints.village || 'Wagholi',
    };

    addConfidence('location.district', computeMatchConfidence({
      match: districtMatch,
      inputText: text,
      anchorWords: ['district', 'जिला', 'ज़िला'],
      baseConfidence: 86,
      noMatchConfidence: 55,
      hasHintFallback: !!metadataHints.district,
    }));
    addConfidence('location.tehsil', computeMatchConfidence({
      match: tehsilMatch,
      inputText: text,
      anchorWords: ['tehsil', 'taluka', 'तहसील', 'तालुका'],
      baseConfidence: 83,
      noMatchConfidence: 50,
      hasHintFallback: !!metadataHints.tehsil,
    }));
    addConfidence('location.village', computeMatchConfidence({
      match: villageMatch,
      inputText: text,
      anchorWords: ['village', 'ग्राम', 'गाँव', 'मौजा'],
      baseConfidence: 83,
      noMatchConfidence: 50,
      hasHintFallback: !!metadataHints.village,
    }));

    // 7. Land Classification
    let landClassification = 'AGRICULTURAL_UNIRRIGATED';
    if (/सिंचित|irrigated|chahi/i.test(text)) {
      landClassification = 'AGRICULTURAL_IRRIGATED';
      addConfidence('landClassification', computeMatchConfidence({
        match: text.match(/सिंचित|irrigated|chahi/i),
        inputText: text,
        anchorWords: ['irrigated', 'सिंचित', 'chahi', 'नहरी'],
        baseConfidence: 83,
      }));
    } else if (/residential|आवासीय|बस्ती/i.test(text)) {
      landClassification = 'RESIDENTIAL';
      addConfidence('landClassification', computeMatchConfidence({
        match: text.match(/residential|आवासीय|बस्ती/i),
        inputText: text,
        anchorWords: ['residential', 'आवासीय'],
        baseConfidence: 83,
      }));
    } else if (/commercial|व्यावसायिक|बाजार/i.test(text)) {
      landClassification = 'COMMERCIAL';
      addConfidence('landClassification', computeMatchConfidence({
        match: text.match(/commercial|व्यावसायिक|बाजार/i),
        inputText: text,
        anchorWords: ['commercial', 'व्यावसायिक'],
        baseConfidence: 83,
      }));
    } else if (/forest|वन|जंगल/i.test(text)) {
      landClassification = 'FOREST';
      addConfidence('landClassification', computeMatchConfidence({
        match: text.match(/forest|वन|जंगल/i),
        inputText: text,
        anchorWords: ['forest', 'वन', 'जंगल', 'वनक्षेत्र'],
        baseConfidence: 88,
      }));
    } else {
      // Default — no classification keyword found
      addConfidence('landClassification', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 55,
      }));
    }

    // 8. Ownership Details
    let ownershipType = 'INDIVIDUAL';
    if (/joint|संयुक्त|साझा/i.test(text) || landownerDetails.length > 1) {
      ownershipType = 'JOINT';
      addConfidence('ownershipDetails', computeMatchConfidence({
        match: text.match(/joint|संयुक्त|साझा/i),
        inputText: text,
        anchorWords: ['joint', 'संयुक्त', 'साझा'],
        baseConfidence: 78,
      }));
    } else if (/government|शासन|सरकारी/i.test(text)) {
      ownershipType = 'GOVERNMENT';
      addConfidence('ownershipDetails', computeMatchConfidence({
        match: text.match(/government|शासन|सरकारी/i),
        inputText: text,
        anchorWords: ['government', 'शासन', 'सरकारी'],
        baseConfidence: 83,
      }));
    } else {
      addConfidence('ownershipDetails', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 65,
      }));
    }

    // 9. Mutation Records
    const mutationRecords = [];
    const mutationRegex = /(?:नामांतरण|दाखिल\s*खारिज|mutation)\s*(?:संख्या|no\.?)?\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i;
    const mutationMatch = text.match(mutationRegex);
    if (mutationMatch) {
      mutationRecords.push({
        mutationNumber: mutationMatch[1].trim(),
        date: new Date().toISOString().split('T')[0],
        type: 'TRANSFER',
        description: 'Extracted mutation record from scan',
      });
      addConfidence('mutationRecords', computeMatchConfidence({
        match: mutationMatch,
        inputText: text,
        anchorWords: ['mutation', 'नामांतरण', 'दाखिल', 'खारिज'],
        baseConfidence: 78,
      }));
    } else {
      addConfidence('mutationRecords', computeMatchConfidence({
        match: null,
        inputText: text,
        noMatchConfidence: 55,
      }));
    }

    // Overall confidence calculation
    const scores = Object.values(fieldsConfidence);
    const overall = scores.length
      ? Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length)
      : 0;

    return {
      structuredData: {
        surveyNumber,
        khasraNumber,
        khataNumber,
        landownerDetails,
        plotArea,
        location,
        landClassification,
        ownershipDetails: { type: ownershipType, remarks: 'Automated extraction' },
        mutationRecords,
        registrationInfo: {
          registrationNumber: '',
          date: '',
          registrar: '',
        },
      },
      confidence: {
        overall,
        fields: fieldsConfidence,
      },
      flaggedFields: [...new Set(flaggedFields)],
    };
  }
}

module.exports = RuleBasedNlpClassifier;
