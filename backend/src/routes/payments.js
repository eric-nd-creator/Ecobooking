const express = require('express');
const router = express.Router();
const { initiatePayment, paymentCallback, checkStatus, initiateGuestBooking, guestBookingStatus, getBalance } = require('../controllers/paymentController');
const { auth, checkRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/initiate', auth, checkRole('member'), asyncHandler(initiatePayment));
router.post('/callback', asyncHandler(paymentCallback));                         // MoMo webhook — no JWT, secured by ?token= shared secret
router.get('/status/:transactionId', auth, asyncHandler(checkStatus));
router.post('/guest-initiate', asyncHandler(initiateGuestBooking));               // guest checkout — no auth
router.get('/guest-status/:transactionId', asyncHandler(guestBookingStatus));     // guest checkout — no auth
router.get('/balance', auth, checkRole('admin'), asyncHandler(getBalance));       // MoMo Collections account balance

module.exports = router;
