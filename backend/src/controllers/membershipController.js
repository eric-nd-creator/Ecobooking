const pool = require('../config/db');

const getMyMembership = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM memberships WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id]
  );
  res.json(rows[0] || null);
};

const getMembershipStats = async (req, res) => {
  const [total] = await pool.query("SELECT COUNT(*) AS total FROM memberships WHERE status='active'");
  const [byType] = await pool.query("SELECT type, COUNT(*) AS count FROM memberships WHERE status='active' GROUP BY type");
  const [revenue] = await pool.query("SELECT SUM(amount) AS total FROM payments WHERE status='successful'");
  res.json({ active: total[0].total, byType, revenue: revenue[0].total || 0 });
};

module.exports = { getMyMembership, getMembershipStats };
