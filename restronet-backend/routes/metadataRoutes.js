const express = require('express');
const {
  getCuisines, createCuisine,
  getTags, createTag,
  getCategories, createCategory
} = require('../controllers/metadataController');
const { protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public reads
router.get('/cuisines', getCuisines);
router.get('/tags', getTags);
router.get('/categories', getCategories);

// Admin creates
router.post('/cuisines', protectAdmin, createCuisine);
router.post('/tags', protectAdmin, createTag);
router.post('/categories', protectAdmin, createCategory);

module.exports = router;
