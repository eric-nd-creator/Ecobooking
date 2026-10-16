const pool = require('../config/db');
const { fitLinearRegression } = require('./linearRegression');

const DAY_MS = 24 * 60 * 60 * 1000;
const COURT_DAILY_SLOTS = 16; // hours 06:00-21:00 inclusive, matches courtController

const toDateStr = (d) => (d instanceof Date ? d.toISOString().split('T')[0] : d);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY_MS);

let cachedCourtCount = null;
async function getCourtCount() {
  if (cachedCourtCount !== null) return cachedCourtCount;
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM courts');
  cachedCourtCount = Number(rows[0].count) || 1;
  return cachedCourtCount;
}

// A 'bookings' forecast can't exceed physical capacity (courts × daily slots) —
// without this, a positive-slope model extrapolated over a long horizon can
// predict more bookings/day than the club could ever physically hold.
async function maxForPeriod(type, periodDays) {
  if (type === 'revenue') return Infinity;
  const courtCount = await getCourtCount();
  return courtCount * COURT_DAILY_SLOTS * periodDays;
}

// type: 'bookings' counts confirmed bookings; 'revenue' sums successful payment amounts
// (membership + guest-booking payments). Revenue rows are dated by payment.created_at,
// and court/hour filters on revenue only match guest-booking payments (memberships have
// no court/hour), which is the correct, honest behavior — not a bug.
async function getDailyCounts({ courtId, hour, type = 'bookings' } = {}) {
  if (type === 'revenue') {
    const params = [];
    let where = "p.status='successful'";
    if (courtId) { params.push(courtId); where += ` AND b.court_id=?`; }
    if (hour !== undefined && hour !== null && hour !== '') { params.push(hour); where += ` AND EXTRACT(HOUR FROM b.start_time)::int=?`; }
    const [rows] = await pool.query(
      `SELECT p.created_at::date AS date, SUM(p.amount) AS count
       FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id
       WHERE ${where} GROUP BY p.created_at::date ORDER BY p.created_at::date`, params
    );
    return rows.map(r => ({ date: toDateStr(r.date), count: Number(r.count) }));
  }
  const params = [];
  let where = "status='confirmed'";
  if (courtId) { params.push(courtId); where += ` AND court_id=?`; }
  if (hour !== undefined && hour !== null && hour !== '') { params.push(hour); where += ` AND EXTRACT(HOUR FROM start_time)::int=?`; }
  const [rows] = await pool.query(
    `SELECT date, COUNT(*) AS count FROM bookings WHERE ${where} GROUP BY date ORDER BY date`, params
  );
  return rows.map(r => ({ date: toDateStr(r.date), count: Number(r.count) }));
}

async function getWeeklyCounts({ courtId, hour, type = 'bookings' } = {}) {
  if (type === 'revenue') {
    const params = [];
    let where = "p.status='successful'";
    if (courtId) { params.push(courtId); where += ` AND b.court_id=?`; }
    if (hour !== undefined && hour !== null && hour !== '') { params.push(hour); where += ` AND EXTRACT(HOUR FROM b.start_time)::int=?`; }
    const [rows] = await pool.query(
      `SELECT date_trunc('week', p.created_at)::date AS week_start, SUM(p.amount) AS count
       FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id
       WHERE ${where} GROUP BY week_start ORDER BY week_start`, params
    );
    return rows.map(r => ({ date: toDateStr(r.week_start), count: Number(r.count) }));
  }
  const params = [];
  let where = "status='confirmed'";
  if (courtId) { params.push(courtId); where += ` AND court_id=?`; }
  if (hour !== undefined && hour !== null && hour !== '') { params.push(hour); where += ` AND EXTRACT(HOUR FROM start_time)::int=?`; }
  const [rows] = await pool.query(
    `SELECT date_trunc('week', date)::date AS week_start, COUNT(*) AS count FROM bookings WHERE ${where} GROUP BY week_start ORDER BY week_start`, params
  );
  return rows.map(r => ({ date: toDateStr(r.week_start), count: Number(r.count) }));
}

