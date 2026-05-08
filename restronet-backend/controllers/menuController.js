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

module.exports = {
  getMenusByVenue,
  addMenu,
  updateMenu,
  deleteMenu,
};
