const mongoose = require('mongoose');
const Interaction = require('../models/Interaction');
const Venue = require('../models/Venue');

const VALID_TYPES = ['view', 'click', 'dismiss'];

/**
 * @desc    Log a behavioral interaction (view / click / dismiss) on a venue.
 *          Fire-and-forget from the frontend — feeds the implicit
 *          recommendation profile at low weight.
 * @route   POST /api/interactions
 * @access  Private (User)
 */
const logInteraction = async (req, res, next) => {
  try {
    const { venueId, type } = req.body;

    if (!venueId || !mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ success: false, message: 'A valid venueId is required.' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    const venueExists = await Venue.exists({ _id: venueId, isActive: true });
    if (!venueExists) {
      return res.status(404).json({ success: false, message: 'Venue not found.' });
    }

    // Debounce: identical event from the same user on the same venue within
    // 5 minutes is a repeat (double-click, re-render), not new signal.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await Interaction.exists({
      user: req.user._id,
      venue: venueId,
      type,
      createdAt: { $gte: fiveMinAgo },
    });

    if (!recent) {
      await Interaction.create({ user: req.user._id, venue: venueId, type });
    }

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { logInteraction };
