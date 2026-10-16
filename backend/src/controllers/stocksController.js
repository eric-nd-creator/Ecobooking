const stocksService = require('../services/stocksService');
const marketHours = require('../services/marketHours');
const stockPriceScheduler = require('../services/stockPriceScheduler');

const MOVER_TYPES = ['gainers', 'losers', 'active'];
const RANGES = ['1D', '1W', '1M', '6M', '1Y', 'ALL'];

const listStocks = async (req, res) => {
  const page = req.query.page ? Math.max(1, parseInt(req.query.page)) : 1;
  const pageSize = req.query.pageSize ? Math.min(100, Math.max(1, parseInt(req.query.pageSize))) : 20;
  const result = await stocksService.listStocks({
    search: req.query.search?.trim() || undefined,
    country: req.query.country || undefined,
    exchange: req.query.exchange || undefined,
    page,
    pageSize,
  });
  res.json(result);
};

const getMovers = async (req, res) => {
  const type = MOVER_TYPES.includes(req.query.type) ? req.query.type : 'gainers';
  const limit = req.query.limit ? Math.min(50, Math.max(1, parseInt(req.query.limit))) : 10;
  const stocks = await stocksService.getTopMovers(type, limit);
  res.json({ type, stocks });
};

const getCountries = async (req, res) => {
  res.json({ countries: await stocksService.getCountries() });
};

const getMarketStatus = async (req, res) => {
  const exchanges = await stocksService.getActiveExchanges();
  res.json({ exchanges: exchanges.map(exchange => marketHours.getMarketStatus(exchange)) });
};

const getWatchlist = async (req, res) => {
  res.json({ stocks: await stocksService.getWatchlist(req.user.id) });
};

const addToWatchlist = async (req, res) => {
  const stockId = parseInt(req.params.stockId);
  const stock = await stocksService.getStockById(stockId);
  if (!stock) return res.status(404).json({ message: 'Stock not found' });

  await stocksService.addWatchlist(req.user.id, stockId);
  res.json({ message: 'Added to watchlist' });
};

const removeFromWatchlist = async (req, res) => {
  await stocksService.removeWatchlist(req.user.id, parseInt(req.params.stockId));
  res.json({ message: 'Removed from watchlist' });
};

const getStockDetail = async (req, res) => {
  const stock = await stocksService.getStockById(parseInt(req.params.id));
  if (!stock) return res.status(404).json({ message: 'Stock not found' });
  res.json(stock);
};

const getStockHistory = async (req, res) => {
  const stockId = parseInt(req.params.id);
  const stock = await stocksService.getStockById(stockId);
  if (!stock) return res.status(404).json({ message: 'Stock not found' });

  const range = RANGES.includes(req.query.range) ? req.query.range : '1M';
  res.json(await stocksService.getHistory(stockId, range));
};

// Admin-only: forces an immediate poll instead of waiting for the next cron tick.
const forceRefresh = async (req, res) => {
  await stockPriceScheduler.pollTick();
  res.json({ message: 'Stock prices refreshed' });
};

module.exports = {
  listStocks, getMovers, getCountries, getMarketStatus, getWatchlist,
  addToWatchlist, removeFromWatchlist, getStockDetail, getStockHistory, forceRefresh,
};
