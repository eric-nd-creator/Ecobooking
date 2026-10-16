const axios = require('axios');

const BASE_URL = 'https://api.twelvedata.com';
const isConfigured = () => !!process.env.TWELVE_DATA_API_KEY;

// Twelve Data returns {status:'error', message} inside a 200 response body on
// bad symbols/rate limits, in addition to normal HTTP error codes — both must
// be checked to know a call actually failed.
const isProviderError = (body) => !body || body.status === 'error';

// pairs: [{symbol, exchange}], grouped by exchange so each exchange only costs
// one HTTP request (Twelve Data's `exchange` param scopes the whole call).
async function fetchQuotesBatch(pairs) {
  if (!isConfigured() || !pairs.length) return [];

  const byExchange = new Map();
  for (const { symbol, exchange } of pairs) {
    if (!byExchange.has(exchange)) byExchange.set(exchange, []);
    byExchange.get(exchange).push(symbol);
  }

  const results = [];
  for (const [exchange, symbols] of byExchange) {
    try {
      const { data } = await axios.get(`${BASE_URL}/quote`, {
        params: { symbol: symbols.join(','), exchange, apikey: process.env.TWELVE_DATA_API_KEY },
        timeout: 10000,
      });

      // Single-symbol requests return one object; multi-symbol requests return
      // {SYMBOL: {...}, SYMBOL2: {...}} — normalize both to a flat array.
      const entries = symbols.length === 1 ? { [symbols[0]]: data } : data;
      for (const symbol of symbols) {
        const body = entries[symbol];
        if (isProviderError(body)) {
          console.error(`Twelve Data quote error for ${symbol}/${exchange}:`, body?.message || 'no data');
          continue;
        }
        results.push({
          symbol,
          exchange,
          price: Number(body.close),
          previousClose: Number(body.previous_close),
          open: Number(body.open),
          high: Number(body.high),
          low: Number(body.low),
          changeAbs: Number(body.change),
          changePct: Number(body.percent_change),
          volume: body.volume ? Number(body.volume) : null,
          marketCap: body.market_cap ? Number(body.market_cap) : null,
          isMarketOpen: body.is_market_open === true,
        });
      }
    } catch (err) {
      console.error(`Twelve Data quote batch failed for exchange ${exchange}:`, err.message);
    }
  }
  return results;
}

// Used only for one-time historical backfill, not the recurring poll.
async function fetchTimeSeries(symbol, exchange, interval, outputsize) {
  if (!isConfigured()) return null;
  try {
    const { data } = await axios.get(`${BASE_URL}/time_series`, {
      params: { symbol, exchange, interval, outputsize, apikey: process.env.TWELVE_DATA_API_KEY },
      timeout: 15000,
    });
    if (isProviderError(data) || !Array.isArray(data.values)) {
      console.error(`Twelve Data time_series error for ${symbol}/${exchange}:`, data?.message || 'no values');
      return null;
    }
    return data.values.map(v => ({
      ts: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: v.volume ? Number(v.volume) : null,
    }));
  } catch (err) {
    console.error(`Twelve Data time_series failed for ${symbol}/${exchange}:`, err.message);
    return null;
  }
}

module.exports = { isConfigured, fetchQuotesBatch, fetchTimeSeries };
