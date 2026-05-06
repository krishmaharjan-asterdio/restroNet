const express = require('express');
const { getDashboardStats } = require('../controllers/adminDashboardController');
const { protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protectAdmin, getDashboardStats);

module.exports = router;
