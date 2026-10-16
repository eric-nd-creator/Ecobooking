const pool = require('../config/db');

const getCourts = async (req, res) => {
  const [courts] = await pool.query('SELECT * FROM courts ORDER BY id');
  res.json(courts);
};

// Returns availability grid for a given date
// For each court, for each hour 6am-10pm, returns booking info or null
const getAvailability = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Date required' });

  const [courts] = await pool.query('SELECT * FROM courts ORDER BY id');
  // No member/guest identity here — this endpoint is public (used for the guest-
  // checkout availability grid) and only needs to know whether a slot is taken.
  const [bookings] = await pool.query(
    `SELECT id, court_id, start_time, end_time FROM bookings WHERE date = ? AND status = 'confirmed'`,
    [date]
  );

  const hours = [];
  for (let h = 6; h <= 21; h++) {
    const label = `${h.toString().padStart(2, '0')}:00`;
    const row = { hour: label };
    for (const court of courts) {
      // A slot at hour h (h:00–h+1:00) is booked if any confirmed booking
      // overlaps it: booking starts before h+1:00 AND ends after h:00
      const booking = bookings.find(b => {
        if (b.court_id !== court.id) return false;
        const start = parseInt(b.start_time.split(':')[0]);
        const end   = parseInt(b.end_time.split(':')[0]);
        return start <= h && end > h;
      });
      row[`court_${court.id}`] = booking
        ? { status: 'booked', booking_id: booking.id }
        : { status: isPastHour(date, h) ? 'past' : 'available' };
    }
    hours.push(row);
  }

  res.json({ courts, hours, date });
};

function isPastHour(date, hour) {
  const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const nowValue = (type) => nowParts.find(part => part.type === type)?.value;
  const clubNow = `${nowValue('year')}-${nowValue('month')}-${nowValue('day')}T${nowValue('hour')}:${nowValue('minute')}`;
  const slot = `${date}T${hour.toString().padStart(2, '0')}:00`;
  return slot <= clubNow;
}

module.exports = { getCourts, getAvailability };
