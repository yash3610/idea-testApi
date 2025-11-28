const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserActivity
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/roleCheck');

// All routes require authentication and super admin role
router.use(protect);
router.use(isSuperAdmin);

router.route('/')
  .get(getAllUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.get('/:id/activity', getUserActivity);

module.exports = router;
