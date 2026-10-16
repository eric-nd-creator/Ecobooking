const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead } = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/my', auth, asyncHandler(getMyNotifications));
router.put('/:id/read', auth, asyncHandler(markAsRead));

module.exports = router;
