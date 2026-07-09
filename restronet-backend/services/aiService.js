const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Cuisine, Category, Tag } = require('../models/Metadata');
const fs = require('fs');

// Lazy-loaded singleton pipeline — transformers.js downloads/caches the
// model (~90MB) on first use and keeps it in memory across calls.
let embedderPromise = null;
function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    );
  }
  return embedderPromise;
}

/**
 * AI-powered intent parser for the RESTRONET discovery engine.
 * Uses Gemini to understand natural language queries and map them to database filters.
 */
class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }
    // LRU cache for embeddings (Map preserves insertion order).
    this._embeddingCache = new Map();
  }

  async _withRetry(fn, maxRetries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  }

  async parseIntent(userPrompt) {
    if (!this.genAI) {
      console.warn('AI Service: GEMINI_API_KEY not found in .env. Falling back to rule-based parsing.');
      return null;
    }

    // Fetch metadata to help the AI map to existing IDs
    const [cuisines, categories, tags] = await Promise.all([
      Cuisine.find().select('name _id').lean(),
      Category.find().select('name _id').lean(),
      Tag.find().select('name _id').lean(),
    ]);

    const systemInstruction = `
You are a precise restaurant search intent parser for RestroNet, Kathmandu's premier dining discovery platform.

Parse the user's query and extract structured search filters. Think step by step, then output ONLY a JSON object — no markdown, no explanation.

RULES:
- cuisineIds: match only cuisines from the metadata list above
- categoryIds: match only categories from the metadata list above
- tagIds: match only tags from the metadata list above
- priceRanges: 1=Budget (<500 NPR), 2=Mid (500-1500), 3=Premium (1500-3000), 4=Luxury (>3000)
- mood: one of: romantic | family-friendly | cafe | luxury | nightlife | casual | work-friendly | aesthetic | null
- location: city name or neighbourhood in Kathmandu (e.g. "Thamel", "Patan", "Lazimpat") or null
- sortBy: "price_asc" | "price_desc" | "distance_asc" | "distance_desc" | "rating_desc" | null
- isNearMe: true only if user explicitly says "near me", "nearby", "close to me"
- isTopRated: true if user says "best", "top rated", "highest rated", "most popular"
- explanation: one concise sentence describing what the user is looking for

METADATA CONTEXT:
- Cuisines: ${JSON.stringify(cuisines.map(c => ({ name: c.name, id: c._id })))}
- Categories: ${JSON.stringify(categories.map(c => ({ name: c.name, id: c._id })))}
- Tags: ${JSON.stringify(tags.map(t => ({ name: t.name, id: t._id })))}

OUTPUT FORMAT — return this exact JSON structure:
{
  "cuisineIds": [],
  "categoryIds": [],
  "tagIds": [],
  "priceRanges": [],
  "mood": null,
  "location": null,
  "sortBy": null,
  "isNearMe": false,
  "isTopRated": false,
  "explanation": ""
}

USER QUERY: "${userPrompt}"
`;

    try {
      const result = await this._withRetry(() => this.model.generateContent(systemInstruction));
      const response = await result.response;
      const text = response.text();

      // Extract JSON from potential markdown blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('AI Intent Parsing Error:', error);
      return null;
    }
  }

  /**
   * Generates a structural summary of reviews for a restaurant.
   * @param {string} venueName - The name of the restaurant
   * @param {Array} reviews - List of reviews from the database
   */
  async generateReviewSummary(venueName, reviews) {
    if (!this.genAI) {
      console.warn('AI Service: GEMINI_API_KEY not found in .env.');
      return null;
    }

    const reviewsText = reviews
      .filter(r => r.comment && r.comment.trim())
      .map(r => `[Rating: ${r.rating.overall}/5] ${r.comment}`)
      .join('\n\n');

    if (!reviewsText) {
      return {
        summaryText: 'No detailed feedback has been left by diners yet.',
        positives: ['Cozy ambience'],
        constructives: ['Needs more user reviews for detailed summary insights.']
      };
    }

    const prompt = `
You are a discerning culinary critic for RestroNet, Kathmandu's premier restaurant discovery platform.
Analyse the verified diner reviews below for "${venueName}" and write a structured summary.

REVIEWS:
${reviewsText}

Return ONLY valid JSON — no markdown wrapper:
{
  "summaryText": "2-3 sentence editorial summary of the dining experience, written in a warm, authoritative tone. Mention specific standout elements.",
  "positives": ["Up to 4 specific praised aspects, each under 8 words", "..."],
  "constructives": ["Up to 2 constructive tips for prospective diners, framed helpfully", "..."]
}
`;

    try {
      const result = await this._withRetry(() => this.model.generateContent(prompt));
      const response = await result.response;
      const text = response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('AI Review Summarization Error:', error);
      return null;
    }
  }

  /**
   * Generates a 384-dimensional text embedding vector locally
   * (Xenova/all-MiniLM-L6-v2, runs in-process via transformers.js — no
   * API key, no quota). Results are memoized in an LRU cache since the
   * same search terms and venue text get embedded repeatedly.
   * @param {string} text - The input text to embed
   */
  async generateEmbedding(text) {
    if (!text || !text.trim()) return null;

    const cacheKey = text.trim().toLowerCase();
    if (this._embeddingCache.has(cacheKey)) {
      // Delete + re-set moves the key to the end of the Map (most recent).
      const cached = this._embeddingCache.get(cacheKey);
      this._embeddingCache.delete(cacheKey);
      this._embeddingCache.set(cacheKey, cached);
      return cached;
    }

    try {
      const embedder = await getEmbedder();
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      const values = Array.from(output.data);
      this._embeddingCache.set(cacheKey, values);
      if (this._embeddingCache.size > 500) {
        this._embeddingCache.delete(this._embeddingCache.keys().next().value);
      }
      return values;
    } catch (error) {
      console.error('AI Embedding Generation Error:', error);
      return null;
    }
  }

  /**
   * Helper to convert a local file to Generative AI Part format
   */
  fileToGenerativePart(path, mimeType) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(path)).toString("base64"),
        mimeType
      },
    };
  }

  /**
   * Parses a menu image using Gemini Vision (multimodal) to extract dishes and pricing.
   */
  async parseMenuImage(imagePath, mimeType) {
    if (!this.genAI) {
      console.warn('AI Service: GEMINI_API_KEY not found.');
      return null;
    }

    try {
      const imagePart = this.fileToGenerativePart(imagePath, mimeType);
      
      const prompt = `
Analyze this restaurant menu image. Extract the dishes, descriptions, and prices.
Categorize them and determine key tags for each dish (Vegetarian, Vegan, Gluten-Free).

Return a JSON object conforming exactly to this structure:
{
  "items": [
    {
      "name": "Dish Name",
      "description": "Short description if listed, or empty string",
      "price": 450, // convert price to a number (integer NPR units)
      "category": "Starters | Mains | Desserts | Beverages | Sides",
      "isVegetarian": boolean,
      "isVegan": boolean,
      "isGlutenFree": boolean
    }
  ]
}

Return valid JSON ONLY. Do not wrap it in markdown backticks or block formatting.
`;

      const result = await this._withRetry(() => this.model.generateContent([prompt, imagePart]));
      const response = await result.response;
      const text = response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('AI Menu OCR Error:', error);
      return null;
    }
  }

  async getMenuSuggestions(menuItems, userPreferences) {
    if (!this.genAI || !menuItems?.length) return null;

    const menuText = menuItems.slice(0, 30).map(item =>
      `${item.name}${item.description ? ': ' + item.description : ''} (${item.category}, NPR ${item.price}${item.isVegetarian ? ', veg' : ''}${item.isVegan ? ', vegan' : ''}${item.isGlutenFree ? ', GF' : ''})`
    ).join('\n');

    const prefText = userPreferences
      ? `User preferences: ${JSON.stringify(userPreferences)}`
      : 'No user preferences available.';

    const prompt = `You are a knowledgeable restaurant concierge for RestroNet. Study the menu below and recommend exactly 3 dishes.

${prefText}

MENU (${menuItems.slice(0, 30).length} items shown):
${menuText}

Selection criteria: variety across price points, at least one vegetarian option if available, dishes the kitchen is likely known for.

Return ONLY a JSON array — no markdown:
[
  { "name": "Exact dish name from menu", "reason": "One sentence — specific and appetising" },
  { "name": "Exact dish name from menu", "reason": "One sentence — specific and appetising" },
  { "name": "Exact dish name from menu", "reason": "One sentence — specific and appetising" }
]`;

    try {
      const result = await this._withRetry(() => this.model.generateContent(prompt));
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch (err) {
      console.error('AI Menu Suggestions Error:', err.message);
      return null;
    }
  }

  async moderateReview(comment) {
    if (!this.genAI || !comment?.trim()) return null;

    const prompt = `You are a content moderator for a restaurant review platform.
Classify the following review comment. Be strict: only flag clear spam (fake/promotional/gibberish) or toxic content (hate speech, profanity, personal attacks).

Comment: ${JSON.stringify(comment)}

Return JSON ONLY — no markdown:
{
  "classification": "clean" | "spam" | "toxic",
  "confidence": 0.0,
  "reason": "brief reason"
}`;

    try {
      const result    = await this._withRetry(() => this.model.generateContent(prompt));
      const text      = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch (error) {
      console.error('AI Moderation Error:', error.message);
      return null;
    }
  }
}

module.exports = new AIService();
