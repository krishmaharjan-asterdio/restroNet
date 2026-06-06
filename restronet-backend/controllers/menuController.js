const Menu = require('../models/Menu');
const Venue = require('../models/Venue');
const aiService = require('../services/aiService');
const fs = require('fs');

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

    // Call Gemini to parse
    const extractedData = await aiService.parseMenuImage(file.path, file.mimetype);
    
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
