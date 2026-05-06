const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Middleware to protect routes for authenticated USERS.
 * Expects: Authorization: Bearer <token>
 */
const protectUser = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to protect routes for authenticated ADMINS (Superadmin).
 * Uses a separate ADMIN_JWT_SECRET for added security.
 */
const protectAdmin = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found.' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Admin account has been deactivated.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth middleware — attaches user if token is valid, but doesn't block if not.
 * Useful for public routes that also provide personalized results when logged in.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    // Token invalid but route is public — continue without user
    next();
  }
};

module.exports = { protectUser, protectAdmin, optionalAuth };
