const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAvailableTimeslots,
  getAdminTimeslots,
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/', createBooking);
router.get('/timeslots', getAvailableTimeslots);

// Admin timeslots route
router.get('/admin-timeslots', protect, admin, getAdminTimeslots);

// Admin routes
router.get('/', protect, admin, getBookings);
router.route('/:id')
  .get(protect, admin, getBookingById)
  .put(protect, admin, updateBooking)
  .delete(protect, admin, deleteBooking);

module.exports = router;
