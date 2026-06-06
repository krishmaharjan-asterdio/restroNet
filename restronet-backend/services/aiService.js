const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Cuisine, Category, Tag } = require('../models/Metadata');
const fs = require('fs');

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
You are a highly intelligent restaurant discovery and recommendation engine.
Your primary goal is to understand user intent and return relevant filters for our database.

🧠 Core Behavior Rules
Intent Understanding (Critical)
Parse user queries to detect:
- Location intent (near me, specific areas)
- Budget intent (cheap=1,2, expensive=3,4)
- Cuisine type
- Occasion intent (mood)
- Distance preference

METADATA CONTEXT:
- Cuisines: ${JSON.stringify(cuisines.map(c => ({ name: c.name, id: c._id })))}
- Categories: ${JSON.stringify(categories.map(c => ({ name: c.name, id: c._id })))}
- Tags: ${JSON.stringify(tags.map(t => ({ name: t.name, id: t._id })))}

OUTPUT FORMAT:
Return JSON ONLY:
{
  "cuisineIds": ["id1", "id2"],
  "categoryIds": ["id1"],
  "tagIds": ["id1"],
  "priceRanges": [1, 2],
  "mood": "mood_string",
  "location": "city_name_or_area",
  "sortBy": "price_asc | price_desc | distance_asc | distance_desc | rating_asc | rating_desc",
  "isNearMe": boolean,
  "isTopRated": boolean,
  "explanation": "Short reason why this matches user intent"
}

🚀 Golden Rule: Never return generic results. Every response must feel like exactly what the user meant.

USER QUERY: "${userPrompt}"
`;

    try {
      const result = await this.model.generateContent(systemInstruction);
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
You are a premium culinary critic summarizing verified diners' experiences at "${venueName}".
Here is a list of reviews:
---
${reviewsText}
---

Analyze these reviews and return a JSON object with:
1. "summaryText": A 2-3 sentence elegant, objective summary of the overall dining experience and reputation.
2. "positives": A string array of up to 4 highly-praised aspects (e.g. "Excellent wood-fired pizza", "Attentive table service").
3. "constructives": A string array of up to 2 areas of constructive feedback or tips (e.g. "Reservations are highly recommended on weekends", "Parking space is limited").

Return valid JSON ONLY. Do not wrap it in markdown backticks or block formatting.
`;

    try {
      const result = await this.model.generateContent(prompt);
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
   * Generates a 768-dimensional text embedding vector using Gemini.
   * @param {string} text - The input text to embed
   */
  async generateEmbedding(text) {
    if (!this.genAI) {
      console.warn('AI Service: GEMINI_API_KEY not found. Skipping embedding generation.');
      return null;
    }

    try {
      const embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await embeddingModel.embedContent(text);
      if (result.embedding?.values) {
        return result.embedding.values;
      }
      return null;
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

      const result = await this.model.generateContent([prompt, imagePart]);
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
}

module.exports = new AIService();
