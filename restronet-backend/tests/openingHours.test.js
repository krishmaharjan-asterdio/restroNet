const { validateBookingTime } = require('../utils/openingHoursValidator');

// 2026-06-15 is a Monday
const MONDAY = '2026-06-15';

const hours = {
  monday: { open: '10:00', close: '22:00', isClosed: false },
  tuesday: { isClosed: true },
};

describe('validateBookingTime', () => {
  test('allows booking within opening hours', () => {
    expect(validateBookingTime(hours, MONDAY, '12:00')).toEqual({ allowed: true });
  });

  test('rejects booking before opening', () => {
    const result = validateBookingTime(hours, MONDAY, '09:00');
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/10:00/);
  });

  test('rejects booking after closing', () => {
    const result = validateBookingTime(hours, MONDAY, '23:00');
    expect(result.allowed).toBe(false);
  });

  test('rejects booking on closed day', () => {
    // 2026-06-16 is a Tuesday
    const result = validateBookingTime(hours, '2026-06-16', '12:00');
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/closed/i);
  });

  test('allows booking when venue has no hours configured', () => {
    expect(validateBookingTime(null, MONDAY, '12:00')).toEqual({ allowed: true });
  });

  test('handles overnight hours correctly', () => {
    const overnight = { monday: { open: '22:00', close: '02:00', isClosed: false } };
    expect(validateBookingTime(overnight, MONDAY, '23:30').allowed).toBe(true);
    expect(validateBookingTime(overnight, MONDAY, '01:00').allowed).toBe(true);
    expect(validateBookingTime(overnight, MONDAY, '10:00').allowed).toBe(false);
  });
});
