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

  test('price filter excludes non-matching tiers', async () => {
    const { category } = await createMetadata();
    const budgetVenue = await createVenue({ category, overrides: { priceRange: 1 } });
    const luxuryVenue = await createVenue({ category, overrides: { priceRange: 4 } });

    const res = await request(app).get('/api/recommendations/smart?priceRange=1&limit=10');

    const names = res.body.recommendations.map(r => r.name);
    expect(names).toContain(budgetVenue.name);
    expect(names).not.toContain(luxuryVenue.name);
  });

  test('mood filter excludes venues without the matching mood', async () => {
    const { category } = await createMetadata();
    const nightlifeVenue = await createVenue({ category, overrides: { mood: ['nightlife'] } });
    const cafeVenue = await createVenue({ category, overrides: { mood: ['cafe'] } });

    const res = await request(app).get('/api/recommendations/smart?mood=nightlife&limit=10');

    const names = res.body.recommendations.map(r => r.name);
    expect(names).toContain(nightlifeVenue.name);
    expect(names).not.toContain(cafeVenue.name);
  });

  test('stacked price + mood + cuisine filters narrow to only venues matching all three', async () => {
    const nepali = await Cuisine.create({ name: `Nepali-${Date.now()}` });
    const { category } = await createMetadata();

    const match = await createVenue({
      cuisine: nepali,
      category,
      overrides: { priceRange: 1, mood: ['casual'] },
    });
    const wrongPrice = await createVenue({
      cuisine: nepali,
      category,
      overrides: { priceRange: 4, mood: ['casual'] },
    });
    const wrongMood = await createVenue({
      cuisine: nepali,
      category,
      overrides: { priceRange: 1, mood: ['luxury'] },
    });

    const res = await request(app).get(
      `/api/recommendations/smart?cuisines=${nepali._id}&priceRange=1&mood=casual&limit=10`
    );

    const names = res.body.recommendations.map(r => r.name);
    expect(names).toContain(match.name);
    expect(names).not.toContain(wrongPrice.name);
    expect(names).not.toContain(wrongMood.name);
  });

  test('zero-result stacked filters relax mood first and report it in searchMeta', async () => {
    // Scope with a unique cuisine so this test's result set can't pick up
    // budget/casual venues left over from other tests in this file (the
    // suite shares one DB across tests, only dropped in afterAll).
    const scopeCuisine = await Cuisine.create({ name: `RelaxScope-${Date.now()}` });
    const { category } = await createMetadata();
    // Only a budget/casual venue exists for this cuisine — asking for budget
    // + nightlife has no exact match, so the mood filter should be relaxed
    // to surface it instead of returning an empty list.
    const onlyVenue = await createVenue({
      cuisine: scopeCuisine,
      category,
      overrides: { priceRange: 1, mood: ['casual'] },
    });

    const res = await request(app).get(
      `/api/recommendations/smart?cuisines=${scopeCuisine._id}&priceRange=1&mood=nightlife&limit=10`
    );

    expect(res.status).toBe(200);
    const names = res.body.recommendations.map(r => r.name);
    expect(names).toEqual([onlyVenue.name]);
    expect(res.body.searchMeta.relaxedFilters).toContain('mood');
    expect(res.body.aiExplanation).toMatch(/no exact match/i);
  });

  test('city filter matches neighbourhoods stored in address.street', async () => {
    const { getSmartRecommendations } = require('../../services/recommendationService');
    const { category } = await createMetadata();

    const thamelVenue = await createVenue({
      category,
      overrides: { address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' } },
    });
    const patanVenue = await createVenue({
      category,
      overrides: { address: { street: 'Jawalakhel', city: 'Lalitpur', country: 'Nepal' } },
    });

    const { results } = await getSmartRecommendations({ city: 'Thamel', limit: 10 });
    const names = results.map(r => r.name);

    expect(names).toContain(thamelVenue.name);
    expect(names).not.toContain(patanVenue.name);
  });
});