async function getMonthlyCounts({ courtId, hour, type = 'bookings' } = {}) {
  if (type === 'revenue') {
    const params = [];
    let where = "p.status='successful'";
    if (courtId) { params.push(courtId); where += ` AND b.court_id=?`; }
    if (hour !== undefined && hour !== null && hour !== '') { params.push(hour); where += ` AND EXTRACT(HOUR FROM b.start_time)::int=?`; }
    const [rows] = await pool.query(
      `SELECT date_trunc('month', p.created_at)::date AS month_start, SUM(p.amount) AS count
       FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id
       WHERE ${where} GROUP BY month_start ORDER BY month_start`, params
    );
    return rows.map(r => ({ date: toDateStr(r.month_start), count: Number(r.count) }));
  }
  const params = [];
  let where = "status='confirmed'";
  if (courtId) { params.push(courtId); where += ` AND court_id=?`; }
  if (hour !== undefined && hour !== null && hour !== '') { params.push(hour); where += ` AND EXTRACT(HOUR FROM start_time)::int=?`; }
  const [rows] = await pool.query(
    `SELECT date_trunc('month', date)::date AS month_start, COUNT(*) AS count FROM bookings WHERE ${where} GROUP BY month_start ORDER BY month_start`, params
  );
  return rows.map(r => ({ date: toDateStr(r.month_start), count: Number(r.count) }));
}

async function getHourlyByDay({ courtId } = {}) {
  const params = [];
  let where = "status='confirmed'";
  if (courtId) { params.push(courtId); where += ` AND court_id=?`; }
  const [rows] = await pool.query(
    `SELECT date, EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*) AS count
     FROM bookings WHERE ${where} GROUP BY date, hour ORDER BY hour, date`, params
  );
  return rows.map(r => ({ date: toDateStr(r.date), hour: r.hour, count: Number(r.count) }));
}

async function getCourtByDay({ hour } = {}) {
  const params = [];
  let where = "b.status='confirmed'";
  if (hour !== undefined && hour !== null && hour !== '') { params.push(hour); where += ` AND EXTRACT(HOUR FROM b.start_time)::int=?`; }
  const [rows] = await pool.query(
    `SELECT b.date, b.court_id, c.name AS court_name, COUNT(*) AS count
     FROM bookings b JOIN courts c ON c.id = b.court_id
     WHERE ${where} GROUP BY b.date, b.court_id, c.name ORDER BY b.court_id, b.date`, params
  );
  return rows.map(r => ({ date: toDateStr(r.date), court_id: r.court_id, court_name: r.court_name, count: Number(r.count) }));
}

function seriesToPoints(series) {
  if (!series.length) return [];
  const first = series[0].date;
  return series.map(s => ({ x: daysBetween(first, s.date), y: s.count }));
}

async function saveModel(metric, { slope = null, intercept = null, r2 = null, sampleSize = 0, extra = null }) {
  await pool.query(
    `INSERT INTO prediction_models (metric, slope, intercept, r_squared, sample_size, extra, trained_at)
     VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT (metric) DO UPDATE SET
       slope=EXCLUDED.slope, intercept=EXCLUDED.intercept, r_squared=EXCLUDED.r_squared,
       sample_size=EXCLUDED.sample_size, extra=EXCLUDED.extra, trained_at=CURRENT_TIMESTAMP`,
    [metric, slope, intercept, r2, sampleSize, extra ? JSON.stringify(extra) : null]
  );
}

async function replaceForecasts(metric, rows) {
  await pool.query('DELETE FROM prediction_forecasts WHERE metric=?', [metric]);
  for (const row of rows) {
    await pool.query(
      'INSERT INTO prediction_forecasts (metric, period_label, period_date, predicted_value) VALUES (?,?,?,?)',
      [metric, row.period_label, row.period_date || null, row.predicted_value]
    );
  }
}

// ── Pure computation (no DB writes) — usable for live, filtered "what-if" exploration ──

async function computeDaily({ horizon = 14, courtId, hour, type = 'bookings' } = {}) {
  const series = await getDailyCounts({ courtId, hour, type });
  const points = seriesToPoints(series);
  const model = fitLinearRegression(points);
  const lastX = points.length ? points[points.length - 1].x : 0;
  const firstDate = series.length ? series[0].date : toDateStr(new Date());
  const cap = await maxForPeriod(type, 1);

  const forecasts = [];
  for (let i = 1; i <= horizon; i++) {
    const x = lastX + i;
    const date = new Date(firstDate);
    date.setDate(date.getDate() + x);
    const dateStr = toDateStr(date);
    forecasts.push({ period_label: dateStr, period_date: dateStr, predicted_value: Math.min(cap, Math.max(0, model.predict(x))) });
  }
  return { series, model, forecasts };
}

