const express = require('express');
const router = express.Router();
const { getPredictions, trainModel, getForecast, getPredictionPoint } = require('../controllers/predictionController');
const { auth, checkRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const adminOnly = [auth, checkRole('admin')];

router.get('/', ...adminOnly, asyncHandler(getPredictions));
router.post('/train', ...adminOnly, asyncHandler(trainModel));
router.get('/forecast', ...adminOnly, asyncHandler(getForecast));
router.get('/point', ...adminOnly, asyncHandler(getPredictionPoint));

module.exports = router;
