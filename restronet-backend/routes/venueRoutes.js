const express = require('express');
const { getVenues, getVenueById, createVenue, updateVenue, deleteVenue } = require('../controllers/venueController');
const { protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(getVenues)
  .post(protectAdmin, createVenue);

router.route('/:idOrSlug')
  .get(getVenueById)
  .put(protectAdmin, updateVenue)
  .delete(protectAdmin, deleteVenue);

module.exports = router;
