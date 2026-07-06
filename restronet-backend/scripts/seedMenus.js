require('dotenv').config();
const mongoose = require('mongoose');
const { Cuisine } = require('../models/Metadata');
const Venue = require('../models/Venue');
const Menu = require('../models/Menu');

// Fixes for venues with wrong/missing cuisine tags, discovered while seeding menus.
const CUISINE_FIXES = {
  'Pizza World': ['Italian'],
  'Outback Steakhouse': ['Continental'],
  'Hard Rock Cafe: Punta Cana': ['Continental'],
};

const TEMPLATES = {
  Nepali: {
    name: 'Nepali Thali & Specialties',
    items: [
      { name: 'Dal Bhat Tarkari', description: 'Steamed rice, lentil soup, seasonal vegetable curry, and pickle', price: 350, category: 'Mains', isVegetarian: true },
      { name: 'Chicken Momo', description: 'Steamed dumplings filled with spiced minced chicken, served with tomato achar', price: 280, category: 'Starters' },
      { name: 'Sekuwa Platter', description: 'Grilled marinated meat skewers with chiura and pickles', price: 450, category: 'Mains' },
      { name: 'Gundruk Soup', description: 'Fermented leafy green soup, a Nepali staple', price: 150, category: 'Starters', isVegetarian: true, isVegan: true },
      { name: 'Sel Roti', description: 'Traditional Nepali rice doughnut', price: 120, category: 'Desserts', isVegetarian: true },
      { name: 'Masala Chiya', description: 'Spiced Nepali milk tea', price: 80, category: 'Beverages', isVegetarian: true },
    ],
  },
  Newari: {
    name: 'Newari Feast',
    items: [
      { name: 'Newari Khaja Set', description: 'Beaten rice, spiced potatoes, black lentil, and choila', price: 480, category: 'Mains' },
      { name: 'Choila', description: 'Spicy grilled buffalo meat marinated in mustard oil and spices', price: 380, category: 'Starters' },
      { name: 'Bara', description: 'Savory lentil pancake, sometimes topped with egg', price: 220, category: 'Starters', isVegetarian: true },
      { name: 'Yomari', description: 'Steamed rice-flour dumpling with sweet molasses filling', price: 150, category: 'Desserts', isVegetarian: true },
      { name: 'Aila', description: 'Traditional Newari distilled rice spirit', price: 200, category: 'Beverages' },
    ],
  },
  Italian: {
    name: 'Italian Classics',
    items: [
      { name: 'Margherita Pizza', description: 'San Marzano tomato, fresh mozzarella, basil', price: 650, category: 'Mains', isVegetarian: true },
      { name: 'Pepperoni Pizza', description: 'Wood-fired crust with spicy pepperoni and mozzarella', price: 750, category: 'Mains' },
      { name: 'Spaghetti Carbonara', description: 'Egg, pecorino, guanciale, black pepper', price: 620, category: 'Mains' },
      { name: 'Bruschetta al Pomodoro', description: 'Grilled bread, diced tomato, garlic, basil, olive oil', price: 320, category: 'Starters', isVegetarian: true },
      { name: 'Tiramisu', description: 'Espresso-soaked ladyfingers, mascarpone cream, cocoa', price: 380, category: 'Desserts', isVegetarian: true },
      { name: 'House Red Wine (Glass)', description: 'Imported Italian red blend', price: 550, category: 'Beverages' },
    ],
  },
  Continental: {
    name: 'Continental Menu',
    items: [
      { name: 'Grilled Chicken Breast', description: 'Herb-marinated chicken, roasted vegetables, pan jus', price: 720, category: 'Mains' },
      { name: 'Classic Beef Steak', description: '250g sirloin, mashed potato, peppercorn sauce', price: 950, category: 'Mains' },
      { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, creamy Caesar dressing', price: 420, category: 'Starters', isVegetarian: true },
      { name: 'Mushroom Soup', description: 'Creamy wild mushroom soup with truffle oil', price: 280, category: 'Starters', isVegetarian: true },
      { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center, vanilla ice cream', price: 380, category: 'Desserts', isVegetarian: true },
      { name: 'Fresh Lemonade', description: 'House-made lemonade with mint', price: 180, category: 'Beverages', isVegetarian: true, isVegan: true },
    ],
  },
  Indian: {
    name: 'Indian Curry House',
    items: [
      { name: 'Butter Chicken', description: 'Tandoori chicken in creamy tomato-butter gravy', price: 560, category: 'Mains' },
      { name: 'Paneer Tikka Masala', description: 'Grilled cottage cheese in spiced tomato gravy', price: 480, category: 'Mains', isVegetarian: true },
      { name: 'Garlic Naan', description: 'Tandoor-baked flatbread with garlic and butter', price: 150, category: 'Sides', isVegetarian: true },
      { name: 'Samosa Chaat', description: 'Crushed samosas with yogurt, tamarind, and mint chutney', price: 280, category: 'Starters', isVegetarian: true },
      { name: 'Gulab Jamun', description: 'Fried milk dumplings soaked in rose-cardamom syrup', price: 220, category: 'Desserts', isVegetarian: true },
      { name: 'Masala Lassi', description: 'Spiced yogurt drink', price: 200, category: 'Beverages', isVegetarian: true },
    ],
  },
  Korean: {
    name: 'Korean BBQ & More',
    items: [
      { name: 'Korean BBQ Bulgogi', description: 'Marinated grilled beef, banchan, steamed rice', price: 850, category: 'Mains' },
      { name: 'Kimchi Jjigae', description: 'Spicy fermented kimchi stew with tofu and pork', price: 520, category: 'Mains' },
      { name: 'Bibimbap', description: 'Mixed rice bowl with vegetables, egg, and gochujang', price: 480, category: 'Mains', isVegetarian: true },
      { name: 'Kimchi Pancake', description: 'Crispy fermented cabbage pancake', price: 320, category: 'Starters', isVegetarian: true },
      { name: 'Korean Fried Chicken', description: 'Double-fried chicken glazed in sweet-spicy sauce', price: 580, category: 'Starters' },
      { name: 'Sikhye', description: 'Traditional Korean sweet rice punch', price: 180, category: 'Beverages', isVegetarian: true },
    ],
  },
  Tibetan: {
    name: 'Tibetan Kitchen',
    items: [
      { name: 'Beef Thukpa', description: 'Hand-pulled noodle soup with beef and vegetables', price: 380, category: 'Mains' },
      { name: 'Steamed Momo (Veg)', description: '10-piece vegetable momo with sesame chutney', price: 250, category: 'Starters', isVegetarian: true },
      { name: 'Fried Momo (Chicken)', description: 'Pan-fried chicken momo with spicy dip', price: 300, category: 'Starters' },
      { name: 'Tingmo', description: 'Steamed Tibetan bread, served with stew', price: 180, category: 'Sides', isVegetarian: true },
      { name: 'Butter Tea', description: 'Traditional Tibetan salted butter tea', price: 150, category: 'Beverages', isVegetarian: true },
    ],
  },
  Chinese: {
    name: 'Chinese Kitchen',
    items: [
      { name: 'Kung Pao Chicken', description: 'Wok-fried chicken, peanuts, dried chili, scallion', price: 480, category: 'Mains' },
      { name: 'Chow Mein', description: 'Stir-fried noodles with vegetables and choice of protein', price: 420, category: 'Mains' },
      { name: 'Spring Rolls', description: 'Crispy vegetable spring rolls with sweet chili sauce', price: 240, category: 'Starters', isVegetarian: true },
      { name: 'Hot & Sour Soup', description: 'Classic spicy-tangy soup with tofu and mushroom', price: 220, category: 'Starters', isVegetarian: true },
      { name: 'Sesame Balls', description: 'Fried glutinous rice balls with sweet red bean filling', price: 200, category: 'Desserts', isVegetarian: true },
    ],
  },
  Japanese: {
    name: 'Japanese Menu',
    items: [
      { name: 'Salmon Sashimi (8pc)', description: 'Fresh salmon, thinly sliced, soy and wasabi', price: 850, category: 'Mains' },
      { name: 'California Roll', description: 'Crab, avocado, cucumber, tobiko', price: 520, category: 'Mains' },
      { name: 'Chicken Katsu Curry', description: 'Breaded fried chicken cutlet with Japanese curry rice', price: 580, category: 'Mains' },
      { name: 'Miso Soup', description: 'Traditional soybean paste soup with tofu and seaweed', price: 180, category: 'Starters', isVegetarian: true },
      { name: 'Gyoza', description: 'Pan-fried pork dumplings with ponzu dip', price: 320, category: 'Starters' },
      { name: 'Matcha Ice Cream', description: 'Green tea flavored ice cream', price: 220, category: 'Desserts', isVegetarian: true },
    ],
  },
  Thai: {
    name: 'Thai Kitchen',
    items: [
      { name: 'Pad Thai', description: 'Stir-fried rice noodles, egg, tofu, peanuts, tamarind', price: 460, category: 'Mains' },
      { name: 'Green Curry Chicken', description: 'Coconut green curry with Thai basil and chicken', price: 520, category: 'Mains' },
      { name: 'Tom Yum Soup', description: 'Hot and sour soup with shrimp, lemongrass, lime leaf', price: 380, category: 'Starters' },
      { name: 'Papaya Salad', description: 'Green papaya, tomato, peanuts, chili-lime dressing', price: 320, category: 'Starters', isVegetarian: true },
      { name: 'Mango Sticky Rice', description: 'Sweet sticky rice with fresh mango and coconut cream', price: 280, category: 'Desserts', isVegetarian: true },
    ],
  },
  Asian: {
    name: 'Pan-Asian Menu',
    items: [
      { name: 'Thai Green Curry', description: 'Coconut curry with vegetables and jasmine rice', price: 480, category: 'Mains', isVegetarian: true },
      { name: 'Vietnamese Pho', description: 'Beef noodle soup with fresh herbs and lime', price: 420, category: 'Mains' },
      { name: 'Asian Spring Rolls', description: 'Fresh rice paper rolls with shrimp and herbs', price: 320, category: 'Starters' },
      { name: 'Sticky Rice Mango', description: 'Sweet coconut sticky rice with mango', price: 260, category: 'Desserts', isVegetarian: true },
    ],
  },
};

const CAFE_ADDONS = {
  name: 'Cafe Menu',
  items: [
    { name: 'Cappuccino', description: 'Espresso with steamed milk and foam', price: 220, category: 'Beverages', isVegetarian: true },
    { name: 'Cold Brew Coffee', description: 'Slow-steeped cold brew, served over ice', price: 260, category: 'Beverages', isVegetarian: true, isVegan: true },
    { name: 'Croissant', description: 'Butter croissant, baked fresh daily', price: 180, category: 'Bakery', isVegetarian: true },
    { name: 'Avocado Toast', description: 'Sourdough, smashed avocado, chili flakes, lemon', price: 380, category: 'Mains', isVegetarian: true, isVegan: true },
    { name: 'Cheesecake Slice', description: 'New York style baked cheesecake', price: 320, category: 'Desserts', isVegetarian: true },
  ],
};

const BAKERY_ADDONS = {
  name: 'Bakery Selection',
  items: [
    { name: 'Sourdough Loaf', description: 'Naturally leavened sourdough bread', price: 350, category: 'Bakery', isVegetarian: true, isVegan: true },
    { name: 'Chocolate Croissant', description: 'Flaky butter croissant with dark chocolate', price: 200, category: 'Bakery', isVegetarian: true },
    { name: 'Blueberry Muffin', description: 'Fresh baked muffin loaded with blueberries', price: 180, category: 'Bakery', isVegetarian: true },
    { name: 'Almond Danish', description: 'Puff pastry with almond cream filling', price: 220, category: 'Bakery', isVegetarian: true },
  ],
};

function templateForCuisines(cuisineNames) {
  for (const name of cuisineNames) {
    if (TEMPLATES[name]) return TEMPLATES[name];
  }
  return TEMPLATES.Continental;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const allCuisines = await Cuisine.find({}).lean();
    const cuisineByName = Object.fromEntries(allCuisines.map(c => [c.name, c._id]));

    // Apply cuisine tag fixes discovered while seeding menus.
    for (const [venueName, cuisineNames] of Object.entries(CUISINE_FIXES)) {
      const venue = await Venue.findOne({ name: venueName });
      if (!venue) continue;
      const ids = cuisineNames.map(n => cuisineByName[n]).filter(Boolean);
      if (ids.length) {
        venue.cuisines = ids;
        await venue.save();
        console.log(`Fixed cuisine tag for ${venueName}: ${cuisineNames.join(', ')}`);
      }
    }

    const venues = await Venue.find({}).populate('cuisines category').lean();

    for (const venue of venues) {
      const existing = await Menu.findOne({ venue: venue._id });
      if (existing) {
        console.log(`${venue.name}: menu already exists, skipping`);
        continue;
      }

      const cuisineNames = (venue.cuisines || []).map(c => c.name);
      const template = templateForCuisines(cuisineNames);
      let items = [...template.items];

      const categoryName = venue.category?.name;
      if (categoryName === 'Cafe') items = [...items, ...CAFE_ADDONS.items];
      if (categoryName === 'Bakery') items = [...BAKERY_ADDONS.items];

      await Menu.create({
        venue: venue._id,
        name: template.name,
        description: `Signature ${cuisineNames.join(' & ') || 'house'} dishes at ${venue.name}.`,
        items,
      });

      console.log(`${venue.name}: created menu "${template.name}" with ${items.length} items`);
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
