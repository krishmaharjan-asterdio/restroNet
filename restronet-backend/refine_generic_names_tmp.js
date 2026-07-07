require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('./models/Venue');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const venues = await Venue.find({ source: 'osm' }, 'name').lean();

  const genericPatterns = [
    /khaja\s*ghar/i,
    /khajaghar/i,
    /\bmomo\s*(center|corner|house|hut)?\s*$/i,
    /^momo\b/i,
    /\bfast\s*food\b/i,
    /\bfastfood\b/i,
    /bhojanalaya/i,
    /\btea\s*shop\b/i,
    /\bguest\s*house\b/i,
    /\btandoori\b.*\bfast\b/i,
  ];

  const flagged = venues.filter(v => genericPatterns.some(p => p.test(v.name)));
  console.log('Flagged count:', flagged.length);
  flagged.forEach(v => console.log('-', v.name));

  await mongoose.disconnect();
})();
