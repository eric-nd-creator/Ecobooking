const cron = require('node-cron');
const stocksService = require('./stocksService');
const stockDataProvider = require('./stockDataProvider');
const marketHours = require('./marketHours');

let tickCount = 0;

// Runs once on boot only if no daily history exists yet, so 1W-1Y charts
// aren't empty on day one. Staggered with a short delay per stock to stay
// well under the free-tier rate limit; not part of the recurring cron loop.
async function backfillIfEmpty() {
  if (await stocksService.hasDailyHistory()) return;

  const stocks = await stocksService.getActiveStocks();
  console.log(`stockPriceScheduler: backfilling daily history for ${stocks.length} stocks...`);
  for (const stock of stocks) {
    const candles = await stockDataProvider.fetchTimeSeries(stock.symbol, stock.exchange, '1day', 260);
    if (candles) await stocksService.bulkInsertHistory(stock.id, '1day', candles);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function pollTick() {
  tickCount += 1;

  const stocks = await stocksService.getActiveStocks();
  const exchanges = [...new Set(stocks.map(s => s.exchange))];

  // Open exchanges poll every tick (60s); closed ones only every 15th tick
  // (~15 min) since prices aren't moving — conserves provider credit budget.
  const dueExchanges = exchanges.filter(exchange => marketHours.isMarketOpen(exchange) || tickCount % 15 === 0);
  if (!dueExchanges.length) return;

  const duePairs = stocks
    .filter(s => dueExchanges.includes(s.exchange))
    .map(s => ({ symbol: s.symbol, exchange: s.exchange }));
  const quotes = await stockDataProvider.fetchQuotesBatch(duePairs);

  const now = new Date();
  const minute = now.getMinutes();

  for (const quote of quotes) {
    const stock = stocks.find(s => s.symbol === quote.symbol && s.exchange === quote.exchange);
    if (!stock) continue;

    const isOpen = marketHours.isMarketOpen(stock.exchange, now);
    await stocksService.upsertQuote(stock.id, { ...quote, isMarketOpen: isOpen });

    // Synthetic 5-min intraday candle from this same quote poll — no extra API call.
    if (isOpen && minute % 5 === 0) {
      await stocksService.appendHistoryCandle(stock.id, '5min', {
        ts: now, open: quote.open, high: quote.high, low: quote.low, close: quote.price, volume: quote.volume,
      });
    }

    // One daily close candle per exchange, written at the exact minute it closes.
    const hours = marketHours.EXCHANGE_HOURS[stock.exchange];
    if (hours) {
      const localTime = new Intl.DateTimeFormat('en-US', {
        timeZone: hours.tz, hour12: false, hour: '2-digit', minute: '2-digit',
      }).format(now);
      if (localTime === hours.close) {
        await stocksService.appendHistoryCandle(stock.id, '1day', {
          ts: now, open: quote.open, high: quote.high, low: quote.low, close: quote.price, volume: quote.volume,
        });
      }
    }
  }

  if (now.getHours() === 0 && minute === 0) {
    await stocksService.pruneOldIntraday();
  }
}

const start = () => {
  if (!stockDataProvider.isConfigured()) {
    console.warn('TWELVE_DATA_API_KEY not set — stock prices will not update (routes still serve cached/empty data).');
    return;
  }

  backfillIfEmpty()
    .then(() => pollTick())
    .catch(err => console.error('stockPriceScheduler error:', err.message));

  cron.schedule('* * * * *', () => {
    pollTick().catch(err => console.error('stockPriceScheduler error:', err.message));
  });
};

module.exports = { start, pollTick };
