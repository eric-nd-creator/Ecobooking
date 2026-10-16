const pool = require('../config/db');

const createNotification = async ({ user_id, type, message, booking_id = null, link = null }) => {
  await pool.query(
    'INSERT INTO notifications (user_id, type, message, booking_id, link) VALUES (?,?,?,?,?)',
    [user_id, type, message, booking_id, link]
  );
};

module.exports = { createNotification };
