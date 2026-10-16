-- Reservation prediction: trained linear-regression snapshots + generated forecast rows
CREATE TABLE IF NOT EXISTS prediction_models (
  id SERIAL PRIMARY KEY,
  metric VARCHAR(30) NOT NULL UNIQUE,
  slope DOUBLE PRECISION,
  intercept DOUBLE PRECISION,
  r_squared DOUBLE PRECISION,
  sample_size INTEGER,
  extra JSONB,
  trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prediction_forecasts (
  id SERIAL PRIMARY KEY,
  metric VARCHAR(30) NOT NULL,
  period_label VARCHAR(50) NOT NULL,
  period_date DATE,
  predicted_value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prediction_forecasts_metric ON prediction_forecasts(metric);
