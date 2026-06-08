const express = require('express');
const { getVenues, getVenueById, createVenue, updateVenue, deleteVenue, getMenuSuggestions, getVenueSlots } = require('../controllers/venueController');
const { importFromOSM, searchExternal } = require('../controllers/scraperController');
const { protectAdmin, optionalAdminAuth, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(optionalAdminAuth, getVenues)
  .post(protectAdmin, createVenue);

router.get('/search-external', protectAdmin, searchExternal);
router.post('/import-osm', protectAdmin, importFromOSM);

router.get('/:id/menu-suggestions', optionalAuth, getMenuSuggestions);
router.get('/:id/slots', getVenueSlots);

router.route('/:idOrSlug')
  .get(getVenueById)
  .put(protectAdmin, updateVenue)
  .delete(protectAdmin, deleteVenue);

module.exports = router;
