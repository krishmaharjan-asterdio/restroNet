const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Cuisine, Category, Tag } = require('../models/Metadata');

/**
 * AI-powered intent parser for the RESTRONET discovery engine.
 * Uses Gemini to understand natural language queries and map them to database filters.
 */
class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
}

module.exports = new AIService();
