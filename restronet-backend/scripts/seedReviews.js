require('dotenv').config();
const mongoose = require('mongoose');
require('../models/Metadata');
const Venue = require('../models/Venue');
const User = require('../models/User');
const Review = require('../models/Review');

// Synthetic diner accounts used only to generate realistic seed reviews.
// Clearly marked as seed data via email domain.
const SEED_DINERS = [
  'Anish Shrestha', 'Priya Gurung', 'Sujan Rai', 'Anjali Tamang', 'Bikash Thapa',
  'Sarina Maharjan', 'Rohan Basnet', 'Nisha Karki', 'Prakash Adhikari', 'Sabina Lama',
  'Dipesh Poudel', 'Manisha Shakya', 'Kiran Bhattarai', 'Rupa Joshi', 'Aakash Bogati',
].map((name, i) => ({
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}.seed${i}@restronet-seed.local`,
  password: 'SeedDiner123!',
}));

const POSITIVE_COMMENTS = [
  'Absolutely loved this place — the {dish} was cooked to perfection and the staff were so attentive.',
  'One of the best meals I\'ve had in Kathmandu recently. The {dish} stood out, will definitely be back.',
  'Great ambience and even better food. The {dish} is a must-try if you visit.',
  'Consistently good every time I come here. The {dish} never disappoints.',
  'Friendly service, cozy atmosphere, and the {dish} was fantastic. Highly recommend for a casual dinner.',
  'Impressed by the quality here. The {dish} was fresh and flavorful, and prices are fair for what you get.',
];

const MIXED_COMMENTS = [
  'Food was decent, the {dish} was good but service was a bit slow during peak hours.',
  'Nice spot overall. The {dish} was tasty though a little pricey for the portion size.',
  'Solid choice for a quick meal. The {dish} was good, ambience could use a refresh though.',
  'Enjoyed the {dish}, though we waited a while to get seated on a busy evening.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildComment(templates, dishName) {
  return pick(templates).replace('{dish}', dishName);
}

async function ensureSeedUsers() {
  const created = [];
  for (const diner of SEED_DINERS) {
    let user = await User.findOne({ email: diner.email });
    if (!user) {
      user = await User.create(diner);
    }
    created.push(user);
  }
  return created;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const Menu = require('../models/Menu');
    const users = await ensureSeedUsers();
    console.log(`Seed diners ready: ${users.length}`);

    const venues = await Venue.find({}).lean();

    for (const venue of venues) {
      const existingCount = await Review.countDocuments({ venue: venue._id });
      if (existingCount > 0) {
        console.log(`${venue.name}: already has ${existingCount} review(s), skipping`);
        continue;
      }

      const menu = await Menu.findOne({ venue: venue._id }).lean();
      const dishNames = (menu?.items || []).map(i => i.name);
      const dishName = dishNames.length ? pick(dishNames) : 'food';

      // 3–6 reviews per venue, drawn from a shuffled subset of seed diners.
      const reviewCount = 3 + Math.floor(Math.random() * 4);
      const shuffled = [...users].sort(() => Math.random() - 0.5).slice(0, reviewCount);

      for (const user of shuffled) {
        // Mostly positive (4-5 stars), occasional mixed (3 stars) for realism.
        const isMixed = Math.random() < 0.25;
        const overall = isMixed ? 3 : (Math.random() < 0.6 ? 5 : 4);
        const comment = buildComment(isMixed ? MIXED_COMMENTS : POSITIVE_COMMENTS, dishName);

        try {
          await Review.create({
            venue: venue._id,
            user: user._id,
            rating: { overall },
            comment,
          });
        } catch (err) {
          if (err.code !== 11000) throw err; // ignore duplicate (venue,user) pairs
        }
      }

      console.log(`${venue.name}: created ${shuffled.length} reviews`);
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
