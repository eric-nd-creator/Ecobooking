const cron = require('node-cron');
const pool = require('../config/db');
const { sendSMS } = require('./atSMS');
const { createNotification } = require('./notificationService');

// Picks a free ball boy for a session: among those with no overlapping assignment that
// day, prefers whoever's last assignment ended earliest (idle ball boys first).
async function autoAssignBallBoy({ date, start_time, end_time }) {
  const [candidates] = await pool.query(
    `SELECT u.id, u.name, u.phone FROM users u
     WHERE u.role='ballboy' AND NOT EXISTS (
       SELECT 1 FROM ball_boy_assignments ba JOIN bookings b2 ON b2.id=ba.booking_id
       WHERE ba.ball_boy_id=u.id AND b2.date=? AND b2.status='confirmed'
         AND NOT (b2.end_time<=? OR b2.start_time>=?)
     )
     ORDER BY (
       SELECT MAX(b3.end_time) FROM ball_boy_assignments ba3 JOIN bookings b3 ON b3.id=ba3.booking_id
       WHERE ba3.ball_boy_id=u.id AND b3.date=? AND b3.status='confirmed'
     ) ASC NULLS FIRST
     LIMIT 1`,
    [date, start_time, end_time, date]
  );
  return candidates[0] || null;
}

async function processDueReminders() {
  const [dueBookings] = await pool.query(
    `SELECT b.*, c.name AS court_name, COALESCE(u.name, b.guest_name) AS member_name
     FROM bookings b
     JOIN courts c ON c.id=b.court_id
     LEFT JOIN users u ON u.id=b.user_id
     WHERE b.status='confirmed' AND b.with_partner=true AND b.date=CURRENT_DATE
       AND (b.date + b.start_time)::timestamp - NOW() <= INTERVAL '15 minutes'
       AND (b.date + b.start_time)::timestamp - NOW() > INTERVAL '0 minutes'
       AND NOT EXISTS (SELECT 1 FROM ball_boy_assignments ba WHERE ba.booking_id=b.id)`
  );

  for (const booking of dueBookings) {
    try {
      const ballBoy = await autoAssignBallBoy(booking);
      if (!ballBoy) continue;

      await pool.query(
        'INSERT INTO ball_boy_assignments (ball_boy_id, booking_id) VALUES (?,?)',
        [ballBoy.id, booking.id]
      );

      const timeLabel = `${booking.start_time.slice(0, 5)}-${booking.end_time.slice(0, 5)}`;
      const message = `Reminder: assist ${booking.member_name || 'a member'} at ${booking.court_name}, ${timeLabel}, starting soon.`;

      await createNotification({
        user_id: ballBoy.id,
        type: 'ballboy_reminder',
        message,
        booking_id: booking.id,
      });
      if (ballBoy.phone) sendSMS(ballBoy.phone, message).catch(() => {});
    } catch (err) {
      console.error('Ball boy reminder error for booking', booking.id, ':', err.message);
    }
  }
}

const start = () => {
  // Run once immediately on boot so a restart doesn't wait up to a minute (or
  // silently miss a reminder whose window is about to close) before the first tick.
  processDueReminders().catch(err => console.error('reminderScheduler error:', err.message));

  cron.schedule('* * * * *', () => {
    processDueReminders().catch(err => console.error('reminderScheduler error:', err.message));
  }, { timezone: process.env.CRON_TIMEZONE || 'Africa/Kigali' });
};

module.exports = { start };
