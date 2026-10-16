const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, cancelBooking, getAllBookings } = require('../controllers/bookingController');
const { auth, checkRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', auth, asyncHandler(createBooking));
router.get('/my', auth, asyncHandler(getMyBookings));
router.put('/:id/cancel', auth, asyncHandler(cancelBooking));
router.get('/all', auth, checkRole('admin'), asyncHandler(getAllBookings));

module.exports = router;
