const express = require('express');
const { adminLogin, getAdminProfile } = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/profile', protectAdmin, getAdminProfile);

module.exports = router;
