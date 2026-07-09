require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const { createSuperadmin } = require('./fixtures');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Metadata', () => {
  test('public can list cuisines, tags, categories', async () => {
    const cuisinesRes = await request(app).get('/api/metadata/cuisines');
    const tagsRes = await request(app).get('/api/metadata/tags');
    const categoriesRes = await request(app).get('/api/metadata/categories');

    expect(cuisinesRes.status).toBe(200);
    expect(tagsRes.status).toBe(200);
    expect(categoriesRes.status).toBe(200);
  });

  test('admin can create a cuisine', async () => {
    const { token } = await createSuperadmin();

    const res = await request(app)
      .post('/api/metadata/cuisines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `E2E Created Cuisine ${Date.now()}` });

    expect(res.status).toBe(201);
    expect(res.body.cuisine.name).toContain('E2E Created Cuisine');
  });

  test('unauthenticated cuisine creation is rejected', async () => {
    const res = await request(app).post('/api/metadata/cuisines').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });

  test('admin can create a tag', async () => {
    const { token } = await createSuperadmin();

    const res = await request(app)
      .post('/api/metadata/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `E2E Tag ${Date.now()}`, category: 'ambience' });

    expect(res.status).toBe(201);
  });

  test('admin can create a category', async () => {
    const { token } = await createSuperadmin();

    const res = await request(app)
      .post('/api/metadata/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `E2E Category ${Date.now()}` });

    expect(res.status).toBe(201);
  });
});
