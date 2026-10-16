const express = require('express');
const router = express.Router();
const { getAssignments } = require('../controllers/ballboyController');
const { auth, checkRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/assignments', auth, checkRole('ballboy'), asyncHandler(getAssignments));

module.exports = router;
