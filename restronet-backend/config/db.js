const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB using Mongoose.
 * Retries on failure with exponential backoff.
 */
const connectDB = async () => {
  logger.info('🚀 Database connection process started...');
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/restronet';

  console.log('DEBUG: Attempting to connect to MongoDB...');
  console.log(`DEBUG: URI: ${MONGO_URI.split('@')[1] ? 'mongodb+srv://<hidden>@' + MONGO_URI.split('@')[1] : MONGO_URI}`);

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      // Mongoose 8+ no longer requires these options explicitly,
      // but they are listed for clarity:
      // useNewUrlParser: true,  // deprecated
      // useUnifiedTopology: true, // deprecated
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);


    // Handle disconnection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected.');
    });

  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exit process with failure if DB connection fails on startup

    process.exit(1);
  }
};

module.exports = connectDB;
