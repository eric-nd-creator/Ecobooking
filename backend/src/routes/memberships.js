const express = require('express');
const router = express.Router();
const { getMyMembership, getMembershipStats } = require('../controllers/membershipController');
const { auth, checkRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/my', auth, asyncHandler(getMyMembership));
router.get('/stats', auth, checkRole('admin'), asyncHandler(getMembershipStats));

module.exports = router;
