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
    
    const cuisines = await Cuisine.create([
      { name: 'Nepali' }, { name: 'Newari' }, { name: 'Indian' }, { name: 'Italian' }, 
      { name: 'Chinese' }, { name: 'Continental' }, { name: 'Japanese' }, 
      { name: 'Korean' }, { name: 'Thai' }, { name: 'Tibetan' }, { name: 'Asian' }
    ]);
    const getCuisineId = (name) => cuisines.find(c => c.name === name)._id;

    const tags = await Tag.create([
      { name: 'Outdoor Seating', category: 'facility' },
      { name: 'Live Music', category: 'ambience' },
      { name: 'Family Friendly', category: 'occasion' },
      { name: 'Romantic', category: 'ambience' },
      { name: 'Vegan Options', category: 'food' },
      { name: 'Rooftop View', category: 'ambience' },
      { name: 'Pet Friendly', category: 'facility' },
      { name: 'Late Night', category: 'occasion' },
      { name: 'Budget Friendly', category: 'occasion' },
      { name: 'Fine Dining', category: 'occasion' }
    ]);
    const getTagId = (name) => tags.find(t => t.name === name)._id;

    const categories = await Category.create([
      { name: 'Fine Dining' }, { name: 'Cafe' }, { name: 'Fast Food' }, 
      { name: 'Pub' }, { name: 'Casual Dining' }, { name: 'Bakery' }
    ]);
    const getCatId = (name) => categories.find(c => c.name === name)._id;

    // ─── VENUES ───────────────────────────────────────────────────────────────
    console.log('Creating 30+ Venues...');
    
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
        tags: [getTagId('Family Friendly'), getTagId('Vegan Options'), getTagId('Outdoor Seating')],
        category: getCatId('Casual Dining'),
        priceRange: 2,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        averageRating: 4.8,
        totalReviews: 850,
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
        priceRange: 3,
        mealTypes: ['dinner'],
        averageRating: 4.2,
        totalReviews: 85,
        isActive: true
      },
      {
        name: 'OR2K',
        description: 'Popular Middle Eastern and Mediterranean vegetarian restaurant with a cozy floor-seating ambience.',
        address: { street: 'Mandala Street, Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3118, 27.7149] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Vegan Options'), getTagId('Family Friendly'), getTagId('Late Night')],
        category: getCatId('Casual Dining'),
        priceRange: 2,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        averageRating: 4.6,
        totalReviews: 1200,
        isActive: true
      },
      {
        name: 'Roadhouse Cafe Thamel',
        description: 'Signature wood-fired pizzas, pastas, and great coffee in a rustic environment.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3125, 27.7152] },
        cuisines: [getCuisineId('Italian'), getCuisineId('Continental')],
        tags: [getTagId('Family Friendly'), getTagId('Outdoor Seating')],
        category: getCatId('Cafe'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.5,
        totalReviews: 650,
        isActive: true
      },
      {
        name: 'Hankook Sarang',
        description: 'Authentic Korean BBQ and traditional dishes in the heart of Thamel.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3120, 27.7160] },
        cuisines: [getCuisineId('Korean')],
        tags: [getTagId('Family Friendly'), getTagId('Outdoor Seating')],
        category: getCatId('Casual Dining'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.4,
        totalReviews: 400,
        isActive: true
      },
      {
        name: 'Le Sherpa',
        description: 'Upscale dining featuring European cuisine, a beautiful garden setting, and organic ingredients.',
        address: { street: 'Maharajgunj', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3300, 27.7380] },
        cuisines: [getCuisineId('Continental'), getCuisineId('Italian')],
        tags: [getTagId('Romantic'), getTagId('Outdoor Seating'), getTagId('Fine Dining')],
        category: getCatId('Fine Dining'),
        priceRange: 4,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.7,
        totalReviews: 320,
        isActive: true
      },
      {
        name: 'Himalayan Java Coffee',
        description: 'Nepal’s premier coffee house serving locally sourced coffee and great bakery items.',
        address: { street: 'Tridevi Marg, Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3140, 27.7145] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Family Friendly'), getTagId('Vegan Options')],
        category: getCatId('Cafe'),
        priceRange: 2,
        mealTypes: ['breakfast', 'lunch'],
        averageRating: 4.5,
        totalReviews: 950,
        isActive: true
      },
      {
        name: 'New Everest Momo Center',
        description: 'Legendary spot for delicious and affordable buff momos with their signature sauce.',
        address: { street: 'Lekhnath Marg', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3150, 27.7170] },
        cuisines: [getCuisineId('Tibetan'), getCuisineId('Nepali')],
        tags: [getTagId('Budget Friendly')],
        category: getCatId('Fast Food'),
        priceRange: 1,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.4,
        totalReviews: 2100,
        isActive: true
      },
      {
        name: 'Kaiser Cafe',
        description: 'Located inside the Garden of Dreams, offering a peaceful and romantic dining experience.',
        address: { street: 'Garden of Dreams, Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3146, 27.7142] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Romantic'), getTagId('Outdoor Seating')],
        category: getCatId('Cafe'),
        priceRange: 3,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        averageRating: 4.6,
        totalReviews: 540,
        isActive: true
      },
      {
        name: 'Krishnarpan Restaurant',
        description: 'A luxurious slow-dining experience serving authentic multi-course Nepali cuisine.',
        address: { street: 'Dwarikas Hotel, Battisputali', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3430, 27.7050] },
        cuisines: [getCuisineId('Nepali'), getCuisineId('Newari')],
        tags: [getTagId('Fine Dining'), getTagId('Family Friendly')],
        category: getCatId('Fine Dining'),
        priceRange: 4,
        mealTypes: ['dinner'],
        averageRating: 4.9,
        totalReviews: 680,
        isActive: true
      },
      {
        name: 'Third Eye Restaurant',
        description: 'Long-standing upscale Indian and Nepalese restaurant serving excellent tandoori.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3135, 27.7150] },
        cuisines: [getCuisineId('Indian'), getCuisineId('Nepali')],
        tags: [getTagId('Family Friendly'), getTagId('Romantic')],
        category: getCatId('Casual Dining'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.3,
        totalReviews: 450,
        isActive: true
      },
      {
        name: 'Rosemary Kitchen & Coffee Shop',
        description: 'A brilliant mix of European and Asian cuisine tucked away in a quiet courtyard.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3120, 27.7135] },
        cuisines: [getCuisineId('Continental'), getCuisineId('Asian')],
        tags: [getTagId('Outdoor Seating'), getTagId('Vegan Options')],
        category: getCatId('Casual Dining'),
        priceRange: 2,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        averageRating: 4.7,
        totalReviews: 890,
        isActive: true
      },
      {
        name: 'Yangling Tibetan Restaurant',
        description: 'Renowned for the best pork momos and hearty Tibetan Thukpa.',
        address: { street: 'Kaldhara Marg, Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3105, 27.7165] },
        cuisines: [getCuisineId('Tibetan'), getCuisineId('Chinese')],
        tags: [getTagId('Budget Friendly'), getTagId('Family Friendly')],
        category: getCatId('Casual Dining'),
        priceRange: 1,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.5,
        totalReviews: 530,
        isActive: true
      },
      {
        name: 'Pumpernickel Bakery',
        description: 'A classic breakfast spot serving freshly baked breads, croissants, and great coffee.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3122, 27.7140] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Outdoor Seating'), getTagId('Budget Friendly')],
        category: getCatId('Bakery'),
        priceRange: 1,
        mealTypes: ['breakfast', 'lunch'],
        averageRating: 4.2,
        totalReviews: 310,
        isActive: true
      },
      {
        name: 'Trisara',
        description: 'Vibrant outdoor setting with great live music, cocktails, and multi-cuisine dishes.',
        address: { street: 'Lazimpat', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3170, 27.7200] },
        cuisines: [getCuisineId('Continental'), getCuisineId('Indian'), getCuisineId('Chinese')],
        tags: [getTagId('Live Music'), getTagId('Outdoor Seating'), getTagId('Late Night')],
        category: getCatId('Pub'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.3,
        totalReviews: 1200,
        isActive: true
      },
      {
        name: 'Bricks Cafe',
        description: 'Wood-fired pizzas and continental food in a beautifully restored Rana-era building.',
        address: { street: 'Kupondole', city: 'Lalitpur', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3155, 27.6850] },
        cuisines: [getCuisineId('Continental'), getCuisineId('Italian')],
        tags: [getTagId('Romantic'), getTagId('Outdoor Seating'), getTagId('Family Friendly')],
        category: getCatId('Casual Dining'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.4,
        totalReviews: 540,
        isActive: true
      },
      {
        name: 'Vesper House',
        description: 'Premium Italian dining with an extensive wine collection and a beautiful courtyard.',
        address: { street: 'Jhamsikhel', city: 'Lalitpur', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3090, 27.6750] },
        cuisines: [getCuisineId('Italian')],
        tags: [getTagId('Fine Dining'), getTagId('Romantic'), getTagId('Outdoor Seating')],
        category: getCatId('Fine Dining'),
        priceRange: 4,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.6,
        totalReviews: 320,
        isActive: true
      },
      {
        name: 'Dan Ran',
        description: 'Authentic Japanese cuisine featuring exceptional sushi and a peaceful garden setting.',
        address: { street: 'Jhamsikhel', city: 'Lalitpur', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3085, 27.6760] },
        cuisines: [getCuisineId('Japanese')],
        tags: [getTagId('Outdoor Seating'), getTagId('Family Friendly')],
        category: getCatId('Casual Dining'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.7,
        totalReviews: 290,
        isActive: true
      },
      {
        name: 'Evoke Cafe & Bistro',
        description: 'A trendy hub with an open-air vibe, serving excellent coffee, burgers, and continental dishes.',
        address: { street: 'Jhamsikhel', city: 'Lalitpur', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3100, 27.6740] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Outdoor Seating'), getTagId('Pet Friendly')],
        category: getCatId('Cafe'),
        priceRange: 2,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        averageRating: 4.4,
        totalReviews: 610,
        isActive: true
      },
      {
        name: 'Bawarchi',
        description: 'Famed for its mouth-watering Indian Mughlai cuisine and Kolkata-style Kathi rolls.',
        address: { street: 'Babarmahal', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3250, 27.6950] },
        cuisines: [getCuisineId('Indian')],
        tags: [getTagId('Family Friendly')],
        category: getCatId('Casual Dining'),
        priceRange: 2,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.3,
        totalReviews: 480,
        isActive: true
      },
      {
        name: 'The Old House',
        description: 'A fine-dining French and Asian fusion restaurant offering a premium gastronomic experience.',
        address: { street: 'Durbar Marg', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3175, 27.7120] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Fine Dining'), getTagId('Romantic')],
        category: getCatId('Fine Dining'),
        priceRange: 4,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.8,
        totalReviews: 210,
        isActive: true
      },
      {
        name: 'Kathmandu Steak House',
        description: 'The best steaks in town paired with great wine and impeccable service.',
        address: { street: 'Chaksibari Marg, Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3105, 27.7145] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Romantic')],
        category: getCatId('Fine Dining'),
        priceRange: 3,
        mealTypes: ['dinner'],
        averageRating: 4.5,
        totalReviews: 380,
        isActive: true
      },
      {
        name: 'Gokarna House Restaurant',
        description: 'Enjoy traditional Nepali thali while watching cultural dance performances.',
        address: { street: 'Paknajol, Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3110, 27.7175] },
        cuisines: [getCuisineId('Nepali')],
        tags: [getTagId('Live Music'), getTagId('Family Friendly')],
        category: getCatId('Casual Dining'),
        priceRange: 2,
        mealTypes: ['dinner'],
        averageRating: 4.2,
        totalReviews: 410,
        isActive: true
      },
      {
        name: 'Utsav Authentic Nepali Restaurant',
        description: 'A vibrant setting to enjoy unlimited Nepali thali and cultural shows.',
        address: { street: 'Durbar Marg', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3180, 27.7115] },
        cuisines: [getCuisineId('Nepali'), getCuisineId('Newari')],
        tags: [getTagId('Family Friendly'), getTagId('Live Music')],
        category: getCatId('Fine Dining'),
        priceRange: 3,
        mealTypes: ['dinner'],
        averageRating: 4.1,
        totalReviews: 300,
        isActive: true
      },
      {
        name: 'Yin Yang Restaurant',
        description: 'A blend of excellent Thai cuisine and continental dishes with a lovely terrace.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3125, 27.7138] },
        cuisines: [getCuisineId('Thai'), getCuisineId('Continental')],
        tags: [getTagId('Outdoor Seating'), getTagId('Romantic')],
        category: getCatId('Casual Dining'),
        priceRange: 3,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.4,
        totalReviews: 460,
        isActive: true
      },
      {
        name: 'Electric Pagoda Bar',
        description: 'A laid-back bar offering Mexican bites, chilled beer, and an eclectic courtyard.',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3115, 27.7155] },
        cuisines: [getCuisineId('Continental')], // Mexican fallback
        tags: [getTagId('Live Music'), getTagId('Late Night'), getTagId('Outdoor Seating')],
        category: getCatId('Pub'),
        priceRange: 2,
        mealTypes: ['dinner', 'snacks'],
        averageRating: 4.3,
        totalReviews: 390,
        isActive: true
      },
      {
        name: 'Alina\'s Bakery Cafe',
        description: 'A neighborhood favorite for quick bites, pastries, and casual meetings.',
        address: { street: 'Jawalakhel', city: 'Lalitpur', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3140, 27.6730] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Family Friendly'), getTagId('Budget Friendly')],
        category: getCatId('Bakery'),
        priceRange: 1,
        mealTypes: ['breakfast', 'lunch'],
        averageRating: 4.0,
        totalReviews: 550,
        isActive: true
      },
      {
        name: 'Utse Restaurant',
        description: 'One of the oldest Tibetan restaurants in Kathmandu, offering authentic Gyakok (hot pot).',
        address: { street: 'Thamel', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3130, 27.7140] },
        cuisines: [getCuisineId('Tibetan'), getCuisineId('Chinese')],
        tags: [getTagId('Family Friendly'), getTagId('Budget Friendly')],
        category: getCatId('Casual Dining'),
        priceRange: 2,
        mealTypes: ['lunch', 'dinner'],
        averageRating: 4.1,
        totalReviews: 280,
        isActive: true
      },
      {
        name: 'The Yard by Oasis Garden Homes',
        description: 'A hidden oasis serving excellent Continental food away from the city noise.',
        address: { street: 'Patan', city: 'Lalitpur', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.3210, 27.6700] },
        cuisines: [getCuisineId('Continental')],
        tags: [getTagId('Outdoor Seating'), getTagId('Romantic')],
        category: getCatId('Cafe'),
        priceRange: 2,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        averageRating: 4.6,
        totalReviews: 180,
        isActive: true
      }
    ];

    // Reset ratings and review counts to 0 so they are driven solely by user actions
    const cleanedVenuesData = venuesData.map(v => ({
      ...v,
      averageRating: 0,
      totalReviews: 0
    }));

    const createdVenues = await Venue.create(cleanedVenuesData);
    console.log(`✅ Successfully created ${createdVenues.length} venues.`);

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
