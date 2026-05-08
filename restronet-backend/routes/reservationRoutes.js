const express = require('express');
const {
  createReservation,
  getUserReservations,
  getAdminReservations,
  updateReservationStatus,
} = require('../controllers/reservationController');
const { protectUser, protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// User Routes
router.post('/', protectUser, createReservation);
router.get('/my', protectUser, getUserReservations);

// Admin/Owner Routes
router.get('/admin', protectAdmin, getAdminReservations);
router.put('/admin/:id', protectAdmin, updateReservationStatus);

module.exports = router;
