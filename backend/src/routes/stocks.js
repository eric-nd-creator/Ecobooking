const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stocksController');
const { auth, checkRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const adminOnly = [auth, checkRole('admin')];

// Fixed segments must be registered before the `/:id` param route below.
router.get('/', auth, asyncHandler(ctrl.listStocks));
router.get('/movers', auth, asyncHandler(ctrl.getMovers));
router.get('/countries', auth, asyncHandler(ctrl.getCountries));
router.get('/market-status', auth, asyncHandler(ctrl.getMarketStatus));
router.get('/watchlist', auth, asyncHandler(ctrl.getWatchlist));
router.post('/watchlist/:stockId', auth, asyncHandler(ctrl.addToWatchlist));
router.delete('/watchlist/:stockId', auth, asyncHandler(ctrl.removeFromWatchlist));
router.post('/refresh', ...adminOnly, asyncHandler(ctrl.forceRefresh));

router.get('/:id', auth, asyncHandler(ctrl.getStockDetail));
router.get('/:id/history', auth, asyncHandler(ctrl.getStockHistory));

module.exports = router;
