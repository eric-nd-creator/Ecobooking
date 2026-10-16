const express = require('express');
const router = express.Router();
const {
  register, login, verifyLogin2FA, getMe, updateProfile, changePassword,
  forgotPassword, resetPassword, setup2FA, verifySetup2FA, disable2FA,
} = require('../controllers/authController');
const { auth, loginLimiter } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/register', loginLimiter, asyncHandler(register));
router.post('/login', loginLimiter, asyncHandler(login));
router.post('/2fa/verify-login', loginLimiter, asyncHandler(verifyLogin2FA));
router.post('/forgot-password', loginLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', loginLimiter, asyncHandler(resetPassword));

router.get('/me', auth, asyncHandler(getMe));
router.put('/profile', auth, asyncHandler(updateProfile));
router.put('/password', auth, asyncHandler(changePassword));
router.post('/2fa/setup', auth, asyncHandler(setup2FA));
router.post('/2fa/verify-setup', auth, asyncHandler(verifySetup2FA));
router.post('/2fa/disable', auth, asyncHandler(disable2FA));

module.exports = router;
