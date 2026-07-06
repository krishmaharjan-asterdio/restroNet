require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const { createSuperadmin, createOwner, createMetadata, createVenue } = require('./fixtures');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Venue CRUD', () => {
  test('public GET /api/venues returns paginated list', async () => {
    const { cuisine, category } = await createMetadata();
    await createVenue({ cuisine, category });

    const res = await request(app).get('/api/venues');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.docs)).toBe(true);
  });

  test('superadmin can create a venue', async () => {
    const { token } = await createSuperadmin();
    const { category } = await createMetadata();

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Superadmin Created Venue',
        description: 'Created via e2e test',
        address: { street: 'Test St', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.324, 27.7172] },
        category: category._id,
        priceRange: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.venue.name).toBe('Superadmin Created Venue');
  });

  test('unauthenticated create is rejected', async () => {
    const res = await request(app).post('/api/venues').send({ name: 'No Auth Venue' });
    expect(res.status).toBe(401);
  });

  test('owner can update their own venue', async () => {
    const { admin, token } = await createOwner();
    const { category } = await createMetadata();
    const venue = await createVenue({ owner: admin, category });

    const res = await request(app)
      .put(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated by owner' });

    expect(res.status).toBe(200);
    expect(res.body.venue.description).toBe('Updated by owner');
  });

  test('owner cannot update a venue they do not own', async () => {
    const { admin: ownerA } = await createOwner();
    const { token: ownerBToken } = await createOwner();
    const { category } = await createMetadata();
    const venue = await createVenue({ owner: ownerA, category });

    const res = await request(app)
      .put(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ description: 'Should not apply' });

    expect(res.status).toBe(403);
  });

  test('owner cannot delete a venue they do not own', async () => {
    const { admin: ownerA } = await createOwner();
    const { token: ownerBToken } = await createOwner();
    const { category } = await createMetadata();
    const venue = await createVenue({ owner: ownerA, category });

    const res = await request(app)
      .delete(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(403);
  });

  test('superadmin can delete any venue', async () => {
    const { token } = await createSuperadmin();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app)
      .delete(`/api/venues/${venue._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const getRes = await request(app).get(`/api/venues/${venue._id}`);
    expect(getRes.status).toBe(404);
  });
});
