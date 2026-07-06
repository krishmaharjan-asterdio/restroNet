require('dotenv').config();
const mongoose = require('mongoose');
const { Cuisine, Tag, Category } = require('../models/Metadata');
const Admin = require('../models/Admin');
const User = require('../models/User');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('✅ Connected to MongoDB');

    console.log('Dropping database to clear old indexes...');
    await mongoose.connection.db.dropDatabase();

    console.log('Creating Admin...');
    await Admin.create({
      name: 'Super Admin',
      email: 'admin@restronet.com',
      password: 'password123',
      role: 'superadmin'
    });

    console.log('Creating User...');
    await User.create({
      name: 'Test User',
      email: 'user@restronet.com',
      password: 'password123',
      location: { type: 'Point', coordinates: [85.3240, 27.7172] }
    });

    console.log('Creating Metadata...');
    await Cuisine.create([
      { name: 'Nepali' }, { name: 'Newari' }, { name: 'Indian' }, { name: 'Italian' },
      { name: 'Chinese' }, { name: 'Continental' }, { name: 'Japanese' },
      { name: 'Korean' }, { name: 'Thai' }, { name: 'Tibetan' }, { name: 'Asian' }
    ]);

    await Tag.create([
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

    await Category.create([
      { name: 'Fine Dining' }, { name: 'Cafe' }, { name: 'Fast Food' },
      { name: 'Pub' }, { name: 'Casual Dining' }, { name: 'Bakery' }
    ]);

    console.log('✅ Seeding complete! Log in to the admin panel and use Bulk Import to populate restaurants from OpenStreetMap.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
