require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const { createUser, createMetadata } = require('./fixtures');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Auth', () => {
  test('user can register', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'New Diner',
      email: `register-${Date.now()}@e2e.test`,
      password: 'TestPass123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toContain('register-');
  });

  test('registering with an existing email is rejected', async () => {
    const email = `dupe-${Date.now()}@e2e.test`;
    await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'TestPass123!' });

    const res = await request(app).post('/api/auth/register').send({ name: 'B', email, password: 'TestPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('user can login with correct credentials', async () => {
    const email = `login-${Date.now()}@e2e.test`;
    await request(app).post('/api/auth/register').send({ name: 'Login User', email, password: 'TestPass123!' });

    const res = await request(app).post('/api/auth/login').send({ email, password: 'TestPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('login with wrong password is rejected', async () => {
    const email = `badpass-${Date.now()}@e2e.test`;
    await request(app).post('/api/auth/register').send({ name: 'Bad Pass', email, password: 'TestPass123!' });

    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('login with unknown email is rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@e2e.test', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  test('authenticated user can fetch profile', async () => {
    const { token, user } = await createUser();

    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(user._id.toString());
  });

  test('unauthenticated profile fetch is rejected', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  test('authenticated user can update profile and preferences', async () => {
    const { token } = await createUser();
    const { cuisine, tag } = await createMetadata();

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        phone: '9800000000',
        preferences: { cuisines: [cuisine._id], tags: [tag._id], priceRange: 3 },
      });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.preferences.priceRange).toBe(3);
  });

  test('forgot-password always responds success, even for unknown email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@e2e.test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('reset-password with invalid token is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'NewPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('reset-password without token or password is rejected', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({});
    expect(res.status).toBe(400);
  });
});
