const { GoogleGenerativeAI } = require('@google/generative-ai');
const Venue = require('../models/Venue');

/**
 * @desc    Chat with the AI Maitre D' (Concierge)
 * @route   POST /api/chat
 * @access  Public
 */
const handleChat = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Gemini API key is not configured on the server.' 
      });
    }

    // 1. Fetch active venues to populate the AI knowledge base
    const venues = await Venue.find({ isActive: true })
      .populate('cuisines tags category')
      .lean();

    const venueList = venues.map(v => ({
      name: v.name,
      slug: v.slug,
      description: v.description,
      city: v.address.city,
      street: v.address.street,
      cuisines: v.cuisines.map(c => c.name),
      tags: v.tags.map(t => t.name),
      priceRange: v.priceRange, // 1-4 scale
      averageRating: v.averageRating,
      totalReviews: v.totalReviews,
      mealTypes: v.mealTypes || [],
    }));

    const systemInstruction = `
You are the professional, sophisticated, and warm digital Maitre D' (Concierge) for RestroNet, Kathmandu's premier restaurant discovery platform.
Your purpose is to guide diners to exceptional culinary experiences.

Key Guidelines:
1. Brand Voice: Elegant, helpful, knowledgeable, and polite. Keep the tone hospitable and clean (no gimmicks, no emojis, no excessive markup).
2. Contextual Recommendations: Draw recommendations ONLY from the RestroNet directory provided below. Explain why a recommendation matches their search context.
3. Currency/Prices: Refer to price ranges:
   - 1 ($) = Budget (<500 NPR per person)
   - 2 ($$) = Mid-range (500-1500 NPR per person)
   - 3 ($$$) = Premium (1500-3000 NPR per person)
   - 4 ($$$$) = Luxury (>3000 NPR per person)
4. Output Details: When suggesting a restaurant, state its name clearly and include key details (cuisines, mood, rating, location).

RESTRONET RESTAURANT DIRECTORY:
${JSON.stringify(venueList, null, 2)}

Ensure responses are concise (under 3 paragraphs) and directly answer the diner's request.
`;

    // 2. Initialize Gemini Chat Session with History
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction
    });

    // Format history for Google Gen AI Chat API
    // Roles must be 'user' or 'model'
    const formattedHistory = history.map(chat => ({
      role: chat.role === 'user' ? 'user' : 'model',
      parts: [{ text: chat.text }]
    }));

    const chatSession = model.startChat({
      history: formattedHistory,
    });

    const result = await chatSession.sendMessage(message);
    const responseText = result.response.text();

    // 3. Return the new message and updated history to client
    const updatedHistory = [
      ...history,
      { role: 'user', text: message },
      { role: 'model', text: responseText }
    ];

    res.json({
      success: true,
      response: responseText,
      history: updatedHistory
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { handleChat };
