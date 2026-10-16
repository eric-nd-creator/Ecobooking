const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { fetchTransactionStatus, isConfigured } = require('../services/momoPayments');

// --- Users ---
const getUsersByRole = (role) => async (req, res) => {
  const { search, membership_status } = req.query;
  let query = `SELECT u.id, u.name, u.email, u.phone, u.created_at,
    m.status AS membership_status, m.type AS membership_type, m.end_date AS membership_end
    FROM users u
    LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active' AND m.end_date >= CURRENT_DATE
    WHERE u.role = ?`;
  const params = [role];

  if (search) { query += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (membership_status === 'active') { query += ' AND m.id IS NOT NULL'; }
  if (membership_status === 'none') { query += ' AND m.id IS NULL'; }

  query += ' ORDER BY u.name';
  const [rows] = await pool.query(query, params);
  res.json(rows);
};

const addUser = async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!['coach', 'ballboy', 'member'].includes(role))
    return res.status(400).json({ message: 'Invalid role' });

  const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) return res.status(409).json({ message: 'Email already exists' });

  // Accounts created without an explicit password get a random one-time password
  // instead of a shared hardcoded default, and must change it on first login.
  const tempPassword = password || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(tempPassword, 10);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role, phone, must_change_password) VALUES (?,?,?,?,?,?) RETURNING id',
    [name, email, hash, role, phone || null, !password]
  );
  res.status(201).json({
    message: 'User added',
    id: result.insertId,
    ...(password ? {} : { temporaryPassword: tempPassword }),
  });
};

const deleteUser = async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = ? AND role != 'admin'", [req.params.id]);
  res.json({ message: 'User deleted' });
};

const getMemberAccount = async (req, res) => {
  const [users] = await pool.query(
    'SELECT id, name, email, phone, created_at FROM users WHERE id = ? AND role = \'member\'',
    [req.params.id]
  );
  if (!users.length) return res.status(404).json({ message: 'Member not found' });

  const [membership] = await pool.query(
    'SELECT * FROM memberships WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.params.id]
  );
  const [bookings] = await pool.query(
    `SELECT b.*, c.name AS court_name FROM bookings b
     JOIN courts c ON b.court_id = c.id
     WHERE b.user_id = ? ORDER BY b.date DESC`,
    [req.params.id]
  );

  // Live MoMo status for the member's latest membership payment, so an admin
  // following a payment notification's link can see it here rather than just
  // the locally-recorded 'active'/'expired' membership status.
  let momoStatus = null;
  const reference = membership[0]?.payment_reference;
  if (reference && !reference.startsWith('DEMO-') && isConfigured()) {
    try {
      const status = await fetchTransactionStatus(reference);
      momoStatus = status.status;
    } catch (err) {
      console.error('MoMo status lookup failed for admin member view:', err.response?.data || err.message);
    }
  }

  res.json({ user: users[0], membership: membership[0] || null, bookings, momoStatus });
};

// --- Ball boy assignment ---
const assignBallBoy = async (req, res) => {
  try {
    const { ball_boy_id, booking_id } = req.body;

    if (!ball_boy_id || !booking_id)
      return res.status(400).json({ message: 'ball_boy_id and booking_id are required' });

    const [bb] = await pool.query("SELECT id FROM users WHERE id=? AND role='ballboy'", [ball_boy_id]);
    if (!bb.length) return res.status(404).json({ message: 'Ball boy not found' });

    const [bk] = await pool.query("SELECT id FROM bookings WHERE id=? AND status='confirmed'", [booking_id]);
    if (!bk.length) return res.status(404).json({ message: 'Confirmed booking not found' });

    // Remove any existing assignment for this ball boy on this booking then re-insert
    await pool.query(
      'DELETE FROM ball_boy_assignments WHERE ball_boy_id=? AND booking_id=?',
      [ball_boy_id, booking_id]
    );
    await pool.query(
      'INSERT INTO ball_boy_assignments (ball_boy_id, booking_id) VALUES (?,?)',
      [ball_boy_id, booking_id]
    );

    res.json({ message: 'Ball boy assigned' });
  } catch (err) {
    console.error('assignBallBoy error:', err.message);
    res.status(500).json({ message: 'Assignment failed' });
  }
};

// --- Analytics ---
const getAnalytics = async (req, res) => {
  const { date_from, date_to } = req.query;
  const hasRange = Boolean(date_from && date_to);
  const dateFilter = hasRange ? 'AND b.date BETWEEN ? AND ?' : '';
  const rangeParams = hasRange ? [date_from, date_to] : [];

  const [totalBookings] = await pool.query(
    `SELECT COUNT(*) AS count FROM bookings b WHERE b.status='confirmed' ${dateFilter}`,
    rangeParams
  );
  const [todayBookings] = await pool.query(
    "SELECT COUNT(*) AS count FROM bookings WHERE date=CURRENT_DATE AND status='confirmed'"
  );
  const [totalMembers] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role='member'");
  const [activeMembers] = await pool.query(
    "SELECT COUNT(*) AS count FROM memberships WHERE status='active' AND end_date >= CURRENT_DATE"
  );
  const [courtUsage] = await pool.query(
    `SELECT c.name, COUNT(b.id) AS bookings
     FROM courts c LEFT JOIN bookings b ON c.id=b.court_id AND b.status='confirmed' ${hasRange ? 'AND b.date BETWEEN ? AND ?' : ''}
     GROUP BY c.id, c.name ORDER BY c.id`,
    hasRange ? rangeParams : []
  );
  const [revenue] = await pool.query(
    "SELECT SUM(amount) AS total FROM payments WHERE status='successful'"
  );
  const [recentBookings] = await pool.query(
    `SELECT b.date, b.start_time, b.end_time, c.name AS court, u.name AS member
     FROM bookings b JOIN courts c ON b.court_id=c.id JOIN users u ON b.user_id=u.id
     WHERE b.status='confirmed' ORDER BY b.created_at DESC LIMIT 10`
  );
  const [membershipRevenue] = await pool.query(
    "SELECT type, COUNT(*) AS count, SUM(amount) AS revenue FROM memberships WHERE status='active' GROUP BY type"
  );
  const [guestRevenue] = await pool.query(
    "SELECT COUNT(*) AS count, SUM(amount) AS revenue FROM payments WHERE status='successful' AND booking_id IS NOT NULL"
  );

  res.json({
    totalBookings: totalBookings[0].count,
    todayBookings: todayBookings[0].count,
    totalMembers: totalMembers[0].count,
    activeMembers: activeMembers[0].count,
    courtUsage,
    revenue: revenue[0].total || 0,
    recentBookings,
    membershipRevenue,
    guestRevenue: { count: Number(guestRevenue[0].count) || 0, revenue: Number(guestRevenue[0].revenue) || 0 }
  });
};

module.exports = {
  getMembers: getUsersByRole('member'),
  getCoaches: getUsersByRole('coach'),
  getBallBoys: getUsersByRole('ballboy'),
  addUser,
  deleteUser,
  getMemberAccount,
  assignBallBoy,
  getAnalytics
};
