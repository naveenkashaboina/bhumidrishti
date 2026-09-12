const crypto = require('crypto');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Document = require('../src/models/Document');
const LandRecord = require('../src/models/LandRecord');
const VerificationTask = require('../src/models/VerificationTask');
const Feedback = require('../src/models/Feedback');
const AuditLog = require('../src/models/AuditLog');
const ApiClient = require('../src/models/ApiClient');
const SystemConfig = require('../src/models/SystemConfig');
const logger = require('../src/utils/logger');
const {
  ROLES,
  RECORD_STATUS,
  TASK_STATUS,
  TASK_PRIORITY,
  LAND_CLASSIFICATIONS,
  AREA_UNITS,
  OWNERSHIP_TYPES,
  AUDIT_ACTIONS,
} = require('../src/config/constants');

const seed = async () => {
  try {
    logger.info('Connecting to MongoDB for database seeding...');
    await connectDB();

    logger.info('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Document.deleteMany({}),
      LandRecord.deleteMany({}),
      VerificationTask.deleteMany({}),
      Feedback.deleteMany({}),
      AuditLog.deleteMany({}),
      ApiClient.deleteMany({}),
      SystemConfig.deleteMany({}),
    ]);

    // 1. Seed System Configs
    logger.info('Seeding System Configurations...');
    await SystemConfig.insertMany([
      { key: 'confidenceThresholdOverall', value: 80, description: 'Overall extraction confidence threshold %' },
      { key: 'confidenceThresholdField', value: 60, description: 'Per-field extraction confidence threshold %' },
      { key: 'activeLanguages', value: ['hin', 'eng', 'mar', 'tel', 'ben'], description: 'Active Indic OCR language packs' },
      { key: 'autoValidationAllowed', value: false, description: 'Permit auto-validation without human review' },
    ]);

    // 2. Seed Users across all 5 roles
    logger.info('Seeding Users for all roles...');
    const usersData = [
      {
        name: 'Rajesh Sharma (Super Admin)',
        email: 'admin@bhumidrishti.gov.in',
        passwordHash: 'Admin@123',
        role: ROLES.SUPER_ADMIN,
        jurisdiction: { state: 'All', district: 'All' },
      },
      {
        name: 'Dr. Anita Deshmukh (State Admin)',
        email: 'stateadmin@bhumidrishti.gov.in',
        passwordHash: 'StateAdmin@123',
        role: ROLES.STATE_ADMIN,
        jurisdiction: { state: 'Maharashtra', district: 'All' },
      },
      {
        name: 'Vikram Joshi (District Officer)',
        email: 'district.pune@bhumidrishti.gov.in',
        passwordHash: 'District@123',
        role: ROLES.DISTRICT_OFFICER,
        jurisdiction: { state: 'Maharashtra', district: 'Pune' },
      },
      {
        name: 'Patwari Sanjay Gaikwad (Verifier)',
        email: 'verifier.pune@bhumidrishti.gov.in',
        passwordHash: 'Verifier@123',
        role: ROLES.VERIFIER,
        jurisdiction: { state: 'Maharashtra', district: 'Pune', tehsil: 'Haveli' },
      },
      {
        name: 'Kavita Shinde (DEO)',
        email: 'deo.pune@bhumidrishti.gov.in',
        passwordHash: 'Deo@123',
        role: ROLES.DEO,
        jurisdiction: { state: 'Maharashtra', district: 'Pune', tehsil: 'Haveli', village: 'Wagholi' },
      },
      {
        name: 'Revenue Inspector Amit Mishra',
        email: 'verifier.varanasi@bhumidrishti.gov.in',
        passwordHash: 'Verifier@123',
        role: ROLES.VERIFIER,
        jurisdiction: { state: 'Uttar Pradesh', district: 'Varanasi', tehsil: 'Sadar' },
      },
    ];

    const seededUsers = await User.create(usersData);
    const superAdmin = seededUsers[0];
    const verifierPune = seededUsers[3];
    const deoPune = seededUsers[4];
    const verifierVaranasi = seededUsers[5];

    // 3. Seed API Client
    logger.info('Seeding External API Client...');
    const rawApiKey = 'bhd_sih2026_dilrmp_test_key_master';
    const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
    await ApiClient.create({
      clientName: 'DILRMP Central Integration Gateway (MoRD)',
      apiKeyHash,
      apiKeyPrefix: rawApiKey.substring(0, 8),
      scopes: ['read:records', 'read:dashboard', 'read:pii', 'read:gis'],
      allowedRegions: ['*'],
      isActive: true,
    });

    // 4. Seed Documents & 70 Realistic Land Records
    logger.info('Seeding 70 realistic Land Records across 3 states...');

    const regions = [
      {
        state: 'Maharashtra',
        district: 'Pune',
        tehsils: ['Haveli', 'Baramati', 'Shirur', 'Mulshi'],
        villages: ['Wagholi', 'Hadapsar', 'Loni Kalbhor', 'Saswad', 'Pirangut', 'Kharadi'],
        baseLng: 73.85,
        baseLat: 18.52,
        owners: [
          'Rameshwar Tukaram Patil',
          'दिनेश विठ्ठल भोसले',
          'Sunita Suresh Kulkarni',
          'आनंदराव दत्तात्रेय शिंदे',
          'Prakash Jagannath More',
          'शोभा महादेव जाधव',
          'Vilas Baburao Jagtap',
          'गणेश शांताराम पवार',
        ],
      },
      {
        state: 'Uttar Pradesh',
        district: 'Varanasi',
        tehsils: ['Sadar', 'Pindra', 'Rohaniya'],
        villages: ['Shivpur', 'Sarnath', 'Chunar', 'Ramnagar', 'Cholapur', 'Lohta'],
        baseLng: 82.97,
        baseLat: 25.31,
        owners: [
          'सुरेश कुमार यादव',
          'Harish Chandra Chaubey',
          'विमलेश कुमार त्रिपाठी',
          'Mohd. Arshad Khan',
          'कमलेश नाथ तिवारी',
          'Pradeep Kumar Gupta',
          'सीताराम बिंद',
          'Geeta Devi Maurya',
        ],
      },
      {
        state: 'Rajasthan',
        district: 'Jaipur',
        tehsils: ['Sanganer', 'Amer', 'Chomu', 'Bassi'],
        villages: ['Bagru', 'Kukas', 'Bassi', 'Achrol', 'Jatwara', 'Renwal'],
        baseLng: 75.78,
        baseLat: 26.91,
        owners: [
          'Rajendra Singh Rathore',
          'महेन्द्र कुमार मीणा',
          'Gopal Lal Sharma',
          'कैलाश चन्द कुमावत',
          'Bhawani Singh Shekhawat',
          'मंजू देवी चौधरी',
          'Suraj Mal Gurjar',
          'राजेन्द्र प्रसाद जाट',
        ],
      },
    ];

    const recordsToCreate = [];
    const tasksToCreate = [];
    const feedbackToCreate = [];
    const auditLogsToCreate = [];

    let counter = 1;

    for (let rIdx = 0; rIdx < regions.length; rIdx++) {
      const reg = regions[rIdx];
      const recordsPerRegion = rIdx === 0 ? 30 : 20; // 30 in Pune, 20 in Varanasi, 20 in Jaipur = 70 total

      for (let i = 0; i < recordsPerRegion; i++) {
        const tehsil = reg.tehsils[i % reg.tehsils.length];
        const village = reg.villages[i % reg.villages.length];
        const ownerName = reg.owners[i % reg.owners.length];
        const surveyNo = `${100 + counter}/${(i % 4) + 1}`;
        const khasraNo = `${400 + counter}`;
        const khataNo = `${20 + (counter % 50)}`;

        // Determine status distribution:
        // ~45% PUBLISHED, ~25% VALIDATED, ~20% NEEDS_VERIFICATION, ~7% PENDING_APPROVAL, ~3% EXTRACTED
        let status = RECORD_STATUS.PUBLISHED;
        let overallConf = 92;
        if (i % 5 === 0) {
          status = RECORD_STATUS.NEEDS_VERIFICATION;
          overallConf = 58;
        } else if (i % 4 === 0) {
          status = RECORD_STATUS.VALIDATED;
          overallConf = 88;
        } else if (i % 12 === 0) {
          status = RECORD_STATUS.PENDING_APPROVAL;
          overallConf = 84;
        }

        const areaVal = parseFloat((0.5 + (counter % 8) * 0.75).toFixed(2));
        const unit = reg.state === 'Rajasthan' ? 'bigha' : 'acres';

        // Polygon boundary
        const lngOffset = (i * 0.008) - 0.05;
        const latOffset = ((counter % 6) * 0.006) - 0.03;
        const cLng = reg.baseLng + lngOffset;
        const cLat = reg.baseLat + latOffset;
        const d = 0.0025;

        const geoPolygon = {
          type: 'Polygon',
          coordinates: [
            [
              [cLng, cLat],
              [cLng + d, cLat],
              [cLng + d, cLat + d],
              [cLng, cLat + d],
              [cLng, cLat],
            ],
          ],
        };

        const flaggedFields = [];
        if (status === RECORD_STATUS.NEEDS_VERIFICATION) {
          flaggedFields.push('khasraNumber');
          if (overallConf < 60) flaggedFields.push('plotArea');
        }

        // Create sample document
        const sampleDoc = await Document.create({
          originalFileName: `Register_${reg.district}_${surveyNo.replace('/', '_')}.pdf`,
          storageKey: `sample_scan_${counter}.pdf`,
          storageUrl: `/api/v1/documents/file/sample_scan_${counter}.pdf`,
          mimeType: 'application/pdf',
          fileSizeBytes: 1024 * (150 + counter * 5),
          uploadedBy: deoPune._id,
          sourceOffice: {
            state: reg.state,
            district: reg.district,
            tehsil,
            village,
          },
          status: 'PROCESSED',
          languageHint: 'hin+eng',
        });

        const verifiedBy = status === RECORD_STATUS.PUBLISHED || status === RECORD_STATUS.VALIDATED
          ? (reg.district === 'Varanasi' ? verifierVaranasi._id : verifierPune._id)
          : null;

        const record = await LandRecord.create({
          documentId: sampleDoc._id,
          landownerDetails: [
            {
              name: ownerName,
              guardianName: `${ownerName.split(' ')[0]} Senior`,
              share: '1/1',
            },
          ],
          surveyNumber: surveyNo,
          khasraNumber: khasraNo,
          khataNumber: khataNo,
          plotArea: { value: areaVal, unit },
          location: {
            state: reg.state,
            district: reg.district,
            tehsil,
            village,
            geo: geoPolygon,
          },
          landClassification: LAND_CLASSIFICATIONS[counter % LAND_CLASSIFICATIONS.length],
          ownershipDetails: {
            type: OWNERSHIP_TYPES[counter % OWNERSHIP_TYPES.length],
            remarks: 'Verified cadastral survey entry',
          },
          mutationRecords: [
            {
              mutationNumber: `MUT-${reg.district.substring(0, 3).toUpperCase()}-${1000 + counter}`,
              date: '2025-06-15',
              type: 'INHERITANCE',
              description: 'Mutation entered per legal register',
            },
          ],
          registrationInfo: {
            registrationNumber: `REG-${2024}-${3000 + counter}`,
            date: '2024-03-20',
            registrar: `Sub-Registrar ${tehsil}`,
          },
          status,
          confidence: {
            overall: overallConf,
            fields: {
              surveyNumber: overallConf,
              khasraNumber: status === RECORD_STATUS.NEEDS_VERIFICATION ? 48 : overallConf,
              plotArea: overallConf > 70 ? 90 : 55,
              landownerDetails: 88,
              location: 94,
            },
          },
          flaggedFields,
          crossCheck: {
            lrms: { status: 'MATCHED', checkedAt: new Date(), referenceId: `LRMS-${surveyNo}` },
            dilrmp: { status: 'MATCHED', checkedAt: new Date(), referenceId: `ULPIN-${counter}` },
          },
          verifiedBy,
          verifiedAt: verifiedBy ? new Date() : null,
          version: 1,
        });

        // Verification Task if needed
        if (status === RECORD_STATUS.NEEDS_VERIFICATION) {
          await VerificationTask.create({
            landRecordId: record._id,
            priority: counter % 3 === 0 ? TASK_PRIORITY.HIGH : TASK_PRIORITY.MEDIUM,
            slaDueAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
            status: TASK_STATUS.OPEN,
            notes: `Flagged fields: ${flaggedFields.join(', ')}`,
          });
        }

        // Add Feedback correction for learning loop demo on verified records
        if (status === RECORD_STATUS.PUBLISHED && counter % 4 === 0) {
          await Feedback.create({
            landRecordId: record._id,
            fieldName: 'khasraNumber',
            originalValue: `${400 + counter - 10}`,
            correctedValue: khasraNo,
            originalConfidence: 54,
            correctedBy: verifierPune._id,
            createdAt: new Date(Date.now() - counter * 3600000),
          });
        }

        // Audit Log
        await AuditLog.create({
          entityType: 'landRecord',
          entityId: record._id,
          action: status === RECORD_STATUS.PUBLISHED ? AUDIT_ACTIONS.PUBLISH : AUDIT_ACTIONS.CREATE,
          performedBy: verifiedBy || deoPune._id,
          diff: { status, surveyNumber: surveyNo, confidence: overallConf },
          timestamp: new Date(Date.now() - (70 - counter) * 4 * 3600000),
        });

        counter++;
      }
    }

    logger.info('Seeding completed successfully!');
    logger.info('===========================================================');
    logger.info('Credentials for Demo:');
    logger.info('  Super Admin:      admin@bhumidrishti.gov.in / Admin@123');
    logger.info('  State Admin:      stateadmin@bhumidrishti.gov.in / StateAdmin@123');
    logger.info('  District Officer: district.pune@bhumidrishti.gov.in / District@123');
    logger.info('  Verifier:         verifier.pune@bhumidrishti.gov.in / Verifier@123');
    logger.info('  DEO:              deo.pune@bhumidrishti.gov.in / Deo@123');
    logger.info(`  API Key:          ${rawApiKey}`);
    logger.info('===========================================================');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed: %s', error.message, { stack: error.stack });
    await disconnectDB();
    process.exit(1);
  }
};

seed();
