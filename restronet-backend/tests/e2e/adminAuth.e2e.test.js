require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const { createSuperadmin, createOwner } = require('./fixtures');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Admin Auth', () => {
  test('admin can login with correct credentials', async () => {
    const email = `admin-login-${Date.now()}@e2e.test`;
    const { admin } = await createSuperadmin({ email, password: 'TestPass123!' });

    const res = await request(app).post('/api/admin/auth/login').send({ email, password: 'TestPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin._id).toBe(admin._id.toString());
  });

  test('admin login with wrong password is rejected', async () => {
    const email = `admin-badpass-${Date.now()}@e2e.test`;
    await createSuperadmin({ email, password: 'TestPass123!' });

    const res = await request(app).post('/api/admin/auth/login').send({ email, password: 'WrongPass!' });

    expect(res.status).toBe(401);
  });

  test('authenticated admin can fetch profile', async () => {
    const { token, admin } = await createSuperadmin();

    const res = await request(app).get('/api/admin/auth/profile').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.admin._id).toBe(admin._id.toString());
  });

  test('unauthenticated admin profile fetch is rejected', async () => {
    const res = await request(app).get('/api/admin/auth/profile');
    expect(res.status).toBe(401);
  });

  test('superadmin can register a new owner', async () => {
    const { token } = await createSuperadmin();

    const res = await request(app)
      .post('/api/admin/auth/owners')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Owner', email: `owner-created-${Date.now()}@e2e.test`, password: 'TestPass123!' });

    expect(res.status).toBe(201);
    expect(res.body.owner.role).toBe('owner');
  });

  test('owner (non-superadmin) cannot register a new owner', async () => {
    const { token } = await createOwner();

    const res = await request(app)
      .post('/api/admin/auth/owners')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nope', email: `owner-nope-${Date.now()}@e2e.test`, password: 'TestPass123!' });

    expect(res.status).toBe(403);
  });

  test('superadmin can list owners', async () => {
    const { token } = await createSuperadmin();
    await createOwner();

    const res = await request(app).get('/api/admin/auth/owners').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.owners)).toBe(true);
  });

  test('superadmin can delete an owner', async () => {
    const { token } = await createSuperadmin();
    const { admin: owner } = await createOwner();

    const res = await request(app).delete(`/api/admin/auth/owners/${owner._id}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('deleting a superadmin via owner-delete route is forbidden', async () => {
    const { token } = await createSuperadmin();
    const { admin: victim } = await createSuperadmin();

    const res = await request(app).delete(`/api/admin/auth/owners/${victim._id}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
