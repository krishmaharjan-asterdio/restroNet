require('./setup');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const {
  createUser,
  createSuperadmin,
  createOwner,
  createMetadata,
  createVenue,
} = require('./fixtures');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const futureDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
};

describe('Reservation CRUD', () => {
  test('user can create a reservation', async () => {
    const { token } = await createUser();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        venueId: venue._id,
        date: futureDate(),
        time: '19:00',
        guests: 2,
        contactPhone: '9800000000',
      });

    expect(res.status).toBe(201);
    expect(res.body.reservation.status).toBe('pending');
  });

  test('unauthenticated reservation creation is rejected', async () => {
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const res = await request(app).post('/api/reservations').send({
      venueId: venue._id,
      date: futureDate(),
      time: '19:00',
      guests: 2,
      contactPhone: '9800000000',
    });

    expect(res.status).toBe(401);
  });

  test('user can view their own reservations', async () => {
    const { token, user } = await createUser();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ venueId: venue._id, date: futureDate(), time: '18:00', guests: 4, contactPhone: '9811111111' });

    const res = await request(app)
      .get('/api/reservations/my')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.reservations.length).toBe(1);
    expect(res.body.reservations[0].venue.name).toBe(venue.name);
  });

  test('owner sees only reservations for venues they own', async () => {
    const { admin: ownerA, token: ownerAToken } = await createOwner();
    const { admin: ownerB } = await createOwner();
    const { category } = await createMetadata();
    const venueA = await createVenue({ owner: ownerA, category });
    const venueB = await createVenue({ owner: ownerB, category });
    const { token: userToken } = await createUser();

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ venueId: venueA._id, date: futureDate(), time: '19:00', guests: 2, contactPhone: '9800000000' });
    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ venueId: venueB._id, date: futureDate(), time: '19:00', guests: 2, contactPhone: '9800000000' });

    const res = await request(app)
      .get('/api/reservations/admin')
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reservations.length).toBe(1);
    expect(res.body.reservations[0].venue.name).toBe(venueA.name);
  });

  test('admin can update reservation status', async () => {
    const { token: userToken } = await createUser();
    const { token: adminToken } = await createSuperadmin();
    const { category } = await createMetadata();
    const venue = await createVenue({ category });

    const createRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ venueId: venue._id, date: futureDate(), time: '19:00', guests: 2, contactPhone: '9800000000' });

    const reservationId = createRes.body.reservation._id;

    const res = await request(app)
      .put(`/api/reservations/admin/${reservationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.reservation.status).toBe('confirmed');
  });
});
