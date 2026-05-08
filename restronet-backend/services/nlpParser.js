const natural = require('natural');
const { Cuisine, Category, Tag } = require('../models/Metadata');
const { MOOD_KEYWORDS } = require('./recommendationService');

/**
 * Parses a natural language prompt into structured filters
 * for the recommendation engine.
 */
const parsePrompt = async (prompt) => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(prompt.toLowerCase());
  
  const parsed = {
    cuisineIds: [],
    categoryIds: [],
    tagIds: [],
    mood: null,
    priceRanges: [],
    isNearMe: false,
    isTopRated: false
  };

  const pLower = prompt.toLowerCase();

  // 1. Detect Cuisines
  const allCuisines = await Cuisine.find().lean();
  allCuisines.forEach(c => {
    const name = c.name.toLowerCase();
    if (pLower.includes(name) || tokens.some(t => natural.JaroWinklerDistance(t, name) > 0.9)) {
      parsed.cuisineIds.push(c._id.toString());
    }
  });

  // 2. Detect Categories (e.g., Cafe, Bakery, Fast Food)
  const allCategories = await Category.find().lean();
  allCategories.forEach(c => {
    const name = c.name.toLowerCase();
    if (pLower.includes(name) || tokens.some(t => natural.JaroWinklerDistance(t, name) > 0.9)) {
      parsed.categoryIds.push(c._id.toString());
    }
  });

  // 3. Detect Tags (e.g., Rooftop, Live Music)
  const allTags = await Tag.find().lean();
  allTags.forEach(t => {
    const name = t.name.toLowerCase();
    if (pLower.includes(name) || tokens.some(t => natural.JaroWinklerDistance(t, name) > 0.9)) {
      parsed.tagIds.push(t._id.toString());
    }
  });

  // 4. Detect Mood
  for (const [moodKey, keywords] of Object.entries(MOOD_KEYWORDS)) {
    const moodClean = moodKey.replace('-', ' ');
    if (pLower.includes(moodClean)) {
      parsed.mood = moodKey;
      break;
    }
    
    let matched = false;
    for (const kw of keywords) {
      if (pLower.includes(kw) || tokens.some(t => natural.JaroWinklerDistance(t, kw) > 0.90)) {
        matched = true;
        break;
      }
    }
    if (matched) {
      parsed.mood = moodKey;
      break;
    }
  }

  // 5. Detect Price
  const cheapKeywords = ['cheap', 'budget', 'affordable', 'inexpensive', 'low cost', 'reasonable'];
  const expensiveKeywords = ['expensive', 'luxury', 'fine dining', 'high end', 'premium', 'pricy', 'upscale'];
  
  if (cheapKeywords.some(kw => pLower.includes(kw))) {
    parsed.priceRanges = [1, 2];
  } else if (expensiveKeywords.some(kw => pLower.includes(kw))) {
    parsed.priceRanges = [3, 4];
  }

  // 6. Detect Quality / Rating
  const topRatedKeywords = ['top rated', 'highest rated', 'best', 'popular', 'famous', 'top 10', 'highly rated', 'excellent', 'greatest'];
  if (topRatedKeywords.some(kw => pLower.includes(kw))) {
    parsed.isTopRated = true;
  }

  // 7. Detect Near Me
  const nearMeKeywords = ['near me', 'nearby', 'close to me', 'around me', 'close by', 'closest'];
  if (nearMeKeywords.some(kw => pLower.includes(kw))) {
    parsed.isNearMe = true;
  }

  // Deduplicate
  parsed.cuisineIds = [...new Set(parsed.cuisineIds)];
  parsed.categoryIds = [...new Set(parsed.categoryIds)];
  parsed.tagIds = [...new Set(parsed.tagIds)];

  return parsed;
};

module.exports = { parsePrompt };
