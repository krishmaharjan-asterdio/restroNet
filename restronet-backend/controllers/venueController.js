const Venue = require('../models/Venue');
const Menu = require('../models/Menu');
const Review = require('../models/Review');
const { buildRestaurantFeatureVector } = require('../services/cbf-pipeline');

/**
 * @desc    Get all venues with filtering, sorting, and pagination
 * @route   GET /api/venues
 * @access  Public
 */
const getVenues = async (req, res, next) => {
  try {
    const { 
      search, cuisine, tag, priceRange, mealType, 
      sortBy, limit = 10, page = 1 
    } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }
    if (cuisine) query.cuisines = cuisine;
    if (tag) query.tags = tag;
    if (priceRange) query.priceRange = priceRange;
    if (mealType) query.mealTypes = mealType;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      populate: 'cuisines tags category',
      sort: sortBy === 'rating' ? { averageRating: -1 } : { createdAt: -1 },
    };

    const venues = await Venue.paginate(query, options);
    res.json({ success: true, ...venues });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single venue by slug or ID
 * @route   GET /api/venues/:idOrSlug
 * @access  Public
 */
const getVenueById = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    let query;

    // Check if it's a valid ObjectId
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: idOrSlug };
    } else {
      query = { slug: idOrSlug };
    }

    const venue = await Venue.findOne(query).populate('cuisines tags category');
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    res.json({ success: true, venue });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new venue
 * @route   POST /api/venues
 * @access  Private (Admin)
 */
const createVenue = async (req, res, next) => {
  try {
    const venue = await Venue.create(req.body);

    // Build CBF feature vector asynchronously
    buildRestaurantFeatureVector(venue._id).catch(console.error);

    res.status(201).json({ success: true, venue });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a venue
 * @route   PUT /api/venues/:id
 * @access  Private (Admin)
 */
const updateVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    // Rebuild CBF feature vector on update
    buildRestaurantFeatureVector(venue._id).catch(console.error);

    res.json({ success: true, venue });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a venue
 * @route   DELETE /api/venues/:id
 * @access  Private (Admin)
 */
const deleteVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findByIdAndDelete(req.params.id);
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    // Cleanup associated data
    await Menu.deleteMany({ venue: req.params.id });
    await Review.deleteMany({ venue: req.params.id });

    res.json({ success: true, message: 'Venue deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
};
