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

describe('Admin Dashboard', () => {
  test('superadmin sees global stats', async () => {
    const { token } = await createSuperadmin();
    const { category } = await createMetadata();
    await createVenue({ category });

    const res = await request(app).get('/api/admin/dashboard/stats').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.totalVenues).toBeGreaterThanOrEqual(1);
    expect(res.body.stats.totalUsers).not.toBeNull();
  });

  test('owner sees only their own venue stats and no user count', async () => {
    const { token, admin: owner } = await createOwner();
    const { category } = await createMetadata();
    await createVenue({ owner, category });
    await createVenue({ category }); // unowned venue, should not count for owner

    const res = await request(app).get('/api/admin/dashboard/stats').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.totalVenues).toBe(1);
    expect(res.body.stats.totalUsers).toBeNull();
  });

  test('unauthenticated dashboard access is rejected', async () => {
    const res = await request(app).get('/api/admin/dashboard/stats');
    expect(res.status).toBe(401);
  });
});
