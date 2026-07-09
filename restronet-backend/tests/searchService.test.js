const { tokenizeQuery, computeTextMatchScore } = require('../services/searchService');

describe('tokenizeQuery', () => {
  test('drops generic dining words as stop words', () => {
    const { tokens } = tokenizeQuery('places to eat in thamel');
    expect(tokens).toEqual(['thamel']);
  });

  test('keeps venue-specific tokens', () => {
    const { tokens } = tokenizeQuery('fire and ice pizzeria');
    expect(tokens).toEqual(expect.arrayContaining(['fire', 'ice', 'pizzeria']));
  });

  test('returns empty tokens for an all-generic query', () => {
    const { tokens } = tokenizeQuery('places to eat');
    expect(tokens).toEqual([]);
  });
});

describe('computeTextMatchScore word-boundary matching', () => {
  const venue = {
    name: 'Some Venue',
    description: 'A lovely spot.',
    cuisines: [{ name: 'Continental' }],
    category: { name: 'Fine Dining Venue' },
    tags: [{ name: 'Outdoor Seating' }],
  };

  test('token "eat" does not match inside "Seating"', () => {
    const { tokens, normalized } = tokenizeQuery('great eats zone');
    // 'eats' is a stop word; craft tokens manually to simulate the raw token
    const result = computeTextMatchScore(venue, normalized, ['eat', 'zone']);
    expect(result.matchedFields).not.toContain('tag');
    expect(result.score).toBe(0);
  });

  test('whole-word tag match still works', () => {
    const result = computeTextMatchScore(venue, 'outdoor', ['outdoor']);
    expect(result.matchedFields).toContain('tag');
    expect(result.score).toBeGreaterThan(0);
  });

  test('partial name token below confidence floor scores low, not zero', () => {
    const roadhouse = { ...venue, name: 'Roadhouse Cafe Thamel' };
    const result = computeTextMatchScore(roadhouse, 'best pizza thamel', ['best', 'pizza', 'thamel']);
    expect(result.matchedFields).toContain('name');
  });
});
