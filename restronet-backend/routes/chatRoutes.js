const express = require('express');
const { handleChat } = require('../controllers/chatController');

const router = express.Router();

// Public route for Conversational Concierge
router.post('/', handleChat);

module.exports = router;
