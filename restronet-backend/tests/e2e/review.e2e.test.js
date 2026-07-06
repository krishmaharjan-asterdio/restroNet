require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const { createUser, createSuperadmin, createMetadata, createVenue } = require('./fixtures');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Review CRUD', () => {
  test('user can add a review and venue rating is recalculated', async () => {
    const { token } = await createUser();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app)
      .post(`/api/reviews/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: { overall: 5 }, title: 'Great', comment: 'Loved the food here.' });

    expect(res.status).toBe(201);

    const venueRes = await request(app).get(`/api/venues/${venue._id}`);
    expect(venueRes.body.venue.averageRating).toBe(5);
    expect(venueRes.body.venue.totalReviews).toBe(1);
  });

  test('user cannot submit a second review for the same venue', async () => {
    const { token } = await createUser();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    await request(app)
      .post(`/api/reviews/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: { overall: 4 }, comment: 'Good.' });

    const res = await request(app)
      .post(`/api/reviews/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: { overall: 2 }, comment: 'Second attempt.' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('user can delete their own review', async () => {
    const { token } = await createUser();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const createRes = await request(app)
      .post(`/api/reviews/venue/${venue._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: { overall: 3 }, comment: 'Okay experience.' });

    const reviewId = createRes.body.review._id;

    const delRes = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    const venueRes = await request(app).get(`/api/venues/${venue._id}`);
    expect(venueRes.body.venue.totalReviews).toBe(0);
  });

  test('admin can view all reviews for moderation', async () => {
    const { token: userToken } = await createUser();
    const { token: adminToken } = await createSuperadmin();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    await request(app)
      .post(`/api/reviews/venue/${venue._id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: { overall: 5 }, comment: 'Excellent.' });

    const res = await request(app)
      .get('/api/reviews/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.docs.length).toBeGreaterThanOrEqual(1);
  });
});
