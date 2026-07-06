'use strict';
// Mock Reservation model before requiring the service
jest.mock('../models/Reservation', () => ({
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  }),
}));

const { getAvailableSlots, parseTime, toTimeStr } = require('../services/capacityService');
const Reservation = require('../models/Reservation');

const makeVenue = (overrides = {}) => ({
  _id: 'venue1',
  maxCapacity: 2,
  slotDurationMinutes: 60,
  openingHours: {
    monday: { open: '10:00', close: '14:00', closed: false },
  },
  ...overrides,
});

describe('parseTime', () => {
  test('parses valid time', () => expect(parseTime('10:00')).toBe(600));
  test('returns null for null', () => expect(parseTime(null)).toBeNull());
  test('returns null for bad format', () => expect(parseTime('bad')).toBeNull());
});

describe('toTimeStr', () => {
  test('formats 600 as 10:00', () => expect(toTimeStr(600)).toBe('10:00'));
  test('formats 90 as 01:30', () => expect(toTimeStr(90)).toBe('01:30'));
});

describe('getAvailableSlots', () => {
  beforeEach(() => {
    Reservation.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
  });

  test('returns empty when maxCapacity is null', async () => {
    const venue = makeVenue({ maxCapacity: null });
    expect(await getAvailableSlots(venue, '2026-06-16')).toEqual([]);
  });

  test('returns empty when day is closed', async () => {
    const venue = makeVenue({ openingHours: { monday: { closed: true } } });
    expect(await getAvailableSlots(venue, '2026-06-15')).toEqual([]); // monday
  });

  test('returns correct slots for open day with no bookings', async () => {
    const venue = makeVenue();
    // 2026-06-15 is a Monday
    const slots = await getAvailableSlots(venue, '2026-06-15');
    expect(slots).toEqual(['10:00', '11:00', '12:00', '13:00']);
  });

  test('filters out fully-booked slots', async () => {
    Reservation.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { time: '10:00' }, { time: '10:00' }, // 2 bookings = full (maxCapacity:2)
        ]),
      }),
    });
    const venue = makeVenue();
    const slots = await getAvailableSlots(venue, '2026-06-15');
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('11:00');
  });

  test('returns empty when no openingHours', async () => {
    const venue = makeVenue({ openingHours: null });
    expect(await getAvailableSlots(venue, '2026-06-15')).toEqual([]);
  });

  test('returns empty when open === close (zero-duration window)', async () => {
    const venue = makeVenue({ openingHours: { monday: { open: '10:00', close: '10:00', closed: false } } });
    expect(await getAvailableSlots(venue, '2026-06-15')).toEqual([]);
  });
});
