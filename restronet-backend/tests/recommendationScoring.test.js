const { _internal } = require('../services/recommendationService');

const {
  computeWeights,
  applyDiversityReranking,
  computeVisitedPenalty,
  computeMoodScore,
  computeImplicitScore,
  computePriceScore,
  computeCosineSimilarity,
  rawCosineSimilarity,
  buildUserPreferenceVector,
  recencyFactor,
  computeMatchLabel,
} = _internal;

// ─── computeWeights ───────────────────────────────────────────────────────────

describe('computeWeights', () => {
  const base = {
    hasCuisine: false, hasCategory: false, hasTag: false, hasMood: false,
    hasLocation: false, hasPriceFilter: false, isTopRated: false,
    hasImplicit: false, hasVector: false, hasCbfVector: false,
  };

  test('always normalizes to sum 1', () => {
    const cases = [
      base,
      { ...base, hasCuisine: true, hasMood: true },
      { ...base, isTopRated: true, hasVector: true },
      { ...base, isColdStart: true },
      { ...base, hasImplicit: true, hasCbfVector: true, hasLocation: true, hasPriceFilter: true },
    ];
    for (const flags of cases) {
      const w = computeWeights(flags);
      const total = Object.values(w).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });

  test('cold start shifts weight toward rating and popularity', () => {
    const normal = computeWeights(base);
    const cold = computeWeights({ ...base, isColdStart: true });
    expect(cold.rating).toBeGreaterThan(normal.rating);
    expect(cold.popularity).toBeGreaterThan(normal.popularity);
    expect(cold.cuisine).toBeLessThan(normal.cuisine);
  });

  test('price filter boosts price weight', () => {
    const normal = computeWeights(base);
    const priced = computeWeights({ ...base, hasPriceFilter: true });
    expect(priced.price).toBeGreaterThan(normal.price);
  });

  test('never returns a negative weight', () => {
    const w = computeWeights({ ...base, isTopRated: true, hasCuisine: true, hasMood: true, hasPriceFilter: true });
    Object.values(w).forEach(v => expect(v).toBeGreaterThan(0));
  });
});

// ─── applyDiversityReranking ──────────────────────────────────────────────────

describe('applyDiversityReranking', () => {
  const mk = (id, cuisineIds, score) => ({
    finalScore: score,
    venue: { _id: id, cuisines: cuisineIds.map(c => ({ _id: c })) },
  });

  test('caps a single cuisine at ~40% of top-N when alternatives exist', () => {
    // 10 italian venues ranked highest, plenty of alternatives below —
    // the cap only holds while alternate-cuisine supply lasts (backfill
    // deliberately refills the page rather than returning fewer results).
    const items = [
      ...Array.from({ length: 10 }, (_, i) => mk(`it${i}`, ['italian'], 1 - i * 0.01)),
      ...Array.from({ length: 5 }, (_, i) => mk(`np${i}`, ['nepali'], 0.5 - i * 0.01)),
      ...Array.from({ length: 5 }, (_, i) => mk(`in${i}`, ['indian'], 0.4 - i * 0.01)),
    ];
    const top = applyDiversityReranking(items, 10);
    const italianCount = top.filter(s => s.venue.cuisines[0]._id === 'italian').length;
    expect(italianCount).toBeLessThanOrEqual(Math.ceil(10 * 0.4));
  });

  test('cannot be defeated by cuisine ordering — counts all cuisines', () => {
    // Same two cuisines, alternating order. Under the old cuisines[0]-only
    // keying these landed in separate buckets and all 10 got selected.
    const items = Array.from({ length: 10 }, (_, i) =>
      mk(`v${i}`, i % 2 === 0 ? ['pizza', 'italian'] : ['italian', 'pizza'], 1 - i * 0.01)
    );
    // enough alternate-cuisine candidates that backfill is never needed
    for (let i = 0; i < 6; i++) items.push(mk(`np${i}`, ['nepali'], 0.4 - i * 0.01));
    for (let i = 0; i < 6; i++) items.push(mk(`in${i}`, ['indian'], 0.3 - i * 0.01));

    const top = applyDiversityReranking(items, 10);
    const pizzaItalian = top.filter(s =>
      s.venue.cuisines.some(c => c._id === 'pizza' || c._id === 'italian')
    ).length;
    expect(pizzaItalian).toBeLessThanOrEqual(Math.ceil(10 * 0.4));
  });

  test('backfills from deferred when limit not reached', () => {
    const items = Array.from({ length: 12 }, (_, i) => mk(`v${i}`, ['same'], 1 - i * 0.01));
    const top = applyDiversityReranking(items, 10);
    expect(top.length).toBe(10); // cap defers, backfill still fills the page
  });

  test('returns list unchanged when under limit', () => {
    const items = [mk('a', ['x'], 0.9), mk('b', ['x'], 0.8)];
    expect(applyDiversityReranking(items, 10)).toEqual(items);
  });
});

// ─── computeVisitedPenalty ────────────────────────────────────────────────────

describe('computeVisitedPenalty', () => {
  test('unvisited venue gets no penalty', () => {
    expect(computeVisitedPenalty(undefined)).toBe(1.0);
  });

  test('loved venue (5★) barely dips', () => {
    expect(computeVisitedPenalty({ maxRating: 5, reserved: false })).toBe(0.95);
  });

  test('disliked venue (≤2★) sinks hard', () => {
    expect(computeVisitedPenalty({ maxRating: 2, reserved: true })).toBe(0.6);
    expect(computeVisitedPenalty({ maxRating: 1, reserved: false })).toBe(0.6);
  });

  test('reservation without review gets middle penalty', () => {
    expect(computeVisitedPenalty({ maxRating: null, reserved: true })).toBe(0.85);
  });

  test('penalty ordering: loved > reserved > disliked', () => {
    const loved = computeVisitedPenalty({ maxRating: 5 });
    const reserved = computeVisitedPenalty({ maxRating: null, reserved: true });
    const disliked = computeVisitedPenalty({ maxRating: 1 });
    expect(loved).toBeGreaterThan(reserved);
    expect(reserved).toBeGreaterThan(disliked);
  });
});

// ─── computeMoodScore ─────────────────────────────────────────────────────────

describe('computeMoodScore', () => {
  test('no mood filter → neutral 0.5', () => {
    expect(computeMoodScore({ mood: ['romantic'] }, null, [])).toBe(0.5);
  });

  test('direct mood match → 1.0', () => {
    expect(computeMoodScore({ mood: ['romantic', 'luxury'], tags: [] }, 'romantic', [])).toBe(1.0);
  });

  test('mood non-match floors at 0.15, not 0 — backfill labels are heuristic', () => {
    const score = computeMoodScore({ mood: ['casual'], tags: [] }, 'romantic', []);
    expect(score).toBeGreaterThanOrEqual(0.15);
  });

  test('mood non-match can be rescued by tag keywords', () => {
    const venue = { mood: ['casual'], tags: [{ _id: 't1' }, { _id: 't2' }] };
    const rescued = computeMoodScore(venue, 'romantic', ['t1', 't2']);
    const notRescued = computeMoodScore({ mood: ['casual'], tags: [] }, 'romantic', ['t1', 't2']);
    expect(rescued).toBeGreaterThan(notRescued);
  });

  test('no mood data anywhere → null (signal unknown, weight redistributed)', () => {
    expect(computeMoodScore({ tags: [] }, 'romantic', [])).toBeNull();
  });
});

// ─── computeImplicitScore ─────────────────────────────────────────────────────

describe('computeImplicitScore', () => {
  const venue = {
    cuisines: [{ _id: 'italian' }],
    tags: [{ _id: 'cozy' }],
    priceRange: 2,
  };

  test('positive affinity boosts score', () => {
    const profile = {
      cuisineAffinity: { italian: 1.0 },
      tagAffinity: { cozy: 1.0 },
      priceAffinity: { 2: 1.0 },
    };
    expect(computeImplicitScore(venue, profile)).toBeGreaterThan(0.5);
  });

  test('negative affinity (disliked cuisine) drags score down, floored at 0', () => {
    const profile = {
      cuisineAffinity: { italian: -1.0 },
      tagAffinity: { cozy: -0.5 },
      priceAffinity: { 2: -0.8 },
    };
    const score = computeImplicitScore(venue, profile);
    expect(score).toBe(0);
  });

  test('no overlap → 0, empty profile → neutral 0.5', () => {
    const noOverlap = {
      cuisineAffinity: { nepali: 1.0 },
      tagAffinity: {},
      priceAffinity: {},
    };
    expect(computeImplicitScore(venue, noOverlap)).toBe(0);
    expect(computeImplicitScore(venue, { cuisineAffinity: {}, tagAffinity: {}, priceAffinity: {} })).toBe(0.5);
  });

  test('result always within [0, 1]', () => {
    const extreme = {
      cuisineAffinity: { italian: 5 }, // un-normalized input shouldn't break bounds
      tagAffinity: { cozy: 5 },
      priceAffinity: { 2: 5 },
    };
    const score = computeImplicitScore(venue, extreme);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ─── computePriceScore ────────────────────────────────────────────────────────

describe('computePriceScore', () => {
  test('exact tier match → 1.0', () => {
    expect(computePriceScore({ priceRange: 2 }, [2])).toBe(1.0);
  });

  test('adjacent tier scores lower but not zero', () => {
    const score = computePriceScore({ priceRange: 3 }, [2]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  test('no filter → neutral 0.5', () => {
    expect(computePriceScore({ priceRange: 4 }, [])).toBe(0.5);
  });
});

// ─── cosine similarity ────────────────────────────────────────────────────────

describe('cosine similarity helpers', () => {
  test('identical vectors → raw 1, normalized 1', () => {
    const v = [1, 2, 3];
    expect(rawCosineSimilarity(v, v)).toBeCloseTo(1);
    expect(computeCosineSimilarity(v, v)).toBeCloseTo(1);
  });

  test('opposite vectors → raw -1, normalized 0', () => {
    expect(rawCosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    expect(computeCosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(0);
  });

  test('dimension mismatch → safe fallbacks', () => {
    expect(rawCosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(computeCosineSimilarity([1, 2], [1, 2, 3])).toBe(0.5);
  });

  test('zero vector → safe fallbacks', () => {
    expect(rawCosineSimilarity([0, 0], [1, 2])).toBe(0);
    expect(computeCosineSimilarity([0, 0], [1, 2])).toBe(0.5);
  });
});

// ─── buildUserPreferenceVector ────────────────────────────────────────────────

describe('buildUserPreferenceVector', () => {
  test('vector layout matches cuisine+tag+price+confidence', () => {
    const profile = {
      cuisineAffinity: { c1: 1.0, c2: 0.5 },
      tagAffinity: { t1: 0.8 },
      priceAffinity: { 2: 1.0 },
    };
    const cuisines = [{ _id: 'c1' }, { _id: 'c2' }, { _id: 'c3' }];
    const tags = [{ _id: 't1' }, { _id: 't2' }];
    const vec = buildUserPreferenceVector(profile, cuisines, tags);
    expect(vec).toHaveLength(3 + 2 + 2);
    expect(vec[0]).toBe(1.0);   // c1
    expect(vec[1]).toBe(0.5);   // c2
    expect(vec[2]).toBe(0);     // c3 — no affinity
    expect(vec[3]).toBe(0.8);   // t1
    expect(vec[5]).toBe(0.5);   // price 2 / 4
  });
});

// ─── recencyFactor ────────────────────────────────────────────────────────────

describe('recencyFactor', () => {
  test('today → full weight', () => {
    expect(recencyFactor(new Date())).toBeCloseTo(1, 1);
  });

  test('~6 months old → roughly a third of the weight', () => {
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
    expect(recencyFactor(sixMonthsAgo)).toBeCloseTo(Math.exp(-1), 2);
  });

  test('missing date → full weight, not a crash', () => {
    expect(recencyFactor(null)).toBe(1);
  });

  test('newer signal always outweighs older one', () => {
    const recent = recencyFactor(new Date(Date.now() - 7 * 86400000));
    const old = recencyFactor(new Date(Date.now() - 365 * 86400000));
    expect(recent).toBeGreaterThan(old);
  });
});

// ─── computeMatchLabel ────────────────────────────────────────────────────────

describe('computeMatchLabel', () => {
  const breakdown = (over = {}) => ({
    name: 0, vector: 0, mood: 0, rating: 0, cuisine: 0, implicit: 0, popularity: 0,
    ...over,
  });

  test('cold start shows honest "Popular" label instead of "For you"', () => {
    const label = computeMatchLabel(breakdown({ popularity: 80, implicit: 90 }), null, null, true, true);
    expect(label).toBe('Popular');
  });

  test('"For you" is suppressed during cold start', () => {
    const label = computeMatchLabel(breakdown({ implicit: 90 }), null, null, true, true);
    expect(label).not.toBe('For you');
  });

  test('"For you" shows for authenticated users with real implicit signal', () => {
    const label = computeMatchLabel(breakdown({ implicit: 90 }), null, null, true, false);
    expect(label).toBe('For you');
  });
});
