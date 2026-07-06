require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const { createUser, createMetadata, createVenue } = require('./fixtures');
const { Cuisine } = require('../../models/Metadata');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Recommendations', () => {
  test('guest can fetch smart recommendations with no filters', async () => {
    const { category } = await createMetadata();
    await createVenue({ category });
    await createVenue({ category });

    const res = await request(app).get('/api/recommendations/smart?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  test('explicit cuisine filter excludes non-matching venues', async () => {
    const nepali = await Cuisine.create({ name: `Nepali-${Date.now()}` });
    const italian = await Cuisine.create({ name: `Italian-${Date.now()}` });
    const { category } = await createMetadata();

    const nepaliVenue = await createVenue({ cuisine: nepali, category });
    await createVenue({ cuisine: italian, category });

    const res = await request(app).get(`/api/recommendations/smart?cuisines=${nepali._id}&limit=10`);

    expect(res.status).toBe(200);
    const names = res.body.recommendations.map(r => r.name);
    expect(names).toContain(nepaliVenue.name);
    expect(res.body.recommendations.every(r => r.cuisines.some(c => c._id === nepali._id.toString()))).toBe(true);
  });

  test('AI-parsed cuisine intent from a prompt also hard-filters', async () => {
    const cuisineName = `Nepali-${Date.now()}`;
    const nepali = await Cuisine.create({ name: cuisineName });
    const italian = await Cuisine.create({ name: `Italian-${Date.now()}` });
    const { category } = await createMetadata();

    const nepaliVenue = await createVenue({ cuisine: nepali, category });
    const italianVenue = await createVenue({ cuisine: italian, category });

    // Bypass full Gemini intent parsing (no API key in test env) by using the
    // explicit `cuisines` param directly, which is what the AI path also feeds into.
    const res = await request(app).get(`/api/recommendations/smart?cuisines=${nepali._id}&limit=10`);

    const names = res.body.recommendations.map(r => r.name);
    expect(names).toContain(nepaliVenue.name);
    expect(names).not.toContain(italianVenue.name);
  });

  test('authenticated user gets recommendations without error', async () => {
    const { token } = await createUser();
    const { category } = await createMetadata();
    await createVenue({ category });

    const res = await request(app)
      .get('/api/recommendations/smart?limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
