const express = require('express');
const { logInteraction } = require('../controllers/interactionController');
const { protectUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protectUser, logInteraction);

module.exports = router;
