// Static trading-hours facts (change maybe once a year) — a plain constant
// rather than a DB table avoids an admin-CRUD surface for near-immutable data.
const EXCHANGE_HOURS = {
  JSE: { open: '09:00', close: '17:00', tz: 'Africa/Johannesburg', days: [1, 2, 3, 4, 5] },
  NGX: { open: '10:00', close: '14:30', tz: 'Africa/Lagos', days: [1, 2, 3, 4, 5] },
  EGX: { open: '10:00', close: '14:30', tz: 'Africa/Cairo', days: [0, 1, 2, 3, 4] }, // Sun–Thu
  NSE: { open: '09:30', close: '15:00', tz: 'Africa/Nairobi', days: [1, 2, 3, 4, 5] },
};

function localParts(tz, now) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: WEEKDAY_INDEX[parts.weekday], hhmm: `${parts.hour}:${parts.minute}` };
}

function isMarketOpen(exchange, now = new Date()) {
  const hours = EXCHANGE_HOURS[exchange];
  if (!hours) return false;
  const { weekday, hhmm } = localParts(hours.tz, now);
  if (!hours.days.includes(weekday)) return false;
  return hhmm >= hours.open && hhmm < hours.close;
}

function getMarketStatus(exchange, now = new Date()) {
  const hours = EXCHANGE_HOURS[exchange];
  if (!hours) return { exchange, isOpen: false, opensAt: null, closesAt: null, timezone: null };
  return {
    exchange,
    isOpen: isMarketOpen(exchange, now),
    opensAt: hours.open,
    closesAt: hours.close,
    timezone: hours.tz,
  };
}

module.exports = { EXCHANGE_HOURS, isMarketOpen, getMarketStatus };
