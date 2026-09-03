const axios = require('axios');
const Venue = require('../models/Venue');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

/**
 * @desc    Chat with the AI Maitre D' (Concierge)
 * @route   POST /api/chat
 * @access  Public
 *
 * Backed by Groq (OpenAI-compatible chat completions). Recommendations are
 * drawn only from the active RestroNet venue directory passed as context.
 */
const handleChat = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Groq API key is not configured on the server.',
      });
    }

    // 1. Fetch active venues to populate the AI knowledge base
    const venues = await Venue.find({ isActive: true })
      .populate('cuisines tags category')
      .lean();

    // Compact one-line-per-venue directory. Groq free tier caps this model at
    // 8000 tokens/minute; a pretty-printed JSON dump of every venue (~3.8k
    // tokens) re-sent each turn triggers 429s on the second message. Keep only
    // the fields the concierge reasons over: name, cuisines, tags, price,
    // rating, area, meal types.
    const priceLabel = ['', '$', '$$', '$$$', '$$$$'];
    const venueLines = venues.map(v => {
      const cuisines = v.cuisines.map(c => c.name).join(', ') || 'n/a';
      const tags = v.tags.map(t => t.name).join(', ') || 'n/a';
      const price = priceLabel[v.priceRange] || 'n/a';
      const rating = v.averageRating
        ? `${v.averageRating.toFixed(1)} (${v.totalReviews || 0} reviews)`
        : 'unrated';
      const area = v.address.city || 'n/a';
      const meals = (v.mealTypes || []).join(', ');
      return `- ${v.name} | ${cuisines} | ${tags} | ${price} | ${rating} | ${area}${meals ? ` | ${meals}` : ''}`;
    });

    const systemInstruction = `
You are the professional, sophisticated, and warm digital Maitre D' (Concierge) for RestroNet, Kathmandu's premier restaurant discovery platform.
Your purpose is to guide diners to exceptional culinary experiences.

Key Guidelines:
1. Brand Voice: Elegant, helpful, knowledgeable, and polite. Keep the tone hospitable and clean. Reply in plain text only — no markdown, no asterisks, no bullet symbols, no emojis.
2. Contextual Recommendations: Draw recommendations ONLY from the RestroNet directory provided below. Explain why a recommendation matches their search context.
3. Currency/Prices: Refer to price ranges:
   - 1 ($) = Budget (<500 NPR per person)
   - 2 ($$) = Mid-range (500-1500 NPR per person)
   - 3 ($$$) = Premium (1500-3000 NPR per person)
   - 4 ($$$$) = Luxury (>3000 NPR per person)
4. Output Details: When suggesting a restaurant, state its name clearly and include key details (cuisines, mood, rating, location).

RESTRONET RESTAURANT DIRECTORY (name | cuisines | tags | price | rating | area | meal types):
${venueLines.join('\n')}

Ensure responses are concise (under 3 paragraphs) and directly answer the diner's request.
`;

    // 2. Build the OpenAI-style message list. Client history uses
    // { role: 'user' | 'model', text }; map 'model' -> 'assistant'.
    const messages = [
      { role: 'system', content: systemInstruction },
      ...history.map(chat => ({
        role: chat.role === 'user' ? 'user' : 'assistant',
        content: chat.text,
      })),
      { role: 'user', content: message },
    ];

    // 3. Call Groq
    const { data } = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    // gpt-oss ignores "plain text only" — strip markdown emphasis/bullets so
    // the chat bubble (which renders raw text) doesn't show literal ** and *.
    const stripMarkdown = (s) => (s || '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, '$1$2')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^#{1,6}\s+/gm, '')
      .trim();

    const responseText = stripMarkdown(data?.choices?.[0]?.message?.content);
    if (!responseText) {
      return res.status(502).json({
        success: false,
        message: 'The concierge received an empty response. Please try again.',
      });
    }

    // 4. Return the new message and updated history to client
    const updatedHistory = [
      ...history,
      { role: 'user', text: message },
      { role: 'model', text: responseText },
    ];

    res.json({
      success: true,
      response: responseText,
      history: updatedHistory,
    });
  } catch (error) {
    // Surface Groq API errors without leaking the key
    if (error.response) {
      console.error('Groq Chat Error:', error.response.status, error.response.data);
      return res.status(502).json({
        success: false,
        message: 'The concierge is unavailable right now. Please try again shortly.',
      });
    }
    next(error);
  }
};

module.exports = { handleChat };
