const express = require('express');
const { getMenusByVenue, addMenu, updateMenu, deleteMenu, extractMenuFromImage } = require('../controllers/menuController');
const { protectAdmin } = require('../middleware/authMiddleware');
const { uploadMenu, handleUpload } = require('../config/multer');

const router = express.Router();

router.route('/venue/:venueId')
  .get(getMenusByVenue)
  .post(protectAdmin, addMenu);

// Route for AI OCR Menu Extraction from uploaded image
router.post('/venue/:venueId/extract-ocr', protectAdmin, handleUpload(uploadMenu), extractMenuFromImage);

router.route('/:menuId')
  .put(protectAdmin, updateMenu)
  .delete(protectAdmin, deleteMenu);

module.exports = router;