async function computeWeekly({ horizon = 8, courtId, hour, type = 'bookings' } = {}) {
  const series = await getWeeklyCounts({ courtId, hour, type });
  const points = series.length ? series.map(s => ({ x: Math.round(daysBetween(series[0].date, s.date) / 7), y: s.count })) : [];
  const model = fitLinearRegression(points);
  const lastX = points.length ? points[points.length - 1].x : 0;
  const firstDate = series.length ? series[0].date : toDateStr(new Date());
  const cap = await maxForPeriod(type, 7);

  const forecasts = [];
  for (let i = 1; i <= horizon; i++) {
    const x = lastX + i;
    const date = new Date(firstDate);
    date.setDate(date.getDate() + x * 7);
    const dateStr = toDateStr(date);
    forecasts.push({ period_label: dateStr, period_date: dateStr, predicted_value: Math.min(cap, Math.max(0, model.predict(x))) });
  }
  return { series, model, forecasts };
}

async function computeMonthly({ horizon = 6, courtId, hour, type = 'bookings' } = {}) {
  const series = await getMonthlyCounts({ courtId, hour, type });
  const monthIndex = (d) => { const dt = new Date(d); return dt.getUTCFullYear() * 12 + dt.getUTCMonth(); };
  const points = series.length ? series.map(s => ({ x: monthIndex(s.date) - monthIndex(series[0].date), y: s.count })) : [];
  const model = fitLinearRegression(points);
  const lastX = points.length ? points[points.length - 1].x : 0;
  const firstDate = series.length ? series[0].date : toDateStr(new Date());
  const cap = await maxForPeriod(type, 30);

  const forecasts = [];
  for (let i = 1; i <= horizon; i++) {
    const x = lastX + i;
    const date = new Date(firstDate);
    date.setUTCMonth(date.getUTCMonth() + x);
    const label = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    forecasts.push({ period_label: label, period_date: toDateStr(date), predicted_value: Math.min(cap, Math.max(0, model.predict(x))) });
  }
  return { series, model, forecasts };
}

async function computePeakHours({ courtId } = {}) {
  const rows = await getHourlyByDay({ courtId });
  const byHour = new Map();
  for (const r of rows) {
    if (!byHour.has(r.hour)) byHour.set(r.hour, []);
    byHour.get(r.hour).push(r);
  }

  const hourModels = [];
  const forecasts = [];
  for (const [hour, series] of byHour) {
    series.sort((a, b) => a.date.localeCompare(b.date));
    const points = seriesToPoints(series.map(s => ({ date: s.date, count: s.count })));
    const model = fitLinearRegression(points);
    const lastX = points.length ? points[points.length - 1].x : 0;
    const predicted = Math.max(0, model.predict(lastX + 7)); // one week ahead
    hourModels.push({ hour, slope: model.slope, intercept: model.intercept, r2: model.r2, sampleSize: points.length, predicted });
    forecasts.push({ period_label: `${hour.toString().padStart(2, '0')}:00`, period_date: null, predicted_value: predicted });
  }
  forecasts.sort((a, b) => b.predicted_value - a.predicted_value);
  hourModels.sort((a, b) => b.predicted - a.predicted);

  const historical = [...new Set(rows.map(r => r.hour))].sort((a, b) => a - b)
    .map(hour => ({ period_label: `${hour.toString().padStart(2, '0')}:00`, actual_value: rows.filter(r => r.hour === hour).reduce((s, r) => s + r.count, 0) }));

  return { rows, hourModels, forecasts, historical };
}

async function computeCourtUtilization({ hour } = {}) {
  const rows = await getCourtByDay({ hour });
  const byCourt = new Map();
  for (const r of rows) {
    if (!byCourt.has(r.court_id)) byCourt.set(r.court_id, { name: r.court_name, series: [] });
    byCourt.get(r.court_id).series.push(r);
  }

  const courtModels = [];
  const forecasts = [];
  for (const [courtId, { name, series }] of byCourt) {
    series.sort((a, b) => a.date.localeCompare(b.date));
    const points = seriesToPoints(series.map(s => ({ date: s.date, count: s.count })));
    const model = fitLinearRegression(points);
    const lastX = points.length ? points[points.length - 1].x : 0;
    const predictedCount = Math.max(0, model.predict(lastX + 7));
    const utilizationPct = Math.min(100, (predictedCount / COURT_DAILY_SLOTS) * 100);
    courtModels.push({ court_id: courtId, court_name: name, slope: model.slope, intercept: model.intercept, r2: model.r2, sampleSize: points.length, utilizationPct });
    forecasts.push({ period_label: name, period_date: null, predicted_value: utilizationPct });
  }
  forecasts.sort((a, b) => b.predicted_value - a.predicted_value);
  courtModels.sort((a, b) => b.utilizationPct - a.utilizationPct);

  const historical = [...byCourt.entries()].map(([courtId, { name, series }]) => ({
    period_label: name, actual_value: series.reduce((s, r) => s + r.count, 0),
  }));

  return { rows, courtModels, forecasts, historical };
}

