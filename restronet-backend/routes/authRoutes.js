const express = require('express');
const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const { protectUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protectUser, getProfile);
router.put('/profile', protectUser, updateProfile);

module.exports = router;
