const Menu = require('../models/Menu');
const Venue = require('../models/Venue');

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
    const venueExists = await Venue.findById(req.params.venueId);
    if (!venueExists) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
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
    const menu = await Menu.findByIdAndUpdate(req.params.menuId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

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
    const menu = await Menu.findByIdAndDelete(req.params.menuId);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    res.json({ success: true, message: 'Menu deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenusByVenue,
  addMenu,
  updateMenu,
  deleteMenu,
};
