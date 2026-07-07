require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const Menu = require('../models/Menu');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Reservation = require('../models/Reservation');
const RestaurantFeature = require('../models/RestaurantFeature');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const osmVenues = await Venue.find({ source: 'osm' }, '_id name').lean();
    console.log(`Found ${osmVenues.length} OSM-imported venues to remove`);

    const ids = osmVenues.map(v => v._id);

    const [menuRes, reviewRes, favRes, resvRes, featRes] = await Promise.all([
      Menu.deleteMany({ venue: { $in: ids } }),
      Review.deleteMany({ venue: { $in: ids } }),
      Favorite.deleteMany({ venue: { $in: ids } }),
      Reservation.deleteMany({ venue: { $in: ids } }),
      RestaurantFeature.deleteMany({ venue: { $in: ids } }),
    ]);
    const venueRes = await Venue.deleteMany({ _id: { $in: ids } });

    console.log('Deleted:', {
      venues: venueRes.deletedCount,
      menus: menuRes.deletedCount,
      reviews: reviewRes.deletedCount,
      favorites: favRes.deletedCount,
      reservations: resvRes.deletedCount,
      featureVectors: featRes.deletedCount,
    });

    const remaining = await Venue.countDocuments();
    console.log('Venues remaining:', remaining);
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
