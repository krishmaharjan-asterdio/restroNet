require('dotenv').config();

const connectDB = require('./config/db');
const logger = require('./config/logger');
const automationService = require('./services/automationService');
const app = require('./app');

// ─── Connect Database ─────────────────────────────────────────────────────────
connectDB().then(() => {
  automationService.registerJobs();
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 RESTRONET Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = app;
