const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Cuisine, Category, Tag } = require('../models/Metadata');
const Venue = require('../models/Venue');

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const cuisinesData = [
  { name: 'Newari', description: 'Traditional local Nepalese cuisine' },
  { name: 'Italian', description: 'Authentic pasta and pizzas' },
  { name: 'Japanese', description: 'Sushi, Ramen and more' },
  { name: 'Indian', description: 'Spices and curries' },
  { name: 'Continental', description: 'Western European dishes' },
  { name: 'Chinese', description: 'Authentic flavors from China' },
  { name: 'Thai', description: 'Spicy and herbal Thai favorites' },
  { name: 'Korean', description: 'K-BBQ and Kimchi' },
  { name: 'Mediterranean', description: 'Fresh and healthy flavors' }
].map(c => ({ ...c, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));

const categoriesData = [
  { name: 'Fine Dining', description: 'Premium dining experience' },
  { name: 'Cafe', description: 'Cozy spots for coffee and snacks' },
  { name: 'Restro-Bar', description: 'Dine and drink with music' },
  { name: 'Fast Food', description: 'Quick and tasty meals' },
  { name: 'Bakery', description: 'Freshly baked goods' },
  { name: 'Bistro', description: 'Casual and cozy atmosphere' }
].map(c => ({ ...c, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));

const tagsData = [
  { name: 'Rooftop', category: 'ambience' },
  { name: 'Live Music', category: 'ambience' },
  { name: 'Romantic', category: 'ambience' },
  { name: 'Family Friendly', category: 'ambience' },
  { name: 'Wifi', category: 'facility' },
  { name: 'Outdoor Seating', category: 'ambience' },
  { name: 'Vegan Options', category: 'food' },
  { name: 'Quiet', category: 'ambience' },
  { name: 'Pet Friendly', category: 'ambience' },
  { name: 'Late Night', category: 'ambience' }
].map(t => ({ ...t, slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));

// Helper to generate coordinates within radius
// Center Thamel: [85.3110, 27.7145]
const generateCoords = (radiusKm) => {
  const y0 = 27.7145;
  const x0 = 85.3110;
  const rd = radiusKm / 111.3; // 1 degree is ~111.3km

  const u = Math.random();
  const v = Math.random();
  const w = rd * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  return [x0 + x, y0 + y];
};

const prefixes = ['The', 'Golden', 'Spicy', 'Urban', 'Royal', 'Little', 'Mama', 'Papa', 'Red', 'Blue', 'Green', 'Wild', 'Misty', 'Crystal', 'Hidden', 'Vintage', 'Modern', 'Rustic', 'Elegant'];
const nouns = ['Kitchen', 'Garden', 'House', 'Table', 'Plate', 'Fork', 'Spoon', 'Himalaya', 'Everest', 'Valley', 'Corner', 'Spot', 'Bistro', 'Hub', 'Diner', 'Eatery', 'Lounge', 'Vault'];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not defined in environment');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await Promise.all([
      Cuisine.deleteMany(),
      Category.deleteMany(),
      Tag.deleteMany(),
      Venue.deleteMany()
    ]);
    console.log('Cleared existing data');

    const cuisines = await Cuisine.insertMany(cuisinesData);
    const categories = await Category.insertMany(categoriesData);
    const tags = await Tag.insertMany(tagsData);
    console.log('Seeded metadata');

    const venues = [];
    
    // Add real iconic ones first
    const iconic = [
      {
        name: 'Fire and Ice Pizzeria',
        desc: 'Iconic Italian pizzeria in Thamel.',
        price: 3, rating: 4.8, 
        cuis: ['Italian'], cat: 'Restro-Bar',
        tags: ['Family Friendly', 'Wifi'],
        coords: [85.3110, 27.7145] // Center
      },
      {
        name: 'Garden of Dreams Cafe',
        desc: 'Oasis of tranquility in Kaiser Mahal.',
        price: 4, rating: 4.6,
        cuis: ['Continental'], cat: 'Cafe',
        tags: ['Romantic', 'Quiet', 'Outdoor Seating'],
        coords: [85.3150, 27.7130] // Very near
      },
      {
        name: 'Le Sherpa',
        desc: 'High-end European dining in Maharajgunj.',
        price: 4, rating: 4.8,
        cuis: ['Continental'], cat: 'Fine Dining',
        tags: ['Romantic', 'Outdoor Seating', 'Quiet'],
        coords: [85.3340, 27.7340] // ~3km away
      },
      {
        name: 'The furthest Spot',
        desc: 'A test restaurant exactly 9.5km away.',
        price: 2, rating: 4.0,
        cuis: ['Newari'], cat: 'Restro-Bar',
        tags: ['Family Friendly'],
        coords: [85.3110 + 0.08, 27.7145 + 0.02] // Approx 9km+
      }
    ];

    iconic.forEach(v => {
      venues.push({
        name: v.name,
        slug: v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: v.desc,
        address: { street: 'Main St', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: v.coords },
        priceRange: v.price,
        isActive: true,
        averageRating: v.rating,
        totalReviews: Math.floor(Math.random() * 1000) + 100,
        cuisines: v.cuis.map(name => cuisines.find(c => c.name === name)._id),
        category: categories.find(c => c.name === v.cat)._id,
        tags: v.tags.map(name => tags.find(t => t.name === name)._id)
      });
    });

    // Generate 50+ more
    for (let i = 0; i < 55; i++) {
      const radius = Math.random() * 9.8; // within 10km
      const cuisCount = Math.floor(Math.random() * 2) + 1;
      const tagCount = Math.floor(Math.random() * 3) + 1;
      
      const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const fullName = `${pref} ${noun} ${i+1}`;
      
      const venueCuisines = [];
      for (let j = 0; j < cuisCount; j++) {
        const c = cuisines[Math.floor(Math.random() * cuisines.length)]._id;
        if (!venueCuisines.includes(c)) venueCuisines.push(c);
      }

      const venueTags = [];
      for (let j = 0; j < tagCount; j++) {
        const t = tags[Math.floor(Math.random() * tags.length)]._id;
        if (!venueTags.includes(t)) venueTags.push(t);
      }

      venues.push({
        name: fullName,
        slug: fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `Experience the finest flavors of ${fullName} in a vibrant atmosphere.`,
        address: { street: `Street ${i+1}`, city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: generateCoords(radius) },
        priceRange: Math.floor(Math.random() * 4) + 1,
        isActive: true,
        averageRating: (Math.random() * 2 + 3).toFixed(1),
        totalReviews: Math.floor(Math.random() * 500) + 10,
        cuisines: venueCuisines,
        category: categories[Math.floor(Math.random() * categories.length)]._id,
        tags: venueTags
      });
    }

    // Reset ratings and review counts to 0 so they are driven solely by user actions
    const cleanedVenues = venues.map(v => ({
      ...v,
      averageRating: 0,
      totalReviews: 0
    }));

    await Venue.insertMany(cleanedVenues);
    console.log(`Successfully seeded ${cleanedVenues.length} venues around Thamel!`);

    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seed();
