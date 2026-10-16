const pool = require('../config/db');
const predictionService = require('../services/predictionService');

const LOOKBACK_DAILY_DAYS = 30;
const DEFAULT_HORIZON = { daily: 14, weekly: 8, monthly: 6 };
const COMPUTE_FN = {
  daily: predictionService.computeDaily,
  weekly: predictionService.computeWeekly,
  monthly: predictionService.computeMonthly,
};

async function hasModels() {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM prediction_models');
  return Number(rows[0].count) > 0;
}

const getPredictions = async (req, res) => {
  if (!(await hasModels())) await predictionService.trainAll();

  const [models] = await pool.query('SELECT * FROM prediction_models ORDER BY metric');
  const [tomorrow] = await pool.query(
    "SELECT predicted_value FROM prediction_forecasts WHERE metric='daily' ORDER BY period_date ASC LIMIT 1"
  );
  const [weekAhead] = await pool.query(
    "SELECT SUM(predicted_value) AS total FROM prediction_forecasts WHERE metric='daily' AND period_date <= (CURRENT_DATE + INTERVAL '7 days')"
  );
  const [monthAhead] = await pool.query(
    "SELECT SUM(predicted_value) AS total FROM prediction_forecasts WHERE metric='daily'"
  );
  const [peakHour] = await pool.query(
    "SELECT period_label, predicted_value FROM prediction_forecasts WHERE metric='peak_hours' ORDER BY predicted_value DESC LIMIT 1"
  );
  const [trendingCourt] = await pool.query(
    "SELECT period_label, predicted_value FROM prediction_forecasts WHERE metric='court_utilization' ORDER BY predicted_value DESC LIMIT 1"
  );

  // Revenue isn't persisted as its own trained model (it shares the 'daily' metric key
  // with bookings) — compute it live here instead, same cost as one extra query.
  const { forecasts: revenueForecasts } = await predictionService.computeDaily({ horizon: 14, type: 'revenue' });
  const revenueTomorrow = revenueForecasts[0]?.predicted_value || 0;
  const revenueNext7Days = revenueForecasts.slice(0, 7).reduce((s, f) => s + f.predicted_value, 0);
  const revenueNext14Days = revenueForecasts.reduce((s, f) => s + f.predicted_value, 0);

  res.json({
    models,
    summary: {
      predictedTomorrow: tomorrow[0] ? Math.round(tomorrow[0].predicted_value) : 0,
      predictedNext7Days: weekAhead[0]?.total ? Math.round(weekAhead[0].total) : 0,
      predictedNext14Days: monthAhead[0]?.total ? Math.round(monthAhead[0].total) : 0,
      peakHour: peakHour[0] || null,
      trendingCourt: trendingCourt[0] || null,
      predictedRevenueTomorrow: Math.round(revenueTomorrow),
      predictedRevenueNext7Days: Math.round(revenueNext7Days),
      predictedRevenueNext14Days: Math.round(revenueNext14Days),
    },
  });
};

// Updates the persisted "official" snapshot that powers the KPI cards above.
const trainModel = async (req, res) => {
  const { metric, horizon } = req.body || {};
  const horizonNum = horizon ? Math.min(365, Math.max(1, parseInt(horizon))) : undefined;

  if (metric === 'daily') await predictionService.trainDaily(horizonNum);
  else if (metric === 'weekly') await predictionService.trainWeekly(horizonNum);
  else if (metric === 'monthly') await predictionService.trainMonthly(horizonNum);
  else if (metric === 'peak_hours') await predictionService.trainPeakHours();
  else if (metric === 'court_utilization') await predictionService.trainCourtUtilization();
  else await predictionService.trainAll();

  return getPredictions(req, res);
};

// Live, on-demand forecast — always recomputed so the admin can freely filter by
// court, hour, and forecast period (day/week/month) without a separate "train" step.
const getForecast = async (req, res) => {
  const metric = ['daily', 'weekly', 'monthly', 'peak_hours', 'court_utilization'].includes(req.query.metric)
    ? req.query.metric : 'daily';

  const courtId = req.query.court_id ? parseInt(req.query.court_id) : undefined;
  const hour = req.query.hour !== undefined && req.query.hour !== '' ? parseInt(req.query.hour) : undefined;
  const horizonRaw = req.query.horizon ? parseInt(req.query.horizon) : undefined;
  const type = req.query.type === 'revenue' ? 'revenue' : 'bookings';

  if (COMPUTE_FN[metric]) {
    const horizon = horizonRaw ? Math.min(365, Math.max(1, horizonRaw)) : DEFAULT_HORIZON[metric];
    const { series, forecasts } = await COMPUTE_FN[metric]({ horizon, courtId, hour, type });

    let historical = series.map(s => ({ period_label: s.date, period_date: s.date, actual_value: s.count }));
    if (metric === 'daily') {
      const cutoff = new Date(Date.now() - LOOKBACK_DAILY_DAYS * 86400000);
      historical = historical.filter(h => new Date(h.period_date) >= cutoff);
    }

    return res.json({
      metric, type, historical, predicted: forecasts,
      filters: { court_id: courtId ?? null, hour: hour ?? null, horizon },
    });
  }

  if (metric === 'peak_hours') {
    const { historical, forecasts } = await predictionService.computePeakHours({ courtId });
    return res.json({ metric, historical, predicted: forecasts, filters: { court_id: courtId ?? null } });
  }

  // court_utilization
  const { historical, forecasts } = await predictionService.computeCourtUtilization({ hour });
  res.json({ metric, historical, predicted: forecasts, filters: { hour: hour ?? null } });
};

// Predicted value at one exact date (daily) or month (monthly) — the "peak" marker on the chart.
const getPredictionPoint = async (req, res) => {
  const { metric, date, month } = req.query;
  const courtId = req.query.court_id ? parseInt(req.query.court_id) : undefined;
  const hour = req.query.hour !== undefined && req.query.hour !== '' ? parseInt(req.query.hour) : undefined;
  const type = req.query.type === 'revenue' ? 'revenue' : 'bookings';

  if (metric === 'monthly') {
    if (!month) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    const point = await predictionService.predictMonthlyPoint(month, { courtId, hour, type });
    return res.json(point);
  }

  if (!date) return res.status(400).json({ message: 'date is required (YYYY-MM-DD)' });
  const point = await predictionService.predictDailyPoint(date, { courtId, hour, type });
  res.json(point);
};

module.exports = { getPredictions, trainModel, getForecast, getPredictionPoint };
