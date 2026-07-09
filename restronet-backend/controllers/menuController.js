const Menu = require('../models/Menu');
const Venue = require('../models/Venue');
const aiService = require('../services/aiService');
const { parseMenuImageLocal } = require('../services/localMenuOcr');
const { buildRestaurantFeatureVector } = require('../services/cbf-pipeline');
const fs = require('fs');

// NPR tier thresholds documented on Venue.js (priceRange comment): median
// item price under 500 = Budget, 500-1500 = Mid, 1500-3000 = Premium, above = Luxury.
function priceToTier(medianPrice) {
  if (medianPrice < 500) return 1;
  if (medianPrice < 1500) return 2;
  if (medianPrice < 3000) return 3;
  return 4;
}

// Refines Venue.priceRange from real menu prices instead of the OSM-amenity
// guess or admin-picked default — runs whenever a venue's menu changes, since
// that's the moment we have the most current, most reliable price signal.
// Requires at least 3 priced items to avoid a single outlier item (e.g. one
// "Rs. 50 water bottle") skewing the whole venue's tier.
const MIN_ITEMS_FOR_PRICE_INFERENCE = 3;

async function refineVenuePriceFromMenus(venueId) {
  const menus = await Menu.find({ venue: venueId, isActive: true }).lean();
  const prices = menus
    .flatMap(m => m.items || [])
    .filter(item => item.isAvailable !== false && typeof item.price === 'number' && item.price > 0)
    .map(item => item.price)
    .sort((a, b) => a - b);

  if (prices.length < MIN_ITEMS_FOR_PRICE_INFERENCE) return;

  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
  const newTier = priceToTier(median);

  const venue = await Venue.findById(venueId).select('priceRange');
  if (!venue || venue.priceRange === newTier) return;

  await Venue.findByIdAndUpdate(venueId, { priceRange: newTier });
  buildRestaurantFeatureVector(venueId).catch(console.error);
}

/**
 * @desc    Get menus for a specific venue
 * @route   GET /api/menu/:venueId
 * @access  Public
 */
const getMenusByVenue = async (req, res, next) => {
  try {
    const menus = await Menu.find({ venue: req.params.venueId, isActive: true });
    res.json({ success: true, menus });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a new menu to a venue
 * @route   POST /api/menu/:venueId
 * @access  Private (Admin)
 */
const addMenu = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    // Ownership check for owners
    if (req.admin.role === 'owner' && venue.owner?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage menus for this venue' });
    }

    const menu = await Menu.create({
      venue: req.params.venueId,
      ...req.body,
    });

    refineVenuePriceFromMenus(req.params.venueId).catch(console.error);

    res.status(201).json({ success: true, menu });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a menu (or items within)
 * @route   PUT /api/menu/:menuId
 * @access  Private (Admin)
 */
const updateMenu = async (req, res, next) => {
  try {
    const menu = await Menu.findById(req.params.menuId).populate('venue');
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    // Ownership check for owners
    if (req.admin.role === 'owner' && menu.venue?.owner?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this menu' });
    }

    Object.assign(menu, req.body);
    await menu.save();

    refineVenuePriceFromMenus(menu.venue._id || menu.venue).catch(console.error);

    res.json({ success: true, menu });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a menu
 * @route   DELETE /api/menu/:menuId
 * @access  Private (Admin)
 */
const deleteMenu = async (req, res, next) => {
  try {
    const menu = await Menu.findById(req.params.menuId).populate('venue');
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    // Ownership check for owners
    if (req.admin.role === 'owner' && menu.venue?.owner?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this menu' });
    }

    await menu.deleteOne();

    res.json({ success: true, message: 'Menu deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    AI OCR Menu extraction from uploaded image
 * @route   POST /api/menu/venue/:venueId/extract-ocr
 * @access  Private (Admin)
 */
const extractMenuFromImage = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    // Ownership check for owners
    if (req.admin.role === 'owner' && venue.owner?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage menus for this venue' });
    }

    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

    if (!file) {
      return res.status(400).json({ success: false, message: 'Menu image is required' });
    }

    // Local OCR first (free, no quota) — falls back to Gemini Vision only
    // if the local pass finds nothing (e.g. a menu style Tesseract can't read).
    let extractedData = await parseMenuImageLocal(file.path).catch((err) => {
      console.error('Local menu OCR error:', err.message);
      return null;
    });

    if (!extractedData || extractedData.items.length === 0) {
      extractedData = await aiService.parseMenuImage(file.path, file.mimetype);
    }

    // Clean up uploaded file from local server storage asynchronously
    fs.unlink(file.path, (err) => {
      if (err) console.error('Failed to delete temp menu upload:', err);
    });

    if (!extractedData) {
      return res.status(500).json({ success: false, message: 'AI failed to parse menu image.' });
    }

    res.json({ success: true, ...extractedData });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenusByVenue,
  addMenu,
  updateMenu,
  deleteMenu,
  extractMenuFromImage,
};
