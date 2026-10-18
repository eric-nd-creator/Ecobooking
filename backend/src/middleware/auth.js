const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // A password change or 2FA reset bumps token_version, instantly invalidating
    // every previously-issued JWT rather than waiting out the 7-day expiry.
    const [rows] = await pool.query('SELECT token_version FROM users WHERE id=?', [decoded.id]);
    if (!rows.length || rows[0].token_version !== decoded.tv) {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const checkRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Access denied' });
  next();
};

// 10 attempts per 15 minutes per IP — slows down credential-stuffing/brute-force
// without needing a persistent store (in-memory is fine for a single-instance app).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Dedicated reset limiter keeps password recovery attempts from consuming the
// login allowance and limits token/email generation to five requests per IP.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Please try again later.' },
});

module.exports = { auth, checkRole, loginLimiter, passwordResetLimiter };
