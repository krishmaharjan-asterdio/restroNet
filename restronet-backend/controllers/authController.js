const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/profile
 * @access  Private (User)
 */
const getProfile = async (req, res, next) => {
  try {
    // req.user is set in auth middleware
    const user = await User.findById(req.user._id).populate('preferences.cuisines preferences.tags');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile & preferences
 * @route   PUT /api/auth/profile
 * @access  Private (User)
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferences, location } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    
    // Update preferences for recommendation engine
    if (preferences) {
      if (preferences.cuisines) user.preferences.cuisines = preferences.cuisines;
      if (preferences.tags) user.preferences.tags = preferences.tags;
      if (preferences.priceRange) user.preferences.priceRange = preferences.priceRange;
      if (preferences.mealTypes) user.preferences.mealTypes = preferences.mealTypes;
      if (preferences.maxDistanceKm) user.preferences.maxDistanceKm = preferences.maxDistanceKm;
    }

    if (location && location.coordinates) {
      user.location.coordinates = location.coordinates;
    }

    await user.save();
    
    const updatedUser = await User.findById(req.user._id).populate('preferences.cuisines preferences.tags');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, updateProfile };
