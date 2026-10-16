const pool = require('../config/db');

const STOCK_FIELDS = `
  s.id, s.symbol, s.exchange, s.company_name, s.country, s.currency, s.logo_url, s.sector,
  q.price, q.previous_close, q.open_price, q.day_high, q.day_low,
  q.change_abs, q.change_pct, q.volume, q.market_cap, q.is_market_open, q.fetched_at
`;

function mapStockRow(r) {
  return {
    id: r.id,
    symbol: r.symbol,
    exchange: r.exchange,
    companyName: r.company_name,
    country: r.country,
    currency: r.currency,
    logoUrl: r.logo_url,
    sector: r.sector,
    price: r.price != null ? Number(r.price) : null,
    previousClose: r.previous_close != null ? Number(r.previous_close) : null,
    openPrice: r.open_price != null ? Number(r.open_price) : null,
    dayHigh: r.day_high != null ? Number(r.day_high) : null,
    dayLow: r.day_low != null ? Number(r.day_low) : null,
    changeAbs: r.change_abs != null ? Number(r.change_abs) : null,
    changePct: r.change_pct != null ? Number(r.change_pct) : null,
    volume: r.volume != null ? Number(r.volume) : null,
    marketCap: r.market_cap != null ? Number(r.market_cap) : null,
    isMarketOpen: !!r.is_market_open,
    fetchedAt: r.fetched_at,
  };
}

async function listStocks({ search, country, exchange, page = 1, pageSize = 20 } = {}) {
  const params = [];
  let where = 's.is_active = TRUE';
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    where += ' AND (LOWER(s.company_name) LIKE ? OR LOWER(s.symbol) LIKE ? OR LOWER(s.country) LIKE ?)';
    params.push(like, like, like);
  }
  if (country) { where += ' AND s.country = ?'; params.push(country); }
  if (exchange) { where += ' AND s.exchange = ?'; params.push(exchange); }

  const [countRows] = await pool.query(`SELECT COUNT(*) AS count FROM stocks s WHERE ${where}`, params);
  const total = Number(countRows[0].count);

  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT ${STOCK_FIELDS} FROM stocks s LEFT JOIN stock_quotes q ON q.stock_id = s.id
     WHERE ${where} ORDER BY s.company_name ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { stocks: rows.map(mapStockRow), total, page: safePage, pageSize };
}

async function getTopMovers(type, limit = 10) {
  const orderBy = type === 'losers' ? 'q.change_pct ASC' : type === 'active' ? 'q.volume DESC' : 'q.change_pct DESC';
  const [rows] = await pool.query(
    `SELECT ${STOCK_FIELDS} FROM stocks s JOIN stock_quotes q ON q.stock_id = s.id
     WHERE s.is_active = TRUE AND q.price IS NOT NULL
     ORDER BY ${orderBy} NULLS LAST LIMIT ?`,
    [limit]
  );
  return rows.map(mapStockRow);
}

async function getCountries() {
  const [rows] = await pool.query('SELECT DISTINCT country FROM stocks WHERE is_active = TRUE ORDER BY country ASC');
  return rows.map(r => r.country);
}

async function getActiveExchanges() {
  const [rows] = await pool.query('SELECT DISTINCT exchange FROM stocks WHERE is_active = TRUE ORDER BY exchange ASC');
  return rows.map(r => r.exchange);
}

async function getActiveStocks() {
  const [rows] = await pool.query('SELECT id, symbol, exchange FROM stocks WHERE is_active = TRUE');
  return rows;
}

async function getStockById(id) {
  const [rows] = await pool.query(
    `SELECT ${STOCK_FIELDS} FROM stocks s LEFT JOIN stock_quotes q ON q.stock_id = s.id WHERE s.id = ?`,
    [id]
  );
  return rows[0] ? mapStockRow(rows[0]) : null;
}

// range → candle interval + lookback window. 1D reads synthetic 5-min candles;
// everything longer reads daily closes, differentiated only by the cutoff date.
const RANGE_CONFIG = {
  '1D': { interval: '5min', sinceDays: 1 },
  '1W': { interval: '1day', sinceDays: 7 },
  '1M': { interval: '1day', sinceDays: 31 },
  '6M': { interval: '1day', sinceDays: 183 },
  '1Y': { interval: '1day', sinceDays: 365 },
  'ALL': { interval: '1day', sinceDays: null },
};

