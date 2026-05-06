const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const generateAdminToken = (id) => {
  return jwt.sign({ id }, process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

/**
 * @desc    Login Admin
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Admin account deactivated' });
    }

    admin.lastLogin = Date.now();
    await admin.save({ validateBeforeSave: false });

    const token = generateAdminToken(admin._id);

    res.json({
      success: true,
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Admin Profile
 * @route   GET /api/admin/auth/profile
 * @access  Private (Admin)
 */
const getAdminProfile = async (req, res, next) => {
  try {
    res.json({ success: true, admin: req.admin });
  } catch (error) {
    next(error);
  }
};

module.exports = { adminLogin, getAdminProfile };
