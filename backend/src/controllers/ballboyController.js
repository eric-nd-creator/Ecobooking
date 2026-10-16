const pool = require('../config/db');

const getAssignments = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, b.date, b.start_time, b.end_time, c.name AS court_name, u.name AS member_name
     FROM ball_boy_assignments a
     JOIN bookings b ON a.booking_id = b.id
     JOIN courts c ON b.court_id = c.id
     JOIN users u ON b.user_id = u.id
     WHERE a.ball_boy_id = ? ORDER BY b.date DESC, b.start_time DESC`,
    [req.user.id]
  );
  res.json(rows);
};

module.exports = { getAssignments };
