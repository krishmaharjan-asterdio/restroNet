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

// ─── Crash Safety ─────────────────────────────────────────────────────────────
// Log and keep serving instead of exiting — a stray rejected promise (e.g. a
// background job or a route missing a catch) should not take the whole app
// down mid-demo. Restart manually/via a process manager if errors pile up.
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}\n${err.stack || ''}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}\n${err.stack || ''}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = app;
