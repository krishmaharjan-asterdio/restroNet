const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Reservation date is required'],
    },
    time: {
      type: String,
      required: [true, 'Reservation time is required'],
    },
    guests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: 1,
      max: 20,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    reminderSent24h:    { type: Boolean, default: false },
    reminderSent2h:     { type: Boolean, default: false },
    reviewRequestSent:  { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
reservationSchema.index({ venue: 1, date: 1 });
reservationSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
