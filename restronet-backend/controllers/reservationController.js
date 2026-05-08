const Reservation = require('../models/Reservation');
const Venue = require('../models/Venue');

/**
 * @desc    Create a reservation
 * @route   POST /api/reservations
 * @access  Private (User)
 */
const createReservation = async (req, res, next) => {
  try {
    const { venueId, date, time, guests, specialRequests, contactPhone } = req.body;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    const reservation = await Reservation.create({
      venue: venueId,
      user: req.user._id,
      date,
      time,
      guests,
      specialRequests,
      contactPhone,
    });

    res.status(201).json({ success: true, reservation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's own reservations
 * @route   GET /api/reservations/my
 * @access  Private (User)
 */
const getUserReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id })
      .populate('venue', 'name logo address')
      .sort({ date: -1 });
    
    res.json({ success: true, reservations });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reservations for admin/owner
 * @route   GET /api/reservations/admin
 * @access  Private (Admin)
 */
const getAdminReservations = async (req, res, next) => {
  try {
    let query = {};

    if (req.admin.role === 'owner') {
      const ownedVenues = await Venue.find({ owner: req.admin._id }).distinct('_id');
      query.venue = { $in: ownedVenues };
    }

    const reservations = await Reservation.find(query)
      .populate('venue', 'name')
      .populate('user', 'name email')
      .sort({ date: -1, time: -1 });

    res.json({ success: true, reservations });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update reservation status
 * @route   PUT /api/reservations/admin/:id
 * @access  Private (Admin)
 */
const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const reservation = await Reservation.findById(req.params.id).populate('venue');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Ownership check for owners
    if (req.admin.role === 'owner' && reservation.venue?.owner?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this reservation' });
    }

    reservation.status = status;
    await reservation.save();

    res.json({ success: true, reservation });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReservation,
  getUserReservations,
  getAdminReservations,
  updateReservationStatus,
};
