const pool = require('../config/db');

const getMyNotifications = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  const unreadCount = rows.filter(n => !n.is_read).length;
  res.json({ notifications: rows, unreadCount });
};

const markAsRead = async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read=true WHERE id=? AND user_id=?',
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Marked as read' });
};

module.exports = { getMyNotifications, markAsRead };