async function getHistory(stockId, range) {
  const key = RANGE_CONFIG[range] ? range : '1M';
  const config = RANGE_CONFIG[key];
  const params = [stockId, config.interval];
  let where = 'stock_id = ? AND interval = ?';
  if (config.sinceDays) {
    where += " AND ts >= NOW() - ? * INTERVAL '1 day'";
    params.push(config.sinceDays);
  }
  const [rows] = await pool.query(
    `SELECT ts, open, high, low, close, volume FROM stock_price_history WHERE ${where} ORDER BY ts ASC`,
    params
  );
  return {
    range: key,
    interval: config.interval,
    candles: rows.map(r => ({
      ts: r.ts, open: Number(r.open), high: Number(r.high), low: Number(r.low),
      close: Number(r.close), volume: r.volume != null ? Number(r.volume) : null,
    })),
  };
}

async function hasDailyHistory() {
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM stock_price_history WHERE interval='1day'");
  return Number(rows[0].count) > 0;
}

async function getWatchlist(userId) {
  const [rows] = await pool.query(
    `SELECT ${STOCK_FIELDS} FROM stock_watchlist w
     JOIN stocks s ON s.id = w.stock_id
     LEFT JOIN stock_quotes q ON q.stock_id = s.id
     WHERE w.user_id = ? ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows.map(mapStockRow);
}

async function getWatchlistIds(userId) {
  const [rows] = await pool.query('SELECT stock_id FROM stock_watchlist WHERE user_id = ?', [userId]);
  return rows.map(r => r.stock_id);
}

async function addWatchlist(userId, stockId) {
  await pool.query(
    'INSERT INTO stock_watchlist (user_id, stock_id) VALUES (?,?) ON CONFLICT (user_id, stock_id) DO NOTHING',
    [userId, stockId]
  );
}

async function removeWatchlist(userId, stockId) {
  await pool.query('DELETE FROM stock_watchlist WHERE user_id = ? AND stock_id = ?', [userId, stockId]);
}

async function upsertQuote(stockId, quote) {
  await pool.query(
    `INSERT INTO stock_quotes (stock_id, price, previous_close, open_price, day_high, day_low, change_abs, change_pct, volume, market_cap, is_market_open, fetched_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT (stock_id) DO UPDATE SET
       price=EXCLUDED.price, previous_close=EXCLUDED.previous_close, open_price=EXCLUDED.open_price,
       day_high=EXCLUDED.day_high, day_low=EXCLUDED.day_low, change_abs=EXCLUDED.change_abs,
       change_pct=EXCLUDED.change_pct, volume=EXCLUDED.volume, market_cap=EXCLUDED.market_cap,
       is_market_open=EXCLUDED.is_market_open, fetched_at=CURRENT_TIMESTAMP`,
    [stockId, quote.price, quote.previousClose, quote.open, quote.high, quote.low,
      quote.changeAbs, quote.changePct, quote.volume, quote.marketCap, quote.isMarketOpen]
  );
}

async function appendHistoryCandle(stockId, interval, candle) {
  await pool.query(
    `INSERT INTO stock_price_history (stock_id, interval, ts, open, high, low, close, volume)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT (stock_id, interval, ts) DO UPDATE SET
       high=GREATEST(stock_price_history.high, EXCLUDED.high),
       low=LEAST(stock_price_history.low, EXCLUDED.low),
       close=EXCLUDED.close, volume=EXCLUDED.volume`,
    [stockId, interval, candle.ts, candle.open, candle.high, candle.low, candle.close, candle.volume]
  );
}

async function bulkInsertHistory(stockId, interval, candles) {
  for (const candle of candles) {
    await appendHistoryCandle(stockId, interval, candle);
  }
}

async function pruneOldIntraday() {
  await pool.query("DELETE FROM stock_price_history WHERE interval='5min' AND ts < NOW() - INTERVAL '2 days'");
}

module.exports = {
  listStocks, getTopMovers, getCountries, getActiveExchanges, getActiveStocks, getStockById,
  getHistory, hasDailyHistory, getWatchlist, getWatchlistIds, addWatchlist, removeWatchlist,
  upsertQuote, appendHistoryCandle, bulkInsertHistory, pruneOldIntraday,
};
