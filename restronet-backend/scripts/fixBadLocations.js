require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');

const FIXES = {
  'Outback Steakhouse': {
    street: 'Durbar Marg',
    coordinates: [85.3188, 27.7108],
  },
  'Hard Rock Cafe: Punta Cana': {
    street: 'Durbar Marg',
    coordinates: [85.3192, 27.7112],
  },
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    for (const [name, fix] of Object.entries(FIXES)) {
      const venue = await Venue.findOne({ name });
      if (!venue) {
        console.log(`${name}: not found, skipping`);
        continue;
      }
      venue.address.street = fix.street;
      venue.address.city = 'Kathmandu';
      venue.address.country = 'Nepal';
      venue.location = { type: 'Point', coordinates: fix.coordinates };
      await venue.save();
      console.log(`${name}: updated to ${fix.street}, Kathmandu ${fix.coordinates}`);
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
