const {
  LAND_CLASSIFICATIONS,
  AREA_UNITS,
  OWNERSHIP_TYPES,
} = require('../../config/constants');

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

    // Helper to calculate confidence based on regex match quality
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
      addConfidence('surveyNumber', 88);
    } else {
      surveyNumber = metadataHints.surveyNumber || '';
      addConfidence('surveyNumber', surveyNumber ? 70 : 35);
    }

    // 2. Khasra Number
    let khasraNumber = '';
    const khasraRegex = /(?:khasra\s*(?:no\.?|number)?|खसरा\s*(?:नं\.?|संख्या|क्रमांक)?)\s*[:\-]?\s*([0-9]+(?:\/[0-9]+|[A-Za-z0-9\-_]+)?)/i;
    const khasraMatch = text.match(khasraRegex);
    if (khasraMatch) {
      khasraNumber = khasraMatch[1].trim();
      addConfidence('khasraNumber', 85);
    } else {
      khasraNumber = surveyNumber || '';
      addConfidence('khasraNumber', khasraNumber ? 65 : 40);
    }

    // 3. Khata / Khatauni Number
    let khataNumber = '';
    const khataRegex = /(?:khata(?:uni)?\s*(?:no\.?|number)?|खाता(?:\s*खतौनी)?\s*(?:नं\.?|संख्या)?)\s*[:\-]?\s*([0-9]+(?:\/[0-9]+|[A-Za-z0-9\-_]+)?)/i;
    const khataMatch = text.match(khataRegex);
    if (khataMatch) {
      khataNumber = khataMatch[1].trim();
      addConfidence('khataNumber', 85);
    } else {
      khataNumber = '';
      addConfidence('khataNumber', 40);
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
      addConfidence('landownerDetails', 82);
    } else {
      // Fallback hint or generic placeholder
      const fallbackName = metadataHints.ownerName || 'Unknown Landowner';
      landownerDetails.push({
        name: fallbackName,
        guardianName: '',
        share: '1/1',
      });
      addConfidence('landownerDetails', metadataHints.ownerName ? 70 : 45);
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
      addConfidence('plotArea', 86);
    } else {
      plotArea = {
        value: metadataHints.plotAreaValue ? Number(metadataHints.plotAreaValue) : 1.5,
        unit: metadataHints.plotAreaUnit || 'acres',
      };
      addConfidence('plotArea', metadataHints.plotAreaValue ? 75 : 50);
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

    addConfidence('location.district', districtMatch ? 88 : metadataHints.district ? 75 : 55);
    addConfidence('location.tehsil', tehsilMatch ? 85 : metadataHints.tehsil ? 75 : 50);
    addConfidence('location.village', villageMatch ? 85 : metadataHints.village ? 75 : 50);

    // 7. Land Classification
    let landClassification = 'AGRICULTURAL_UNIRRIGATED';
    if (/सिंचित|irrigated|chahi/i.test(text)) {
      landClassification = 'AGRICULTURAL_IRRIGATED';
      addConfidence('landClassification', 85);
    } else if (/residential|आवासीय|बस्ती/i.test(text)) {
      landClassification = 'RESIDENTIAL';
      addConfidence('landClassification', 85);
    } else if (/commercial|व्यावसायिक|बाजार/i.test(text)) {
      landClassification = 'COMMERCIAL';
      addConfidence('landClassification', 85);
    } else if (/forest|वन|जंगल/i.test(text)) {
      landClassification = 'FOREST';
      addConfidence('landClassification', 90);
    } else {
      addConfidence('landClassification', 65);
    }

    // 8. Ownership Details
    let ownershipType = 'INDIVIDUAL';
    if (/joint|संयुक्त|साझा/i.test(text) || landownerDetails.length > 1) {
      ownershipType = 'JOINT';
      addConfidence('ownershipDetails', 80);
    } else if (/government|शासन|सरकारी/i.test(text)) {
      ownershipType = 'GOVERNMENT';
      addConfidence('ownershipDetails', 85);
    } else {
      addConfidence('ownershipDetails', 75);
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
      addConfidence('mutationRecords', 80);
    } else {
      addConfidence('mutationRecords', 60);
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
