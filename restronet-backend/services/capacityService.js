'use strict';
const Reservation = require('../models/Reservation');

/**
 * Returns an array of available time slot strings ("HH:MM") for a venue on a given date.
 * @param {object} venue - Venue document with openingHours, maxCapacity, slotDurationMinutes
 * @param {Date|string} date - The date to check (only the date part matters)
 * @returns {string[]} array of "HH:MM" strings
 */
const getAvailableSlots = async (venue, date) => {
  const { openingHours, maxCapacity, slotDurationMinutes = 60 } = venue;

  // If no capacity limit set, capacity management is disabled — return empty (use normal booking)
  if (!maxCapacity) return [];

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const d = new Date(date);
  const dayKey = dayNames[d.getDay()];

  const hours = openingHours?.[dayKey];
  if (!hours || hours.closed || hours.isClosed) return [];

  const open  = parseTime(hours.open);
  const close = parseTime(hours.close);
  if (open === null || close === null) return [];

  // Build all slots from open to (close - slotDuration)
  const slots = [];
  let cursor = open;
  const end = close < open ? close + 24 * 60 : close; // handle overnight (strict less-than avoids open===close edge case)
  while (cursor + slotDurationMinutes <= end) {
    slots.push(toTimeStr(cursor % (24 * 60)));
    cursor += slotDurationMinutes;
  }

  if (!slots.length) return [];

  // Count reservations already booked in each slot
  const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);

  const booked = await Reservation.find({
    venue: venue._id,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['confirmed', 'pending'] },
  }).select('time').lean();

  const bookedCounts = {};
  for (const r of booked) {
    if (r.time) bookedCounts[r.time] = (bookedCounts[r.time] || 0) + 1;
  }

  return slots.filter(slot => (bookedCounts[slot] || 0) < maxCapacity);
};

const parseTime = (str) => {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

const toTimeStr = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

module.exports = { getAvailableSlots, parseTime, toTimeStr };
