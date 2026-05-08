const express = require('express');
const { adminLogin, getAdminProfile, registerOwner, getOwners } = require('../controllers/adminAuthController');
const { protectAdmin, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/profile', protectAdmin, getAdminProfile);

// Owner management (Super Admin only)
router.route('/owners')
  .post(protectAdmin, restrictTo('superadmin'), registerOwner)
  .get(protectAdmin, restrictTo('superadmin'), getOwners);

module.exports = router;
