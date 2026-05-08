const express = require('express');
const { getVenues, getVenueById, createVenue, updateVenue, deleteVenue } = require('../controllers/venueController');
const { protectAdmin, optionalAdminAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(optionalAdminAuth, getVenues)
  .post(protectAdmin, createVenue);

router.route('/:idOrSlug')
  .get(getVenueById)
  .put(protectAdmin, updateVenue)
  .delete(protectAdmin, deleteVenue);

module.exports = router;
