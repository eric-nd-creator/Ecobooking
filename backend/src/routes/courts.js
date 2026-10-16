const express = require('express');
const router = express.Router();
const { getCourts, getAvailability } = require('../controllers/courtController');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(getCourts));
router.get('/availability', asyncHandler(getAvailability));

module.exports = router;