// ── Single-point prediction — "what's the predicted value on this exact date/month?" ──

async function predictDailyPoint(dateStr, { courtId, hour, type = 'bookings' } = {}) {
  const series = await getDailyCounts({ courtId, hour, type });
  const points = seriesToPoints(series);
  const model = fitLinearRegression(points);
  const firstDate = series.length ? series[0].date : toDateStr(new Date());
  const x = daysBetween(firstDate, dateStr);
  const cap = await maxForPeriod(type, 1);
  return { period_label: dateStr, predicted_value: Math.min(cap, Math.max(0, model.predict(x))) };
}

async function predictMonthlyPoint(monthStr, { courtId, hour, type = 'bookings' } = {}) {
  const series = await getMonthlyCounts({ courtId, hour, type });
  const monthIndex = (d) => { const dt = new Date(d); return dt.getUTCFullYear() * 12 + dt.getUTCMonth(); };
  const points = series.length ? series.map(s => ({ x: monthIndex(s.date) - monthIndex(series[0].date), y: s.count })) : [];
  const model = fitLinearRegression(points);
  const firstDate = series.length ? series[0].date : toDateStr(new Date());
  const [ty, tm] = monthStr.split('-').map(Number);
  const x = (ty * 12 + (tm - 1)) - monthIndex(firstDate);
  return { period_label: monthStr, predicted_value: Math.max(0, model.predict(x)) };
}

// ── Trained snapshot (persisted) — powers the KPI summary cards + "Retrain Model" ──

async function trainDaily(horizon = 14) {
  const { model, forecasts, series } = await computeDaily({ horizon });
  await saveModel('daily', { slope: model.slope, intercept: model.intercept, r2: model.r2, sampleSize: series.length });
  await replaceForecasts('daily', forecasts);
  return { model, forecasts };
}

async function trainWeekly(horizon = 8) {
  const { model, forecasts, series } = await computeWeekly({ horizon });
  await saveModel('weekly', { slope: model.slope, intercept: model.intercept, r2: model.r2, sampleSize: series.length });
  await replaceForecasts('weekly', forecasts);
  return { model, forecasts };
}

async function trainMonthly(horizon = 6) {
  const { model, forecasts, series } = await computeMonthly({ horizon });
  await saveModel('monthly', { slope: model.slope, intercept: model.intercept, r2: model.r2, sampleSize: series.length });
  await replaceForecasts('monthly', forecasts);
  return { model, forecasts };
}

async function trainPeakHours() {
  const { rows, hourModels, forecasts } = await computePeakHours();
  await saveModel('peak_hours', { sampleSize: rows.length, extra: hourModels });
  await replaceForecasts('peak_hours', forecasts);
  return { hourModels, forecasts };
}

async function trainCourtUtilization() {
  const { rows, courtModels, forecasts } = await computeCourtUtilization();
  await saveModel('court_utilization', { sampleSize: rows.length, extra: courtModels });
  await replaceForecasts('court_utilization', forecasts);
  return { courtModels, forecasts };
}

async function trainAll(horizons = {}) {
  const [daily, weekly, monthly, peakHours, courtUtilization] = await Promise.all([
    trainDaily(horizons.daily), trainWeekly(horizons.weekly), trainMonthly(horizons.monthly),
    trainPeakHours(), trainCourtUtilization(),
  ]);
  return { daily, weekly, monthly, peakHours, courtUtilization };
}

module.exports = {
  getDailyCounts, getWeeklyCounts, getMonthlyCounts, getHourlyByDay, getCourtByDay,
  computeDaily, computeWeekly, computeMonthly, computePeakHours, computeCourtUtilization,
  predictDailyPoint, predictMonthlyPoint,
  trainDaily, trainWeekly, trainMonthly, trainPeakHours, trainCourtUtilization, trainAll,
};
