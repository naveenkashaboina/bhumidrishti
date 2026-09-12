const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');

let adminToken = '';
const testApiKey = 'bhd_sih2026_dilrmp_test_key_master';

beforeAll(async () => {
  await connectDB();

  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@bhumidrishti.gov.in', password: 'Admin@123' });
  adminToken = adminRes.body.data.accessToken;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Dashboard & Analytics Module (/api/v1/dashboard)', () => {
  test('GET /dashboard/summary - should return aggregated counts and accuracy metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalLandRecords).toBeGreaterThan(0);
    expect(res.body.data).toHaveProperty('averageAccuracyPercentage');
    expect(res.body.data).toHaveProperty('statusBreakdown');
  });

  test('GET /dashboard/by-region - should return district level breakdown', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/by-region?level=district')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /dashboard/error-stats - should return top corrected fields', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/error-stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('topCorrectedFields');
  });

  test('GET /gis/plots - should return standard GeoJSON FeatureCollection', async () => {
    const res = await request(app)
      .get('/api/v1/gis/plots?district=Pune')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.data.features)).toBe(true);
  });
});

describe('External Integration API (/api/v1/integration)', () => {
  test('GET /integration/records - should reject request without x-api-key header', async () => {
    const res = await request(app).get('/api/v1/integration/records');
    expect(res.status).toBe(401);
  });

  test('GET /integration/records - should succeed with valid x-api-key', async () => {
    const res = await request(app)
      .get('/api/v1/integration/records?limit=5')
      .set('x-api-key', testApiKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /integration/gis/plots - should return GeoJSON FeatureCollection via API key', async () => {
    const res = await request(app)
      .get('/api/v1/integration/gis/plots')
      .set('x-api-key', testApiKey);

    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('FeatureCollection');
  });
});
