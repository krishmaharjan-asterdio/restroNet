const mongoose = require('mongoose');
const logger = require('./logger');

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s, 16s, 32s

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB using Mongoose.
 * Retries on failure with exponential backoff instead of killing the
 * process — a transient DB blip (network flap, Atlas maintenance,
 * IP-whitelist propagation) should not take the whole server down.
 * The Express app keeps listening throughout; routes that hit the DB
 * before a connection lands surface a normal 500 via errorHandler.
 */
const connectDB = async (attempt = 1) => {
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
    logger.error(`❌ MongoDB Connection Error (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);

    if (attempt >= MAX_RETRIES) {
      logger.error('❌ MongoDB connection failed after max retries. Server stays up; DB-backed routes will error until it recovers.');
      return;
    }

    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    logger.warn(`Retrying MongoDB connection in ${delay / 1000}s...`);
    await sleep(delay);
    return connectDB(attempt + 1);
  }
};

module.exports = connectDB;
