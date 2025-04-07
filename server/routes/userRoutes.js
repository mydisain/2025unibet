const express = require('express');
const router = express.Router();
const {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginUser);
router.post('/create-admin', createAdminUser); // TEMPORARY - REMOVE AFTER USE

// Protected routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Admin routes
router.route('/')
  .get(protect, admin, getUsers)
  .post(protect, admin, registerUser);

router.route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router;
