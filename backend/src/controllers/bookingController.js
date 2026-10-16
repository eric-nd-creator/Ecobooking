const pool = require('../config/db');
const emailService = require('../services/emailService');
const { sendSMS } = require('../services/atSMS');
const { createNotification } = require('../services/notificationService');
const { hasCourtConflict } = require('../utils/bookingConflict');

const createBooking = async (req, res) => {
  const { court_id, date, start_time, end_time, target_user_id, with_partner } = req.body;
  const { id: userId, role } = req.user;

  // Reject slots that have already started in the club's local timezone.
  const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const nowValue = (type) => nowParts.find(part => part.type === type)?.value;
  const clubNow = `${nowValue('year')}-${nowValue('month')}-${nowValue('day')}T${nowValue('hour')}:${nowValue('minute')}`;
  if (`${date}T${start_time.slice(0, 5)}` <= clubNow) {
    return res.status(400).json({ message: 'Cannot book a time slot that has already passed' });
  }

  if (role === 'member') {
    const [mem] = await pool.query(
      "SELECT id FROM memberships WHERE user_id=? AND status='active' AND end_date >= CURRENT_DATE",
      [userId]
    );
    if (!mem.length)
      return res.status(403).json({ message: 'Active membership required to book a court' });

    // Member rule: max 2 hours per booking
    const startH = parseInt(start_time.split(':')[0]);
    const endH   = parseInt(end_time.split(':')[0]);
    if (endH - startH > 2)
      return res.status(400).json({ message: 'Members can book a maximum of 2 hours on one court' });

    // Member rule: only 1 court at the same time
    const [concurrent] = await pool.query(
      `SELECT id FROM bookings WHERE user_id=? AND date=? AND status='confirmed'
       AND NOT (end_time <= ? OR start_time >= ?)`,
      [userId, date, start_time, end_time]
    );
    if (concurrent.length > 0)
      return res.status(409).json({ message: 'Members can only book 1 court at the same time' });
  }

  // Coach rule: max 2 courts at the same time
  if (role === 'coach') {
    const [concurrent] = await pool.query(
      `SELECT id FROM bookings WHERE coach_id=? AND date=? AND status='confirmed'
       AND NOT (end_time <= ? OR start_time >= ?)`,
      [userId, date, start_time, end_time]
    );
    if (concurrent.length >= 2)
      return res.status(409).json({ message: 'Coaches can book a maximum of 2 courts at the same time' });
  }

  let bookedForUser = userId;
  if ((role === 'coach' || role === 'admin') && target_user_id) {
    const [target] = await pool.query("SELECT id FROM users WHERE id=? AND role='member'", [target_user_id]);
    if (!target.length) return res.status(400).json({ message: 'target_user_id is not a valid member' });
    bookedForUser = target_user_id;
  }
  const coachId = role === 'coach' ? userId : null;
  const withPartner = !!with_partner;

  let bookingId;
  try {
    // pg_advisory_xact_lock serializes concurrent createBooking calls for the same
    // court so two requests can't both pass the conflict check before either INSERT
    // commits (a TOCTOU race that could otherwise double-book a slot).
    bookingId = await pool.transaction(async (query) => {
      await query('SELECT pg_advisory_xact_lock(?)', [Number(court_id)]);

      if (await hasCourtConflict(query, { court_id, date, start_time, end_time })) {
        const err = new Error('Court already booked for this time slot');
        err.status = 409;
        throw err;
      }

      const [result] = await query(
        'INSERT INTO bookings (court_id, user_id, coach_id, date, start_time, end_time, booked_by, with_partner) VALUES (?,?,?,?,?,?,?,?) RETURNING id',
        [court_id, bookedForUser, coachId, date, start_time, end_time, role, withPartner]
      );
      return result.insertId;
    });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ message: err.message });
    throw err;
  }

  // Send confirmation email (non-blocking)
  pool.query(
    'SELECT u.name, u.email, c.name AS court_name FROM users u JOIN courts c ON c.id=? WHERE u.id=?',
    [court_id, bookedForUser]
  ).then(([rows]) => {
    if (rows[0]?.email) {
      emailService.bookingConfirmed({
        to: rows[0].email,
        name: rows[0].name,
        courtName: rows[0].court_name,
        date: new Date(date).toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        startTime: start_time.slice(0, 5),
        endTime: end_time.slice(0, 5)
      }).catch(err => console.error('Booking confirmation email failed:', err.message));
    }
  }).catch(err => console.error('Booking confirmation email failed:', err.message));

  // Solo member (no partner) → auto-match a coach to play with them
  let assignedCoach = null;
  if (role === 'member' && !withPartner) {
    assignedCoach = await autoAssignCoach({ bookingId, court_id, date, start_time, end_time, memberId: bookedForUser });
  }

  res.status(201).json({ message: 'Booking confirmed', booking_id: bookingId, coach: assignedCoach });
};

