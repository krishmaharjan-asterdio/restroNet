const { computeVelocityScore, isTrendingByScore } = require('../services/trendingService');

describe('computeVelocityScore', () => {
  test('returns 0 when no recent reviews', () => {
    expect(computeVelocityScore(0, 5)).toBe(0);
  });

  test('returns high value when prev=0 and recent>=1', () => {
    // (3 - 0) / max(0, 1) = 3
    expect(computeVelocityScore(3, 0)).toBe(3);
  });

  test('returns correct ratio', () => {
    // (10 - 5) / 5 = 1.0
    expect(computeVelocityScore(10, 5)).toBeCloseTo(1.0);
  });

  test('returns negative when activity dropped', () => {
    // (2 - 8) / 8 = -0.75
    expect(computeVelocityScore(2, 8)).toBeCloseTo(-0.75);
  });
});

describe('isTrendingByScore', () => {
  test('returns true when velocity > 0.5 and recentCount >= 3', () => {
    expect(isTrendingByScore(1.2, 5)).toBe(true);
  });

  test('returns false when recentCount < 3 even if velocity high', () => {
    expect(isTrendingByScore(2.0, 2)).toBe(false);
  });

  test('returns false when velocity <= 0.5', () => {
    expect(isTrendingByScore(0.4, 10)).toBe(false);
  });
});
