const express = require('express');
const { getVenues, getVenueById, createVenue, updateVenue, deleteVenue } = require('../controllers/venueController');
const { importFromOSM, searchExternal } = require('../controllers/scraperController');
const { protectAdmin, optionalAdminAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(optionalAdminAuth, getVenues)
  .post(protectAdmin, createVenue);

router.get('/search-external', protectAdmin, searchExternal);
router.post('/import-osm', protectAdmin, importFromOSM);

router.route('/:idOrSlug')
  .get(getVenueById)
  .put(protectAdmin, updateVenue)
  .delete(protectAdmin, deleteVenue);

module.exports = router;
