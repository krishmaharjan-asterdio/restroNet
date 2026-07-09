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

describe('Menu CRUD', () => {
  test('public can list menus for a venue', async () => {
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app).get(`/api/menu/venue/${venue._id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.menus)).toBe(true);
  });

  test('admin can add a menu to a venue', async () => {
    const { token } = await createSuperadmin();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app)
      .post(`/api/menu/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dinner Menu', items: [{ name: 'Momo', price: 250 }] });

    expect(res.status).toBe(201);
    expect(res.body.menu.venue).toBe(venue._id.toString());
  });

  test('adding menu to nonexistent venue returns 404', async () => {
    const { token } = await createSuperadmin();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/menu/venue/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ghost Menu' });

    expect(res.status).toBe(404);
  });

  test('owner cannot add menu to a venue they do not own', async () => {
    const { token } = await createOwner();
    const { category } = await createMetadata();
    const venue = await createVenue({ category }); // no owner assigned

    const res = await request(app)
      .post(`/api/menu/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Not Mine' });

    expect(res.status).toBe(403);
  });

  test('owner can update their own venue menu', async () => {
    const { token, admin: owner } = await createOwner();
    const { category } = await createMetadata();
    const venue = await createVenue({ owner, category });

    const addRes = await request(app)
      .post(`/api/menu/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lunch Menu' });

    const res = await request(app)
      .put(`/api/menu/${addRes.body.menu._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Lunch Menu' });

    expect(res.status).toBe(200);
    expect(res.body.menu.name).toBe('Updated Lunch Menu');
  });

  test('admin can delete a menu', async () => {
    const { token } = await createSuperadmin();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const addRes = await request(app)
      .post(`/api/menu/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To Delete' });

    const res = await request(app)
      .delete(`/api/menu/${addRes.body.menu._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test('unauthenticated menu add is rejected', async () => {
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app).post(`/api/menu/venue/${venue._id}`).send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });
});
