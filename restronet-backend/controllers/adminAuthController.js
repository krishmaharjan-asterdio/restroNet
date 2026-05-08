const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Venue = require('../models/Venue');

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

    let admin;

    // Hardcoded dev credentials bypass
    if (email === 'admin' && password === 'admin') {
      admin = await Admin.findOne();
      if (!admin) {
        return res.status(401).json({ success: false, message: 'No admin user found in database. Please run the seed script first.' });
      }
    } else {
      admin = await Admin.findOne({ email }).select('+password');
      if (!admin || !(await admin.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      }
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

/**
 * @desc    Register a new Restaurant Owner (Super Admin only)
 * @route   POST /api/admin/auth/owners
 * @access  Private (Superadmin)
 */
const registerOwner = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const ownerExists = await Admin.findOne({ email });
    if (ownerExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const owner = await Admin.create({
      name,
      email,
      password,
      role: 'owner',
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant Owner created successfully',
      owner: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Restaurant Owners (Super Admin only)
 * @route   GET /api/admin/auth/owners
 * @access  Private (Superadmin)
 */
const getOwners = async (req, res, next) => {
  try {
    const owners = await Admin.find({ role: 'owner' }).lean();
    
    // Attach venue count to each owner
    const ownersWithCount = await Promise.all(owners.map(async (owner) => {
      const count = await Venue.countDocuments({ owner: owner._id });
      return { ...owner, venueCount: count };
    }));

    res.json({ success: true, owners: ownersWithCount });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a Restaurant Owner (Super Admin only)
 * @route   DELETE /api/admin/auth/owners/:id
 * @access  Private (Superadmin)
 */
const deleteOwner = async (req, res, next) => {
  try {
    const owner = await Admin.findById(req.params.id);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    if (owner.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Superadmin accounts cannot be deleted through this endpoint' });
    }

    await owner.deleteOne();

    // Optionally: Unassign owner from their venues
    await Venue.updateMany({ owner: owner._id }, { owner: null });

    res.json({ success: true, message: 'Owner account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { adminLogin, getAdminProfile, registerOwner, getOwners, deleteOwner };
