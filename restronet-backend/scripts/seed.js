require('dotenv').config();
const mongoose = require('mongoose');
const { Cuisine, Tag, Category } = require('../models/Metadata');
const Venue = require('../models/Venue');
const Menu = require('../models/Menu');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { buildRestaurantFeatureVector } = require('../services/cbf-pipeline');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('✅ Connected to MongoDB');

    // ─── CLEAR EXISTING DATA ──────────────────────────────────────────────────
    console.log('Dropping database to clear old indexes...');
    await mongoose.connection.db.dropDatabase();

    // ─── ADMIN ────────────────────────────────────────────────────────────────
    console.log('Creating Admin...');
    await Admin.create({
      name: 'Super Admin',
      email: 'admin@restronet.com',
      password: 'password123',
      role: 'superadmin'
    });

    // ─── USER ─────────────────────────────────────────────────────────────────
    console.log('Creating User...');
    const user = await User.create({
      name: 'Test User',
      email: 'user@restronet.com',
      password: 'password123',
      location: { type: 'Point', coordinates: [85.3240, 27.7172] } // Kathmandu
    });

    // ─── METADATA ─────────────────────────────────────────────────────────────
    console.log('Creating Metadata...');
    
    // Cuisines
    const cuisines = await Cuisine.create([
      { name: 'Nepali' }, { name: 'Newari' }, { name: 'Indian' },
      { name: 'Italian' }, { name: 'Chinese' }, { name: 'Continental' }
    ]);
    const getCuisineId = (name) => cuisines.find(c => c.name === name)._id;

    // Tags
    const tags = await Tag.create([
      { name: 'Outdoor Seating', category: 'facility' },
      { name: 'Live Music', category: 'ambience' },
      { name: 'Family Friendly', category: 'occasion' },
      { name: 'Romantic', category: 'ambience' },
      { name: 'Vegan Options', category: 'food' }
    ]);
    const getTagId = (name) => tags.find(t => t.name === name)._id;

    // Categories
    const categories = await Category.create([
      { name: 'Fine Dining' }, { name: 'Cafe' }, { name: 'Fast Food' }, { name: 'Pub' }
    ]);
    const getCatId = (name) => categories.find(c => c.name === name)._id;

    // ─── VENUES ───────────────────────────────────────────────────────────────
    console.log('Creating Venues...');
    
    const venuesData = [
      {
        name: 'Bhojan Griha',
        description: 'Authentic organic Nepali food served in a traditional 150-year-old heritage building.',
        address: { street: 'Dilli Bazar', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3265, 27.7058] },
        cuisines: [getCuisineId('Nepali'), getCuisineId('Newari')],
        tags: [getTagId('Family Friendly'), getTagId('Live Music')],
        category: getCatId('Fine Dining'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.5,
        totalReviews: 120,
        isActive: true
      },
      {
        name: 'Fire And Ice Pizzeria',
        description: 'Famous for the best traditional Italian pizzas, pastas, and desserts in Kathmandu.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3130, 27.7145] },
        cuisines: [getCuisineId('Italian'), getCuisineId('Continental')],
        tags: [getTagId('Family Friendly'), getTagId('Vegan Options')],
        category: getCatId('Cafe'),
        priceRange: 2,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        averageRating: 4.8,
        totalReviews: 450,
        isActive: true
      },
      {
        name: 'Mezesh Restaurant & Bar',
        description: 'A cozy spot for Indian and Continental food with great outdoor seating and romantic ambience.',
        address: { street: 'Jhamsikhel', city: 'Lalitpur', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3115, 27.6744] },
        cuisines: [getCuisineId('Indian'), getCuisineId('Continental')],
        tags: [getTagId('Outdoor Seating'), getTagId('Romantic')],
        category: getCatId('Pub'),
        priceRange: 4,
        mealTypes: ['dinner'],
        averageRating: 4.2,
        totalReviews: 85,
        isActive: true
      }
    ];

    const createdVenues = await Venue.create(venuesData);

    // ─── FEATURE VECTORS ──────────────────────────────────────────────────────
    console.log('Building CBF Feature Vectors...');
    for (const venue of createdVenues) {
      await buildRestaurantFeatureVector(venue._id);
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