// Picks a free coach for a solo member's session: among coaches with no overlapping
// session that day, prefers whoever's last session ended earliest (idle coaches first).
async function autoAssignCoach({ bookingId, court_id, date, start_time, end_time, memberId }) {
  const [candidates] = await pool.query(
    `SELECT u.id, u.name, u.phone FROM users u
     WHERE u.role='coach' AND NOT EXISTS (
       SELECT 1 FROM bookings b2 WHERE b2.coach_id=u.id AND b2.date=? AND b2.status='confirmed'
         AND NOT (b2.end_time<=? OR b2.start_time>=?)
     )
     ORDER BY (
       SELECT MAX(b3.end_time) FROM bookings b3
       WHERE b3.coach_id=u.id AND b3.date=? AND b3.status='confirmed'
     ) ASC NULLS FIRST
     LIMIT 1`,
    [date, start_time, end_time, date]
  );
  if (!candidates.length) return null;
  const coach = candidates[0];

  await pool.query('UPDATE bookings SET coach_id=? WHERE id=?', [coach.id, bookingId]);

  const [[court]] = await pool.query('SELECT name FROM courts WHERE id=?', [court_id]);
  const [[member]] = await pool.query('SELECT name FROM users WHERE id=?', [memberId]);
  const dateLabel = new Date(date).toLocaleDateString('en', { month: 'long', day: 'numeric' });
  const timeLabel = `${start_time.slice(0, 5)}-${end_time.slice(0, 5)}`;

  await createNotification({
    user_id: memberId,
    type: 'member_matched',
    message: `You're matched with Coach ${coach.name} for your ${court.name} session on ${dateLabel} at ${timeLabel}.`,
    booking_id: bookingId,
  });
  await createNotification({
    user_id: coach.id,
    type: 'coach_assigned',
    message: `You've been assigned to play with ${member.name} at ${court.name} on ${dateLabel}, ${timeLabel}.`,
    booking_id: bookingId,
  });
  if (coach.phone) {
    sendSMS(coach.phone, `Hello ${coach.name}, you're assigned to play with ${member.name} at ${court.name} on ${dateLabel}, ${timeLabel}.`).catch(err => console.error('Coach SMS failed:', err.message));
  }

  return { id: coach.id, name: coach.name };
}

const getMyBookings = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, c.name AS court_name, u.name AS member_name, co.name AS coach_name
     FROM bookings b
     JOIN courts c ON b.court_id = c.id
     JOIN users u ON b.user_id = u.id
     LEFT JOIN users co ON b.coach_id = co.id
     WHERE b.user_id = ? OR b.coach_id = ?
     ORDER BY b.date DESC, b.start_time DESC`,
    [req.user.id, req.user.id]
  );
  res.json(rows);
};

const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { id: userId, role } = req.user;

  if (!reason?.trim())
    return res.status(400).json({ message: 'A cancellation reason is required' });

  const [rows] = await pool.query(
    `SELECT b.*, COALESCE(u.name, b.guest_name) AS name, u.email, c.name AS court_name
     FROM bookings b LEFT JOIN users u ON b.user_id=u.id JOIN courts c ON b.court_id=c.id
     WHERE b.id=?`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Booking not found' });

  const booking = rows[0];
  const isOwner = booking.user_id === userId;
  const isAssignedCoach = booking.coach_id === userId;
  const isAdmin = role === 'admin';
  if (!isOwner && !isAssignedCoach && !isAdmin)
    return res.status(403).json({ message: 'You are not authorized to cancel this booking' });

  if (booking.status === 'cancelled')
    return res.status(400).json({ message: 'Booking is already cancelled' });

  await pool.query(
    "UPDATE bookings SET status='cancelled', cancellation_reason=?, cancelled_by=?, cancelled_at=NOW() WHERE id=?",
    [reason.trim(), userId, id]
  );

  // Send cancellation email (non-blocking)
  if (booking.email) {
    emailService.bookingCancelled({
      to: booking.email,
      name: booking.name,
      courtName: booking.court_name,
      date: new Date(booking.date).toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      startTime: booking.start_time?.slice(0, 5),
      reason: reason.trim(),
    }).catch(err => console.error('Cancellation email failed:', err.message));
  }

  res.json({ message: 'Booking cancelled' });
};

const getAllBookings = async (req, res) => {
  const { date_from, date_to, search, status } = req.query;
  let query = `SELECT b.*, c.name AS court_name, COALESCE(u.name, b.guest_name) AS member_name, co.name AS coach_name
     FROM bookings b JOIN courts c ON b.court_id=c.id LEFT JOIN users u ON b.user_id=u.id
     LEFT JOIN users co ON b.coach_id=co.id WHERE 1=1`;
  const params = [];

  if (date_from) { query += ' AND b.date >= ?'; params.push(date_from); }
  if (date_to)   { query += ' AND b.date <= ?'; params.push(date_to); }
  if (status)    { query += ' AND b.status = ?'; params.push(status); }
  if (search)    { query += ' AND (u.name LIKE ? OR b.guest_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY b.date DESC, b.start_time DESC';
  const [rows] = await pool.query(query, params);
  res.json(rows);
};

module.exports = { createBooking, getMyBookings, cancelBooking, getAllBookings };
