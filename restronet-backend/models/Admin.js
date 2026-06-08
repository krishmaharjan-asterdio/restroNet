const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Admin (Superadmin) Schema
 * Admins manage the platform: venues, menus, metadata, and user reviews.
 */
const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Admin password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'owner'],
      default: 'owner',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    emailNotifications: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save Hook: Hash password ─────────────────────────────────────────────
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method: Compare password ───────────────────────────────────────
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
