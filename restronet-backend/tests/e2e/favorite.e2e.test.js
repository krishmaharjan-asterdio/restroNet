require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const { createUser, createMetadata, createVenue } = require('./fixtures');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Favorites', () => {
  test('user can favorite a venue and see it in their list', async () => {
    const { token } = await createUser();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const toggleRes = await request(app)
      .post(`/api/favorites/${venue._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.favorited).toBe(true);

    const listRes = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.favorites.length).toBe(1);
    expect(listRes.body.favorites[0]._id).toBe(venue._id.toString());
  });

  test('toggling favorite twice removes it', async () => {
    const { token } = await createUser();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    await request(app).post(`/api/favorites/${venue._id}`).set('Authorization', `Bearer ${token}`);
    const secondToggle = await request(app)
      .post(`/api/favorites/${venue._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(secondToggle.body.favorited).toBe(false);

    const listRes = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.body.favorites.length).toBe(0);
  });

  test('unauthenticated favorite toggle is rejected', async () => {
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app).post(`/api/favorites/${venue._id}`);
    expect(res.status).toBe(401);
  });
});
