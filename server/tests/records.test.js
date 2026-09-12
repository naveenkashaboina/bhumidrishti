const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const LandRecord = require('../src/models/LandRecord');
const Feedback = require('../src/models/Feedback');

let adminToken = '';
let verifierToken = '';

beforeAll(async () => {
  await connectDB();

  // Login Super Admin
  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@bhumidrishti.gov.in', password: 'Admin@123' });
  adminToken = adminRes.body.data.accessToken;

  // Login Verifier
  const verifierRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'verifier.pune@bhumidrishti.gov.in', password: 'Verifier@123' });
  verifierToken = verifierRes.body.data.accessToken;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Land Records & Verification Module (/api/v1/records)', () => {
  let testRecord = null;

  test('GET /records - should retrieve paginated land records', async () => {
    const res = await request(app)
      .get('/api/v1/records?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    testRecord = res.body.data[0];
  });

  test('GET /records/:id - should retrieve full record details', async () => {
    const res = await request(app)
      .get(`/api/v1/records/${testRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(testRecord._id);
    expect(res.body.data.surveyNumber).toBeDefined();
  });

  test('PATCH /records/:id - should reject with 409 Conflict when version is stale', async () => {
    const staleVersion = testRecord.version + 999;
    const res = await request(app)
      .patch(`/api/v1/records/${testRecord._id}`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        version: staleVersion,
        surveyNumber: '999/CONFLICT',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('PATCH /records/:id - should update field, increment version, and log feedback for AI learning', async () => {
    const originalRecord = await LandRecord.findById(testRecord._id);
    const validVersion = originalRecord.version;
    const newSurvey = `TEST-${Date.now().toString().slice(-4)}`;

    const res = await request(app)
      .patch(`/api/v1/records/${testRecord._id}`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        version: validVersion,
        surveyNumber: newSurvey,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.record.version).toBe(validVersion + 1);
    expect(res.body.data.record.surveyNumber).toBe(newSurvey);

    // Verify feedback loop entry was created
    const feedback = await Feedback.findOne({
      landRecordId: testRecord._id,
      fieldName: 'surveyNumber',
    }).sort({ createdAt: -1 });

    expect(feedback).not.toBeNull();
    expect(feedback.correctedValue).toBe(newSurvey);
  });

  test('POST /records/:id/approve - should validate record', async () => {
    const rec = await LandRecord.findOne({ status: 'NEEDS_VERIFICATION' });
    if (rec) {
      const res = await request(app)
        .post(`/api/v1/records/${rec._id}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('VALIDATED');
    }
  });

  test('GET /records/:id/duplicates - should evaluate duplicate status', async () => {
    const res = await request(app)
      .get(`/api/v1/records/${testRecord._id}/duplicates`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('isDuplicate');
  });

  test('GET /records/:id/audit - should retrieve audit trail', async () => {
    const res = await request(app)
      .get(`/api/v1/records/${testRecord._id}/audit`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
