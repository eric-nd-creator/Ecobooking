-- African Stocks: tracked symbols, latest-quote cache, OHLC history, per-user watchlist

CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  exchange VARCHAR(10) NOT NULL,       -- 'JSE','NGX','EGX','NSE'
  company_name VARCHAR(150) NOT NULL,
  country VARCHAR(60) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  logo_url TEXT,
  sector VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (symbol, exchange)
);

-- One row per stock, upserted every poll — powers the list/grid/movers views
-- without ever scanning stock_price_history.
CREATE TABLE IF NOT EXISTS stock_quotes (
  stock_id INTEGER PRIMARY KEY REFERENCES stocks(id) ON DELETE CASCADE,
  price DOUBLE PRECISION NOT NULL,
  previous_close DOUBLE PRECISION,
  open_price DOUBLE PRECISION,
  day_high DOUBLE PRECISION,
  day_low DOUBLE PRECISION,
  change_abs DOUBLE PRECISION,
  change_pct DOUBLE PRECISION,
  volume BIGINT,
  market_cap NUMERIC(20,2),
  is_market_open BOOLEAN NOT NULL DEFAULT FALSE,
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT
);

-- OHLC candles. Only two `interval` values are ever written (see stockPriceScheduler):
-- '5min' for a rolling 1-day intraday window, '1day' for everything else.
CREATE TABLE IF NOT EXISTS stock_price_history (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  interval VARCHAR(10) NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  open DOUBLE PRECISION NOT NULL,
  high DOUBLE PRECISION NOT NULL,
  low DOUBLE PRECISION NOT NULL,
  close DOUBLE PRECISION NOT NULL,
  volume BIGINT,
  UNIQUE (stock_id, interval, ts)
);
CREATE INDEX IF NOT EXISTS idx_stock_price_history_lookup ON stock_price_history(stock_id, interval, ts);

CREATE TABLE IF NOT EXISTS stock_watchlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, stock_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_watchlist_user ON stock_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_quotes_change_pct ON stock_quotes(change_pct);

-- Seed a curated list — Twelve Data has no reliable "list all African-exchange
-- symbols" endpoint on the free tier, so the tracked universe is hand-picked.
INSERT INTO stocks (symbol, exchange, company_name, country, currency, sector) VALUES
  ('NPN',     'JSE', 'Naspers Ltd',                    'South Africa', 'ZAR', 'Technology'),
  ('MTN',     'JSE', 'MTN Group Ltd',                  'South Africa', 'ZAR', 'Telecommunications'),
  ('SOL',     'JSE', 'Sasol Ltd',                       'South Africa', 'ZAR', 'Energy'),
  ('SBK',     'JSE', 'Standard Bank Group',             'South Africa', 'ZAR', 'Financials'),
  ('FSR',     'JSE', 'FirstRand Ltd',                   'South Africa', 'ZAR', 'Financials'),
  ('BHP',     'JSE', 'BHP Group Ltd',                   'South Africa', 'ZAR', 'Materials'),
  ('AGL',     'JSE', 'Anglo American plc',              'South Africa', 'ZAR', 'Materials'),
  ('SHP',     'JSE', 'Shoprite Holdings',                'South Africa', 'ZAR', 'Consumer Staples'),
  ('VOD',     'JSE', 'Vodacom Group Ltd',               'South Africa', 'ZAR', 'Telecommunications'),
  ('CPI',     'JSE', 'Curro Holdings Ltd',              'South Africa', 'ZAR', 'Education'),
  ('DANGCEM', 'NGX', 'Dangote Cement Plc',              'Nigeria',      'NGN', 'Materials'),
  ('GTCO',    'NGX', 'Guaranty Trust Holding Co',       'Nigeria',      'NGN', 'Financials'),
  ('ZENITHBANK','NGX','Zenith Bank Plc',                'Nigeria',      'NGN', 'Financials'),
  ('MTNN',    'NGX', 'MTN Nigeria Communications',      'Nigeria',      'NGN', 'Telecommunications'),
  ('BUACEMENT','NGX','BUA Cement Plc',                  'Nigeria',      'NGN', 'Materials'),
  ('NESTLE',  'NGX', 'Nestle Nigeria Plc',              'Nigeria',      'NGN', 'Consumer Staples'),
  ('COMI',    'EGX', 'Commercial International Bank',   'Egypt',        'EGP', 'Financials'),
  ('HRHO',    'EGX', 'EFG Hermes Holding',              'Egypt',        'EGP', 'Financials'),
  ('SWDY',    'EGX', 'Elsewedy Electric Co',            'Egypt',        'EGP', 'Industrials'),
  ('ETEL',    'EGX', 'Telecom Egypt',                   'Egypt',        'EGP', 'Telecommunications'),
  ('SCOM',    'NSE', 'Safaricom Plc',                    'Kenya',        'KES', 'Telecommunications'),
  ('EQTY',    'NSE', 'Equity Group Holdings',           'Kenya',        'KES', 'Financials'),
  ('KCB',     'NSE', 'KCB Group Plc',                   'Kenya',        'KES', 'Financials'),
  ('EABL',    'NSE', 'East African Breweries Plc',      'Kenya',        'KES', 'Consumer Staples')
ON CONFLICT (symbol, exchange) DO NOTHING;
