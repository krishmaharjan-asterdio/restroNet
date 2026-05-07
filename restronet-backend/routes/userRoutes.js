const express = require('express');
const { getUsers, toggleBlockUser, deleteUser } = require('../controllers/userController');
const { protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protectAdmin); // All routes here require admin

router.route('/')
  .get(getUsers);

router.route('/:id/block')
  .put(toggleBlockUser);

router.route('/:id')
  .delete(deleteUser);

module.exports = router;
