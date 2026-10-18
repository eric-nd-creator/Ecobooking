const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const qrcode = require('qrcode');
const pool = require('../config/db');
const emailService = require('../services/emailService');
const totp = require('../utils/totp');
const { createResetToken, isValidEmail, getPasswordError } = require('../utils/passwordReset');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const TWOFA_CHALLENGE_TTL = '5m';

const signSession = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, name: user.name, tv: user.token_version },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

const publicUser = (user) => ({
  id: user.id, name: user.name, email: user.email, role: user.role,
  totpEnabled: user.totp_enabled, mustChangePassword: user.must_change_password,
});

// Self-registration is member-only. Coach/ball-boy accounts must be created by
// an admin (POST /api/admin/users) — previously any anonymous caller could pick
// role=coach and inherit staff privileges (no membership requirement, ability to
// book on behalf of other users) with zero vetting.
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?,?,?,?,?) RETURNING id',
      [name, email, hash, phone || null, 'member']
    );

    emailService.welcomeEmail({ to: email, name }).catch(err => console.error('Welcome email failed:', err.message));

    const user = { id: result.insertId, name, email, role: 'member', token_version: 0, totp_enabled: false, must_change_password: false };
    res.status(201).json({ token: signSession(user), user: publicUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  if (user.totp_enabled) {
    const challenge = jwt.sign({ id: user.id, purpose: '2fa_pending' }, process.env.JWT_SECRET, { expiresIn: TWOFA_CHALLENGE_TTL });
    return res.json({ requires2FA: true, challenge });
  }

  res.json({ token: signSession(user), user: publicUser(user) });
};

// Exchanges a short-lived 2FA challenge + a 6-digit authenticator code for a real session.
const verifyLogin2FA = async (req, res) => {
  const { challenge, code } = req.body;
  if (!challenge || !code) return res.status(400).json({ message: 'Challenge and code are required' });

  let payload;
  try {
    payload = jwt.verify(challenge, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Login session expired, please sign in again' });
  }
  if (payload.purpose !== '2fa_pending')
    return res.status(400).json({ message: 'Invalid challenge' });

  const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [payload.id]);
  const user = rows[0];
  if (!user || !user.totp_enabled) return res.status(401).json({ message: 'Invalid challenge' });

  if (!totp.verifyToken(user.totp_secret, code))
    return res.status(401).json({ message: 'Invalid or expired authenticator code' });

  res.json({ token: signSession(user), user: publicUser(user) });
};

const getMe = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, phone, created_at, totp_enabled, must_change_password FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json(rows[0]);
};

const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

  await pool.query('UPDATE users SET name=?, phone=? WHERE id=?', [name.trim(), phone || null, req.user.id]);

  const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  const updated = rows[0];
  res.json({ user: publicUser(updated), token: signSession(updated) });
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ message: 'Both current and new password are required' });
  if (new_password.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });

  const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  const user = rows[0];
  const match = await bcrypt.compare(current_password, user.password);
  if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

  const hash = await bcrypt.hash(new_password, 10);
  // Bumping token_version invalidates every JWT issued before this change —
  // a token stolen earlier stops working immediately instead of staying valid for 7 days.
  const [updatedRows] = await pool.query(
    'UPDATE users SET password=?, token_version=token_version+1, must_change_password=false WHERE id=? RETURNING *',
    [hash, req.user.id]
  );
  const updated = updatedRows[0];

  emailService.securityAlert({
    to: updated.email, name: updated.name,
    message: 'Your TennisCourt password was just changed. All other devices have been signed out.',
  }).catch(err => console.error('Security alert email failed:', err.message));

  res.json({ message: 'Password changed successfully', token: signSession(updated), user: publicUser(updated) });
};

// ── Forgot / reset password ──────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });

  // Configuration errors are handled before looking up the user so every
  // address receives the same response when reset email cannot be delivered.
  const unavailable = emailService.passwordResetUnavailableReason();
  if (unavailable) {
    console.error('Password reset email is unavailable:', unavailable);
    return res.status(503).json({ message: 'Password reset is temporarily unavailable. Please try again later.' });
  }

  const [rows] = await pool.query('SELECT id, name, email FROM users WHERE LOWER(email)=?', [email]);
  // Always return the same response whether or not the account exists, so callers
  // can't use this endpoint to enumerate registered emails.
  if (rows.length) {
    const user = rows[0];
    const { token, tokenHash } = createResetToken();
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await pool.transaction(async query => {
      // A new request invalidates earlier links for this account.
      await query('DELETE FROM password_reset_tokens WHERE user_id=?', [user.id]);
      await query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?,?,?) RETURNING id',
        [user.id, tokenHash, expires]
      );
    });

    const resetUrl = new URL('/reset-password', process.env.FRONTEND_URL);
    resetUrl.searchParams.set('token', token);
    try {
      await emailService.passwordReset({ to: user.email, name: user.name, resetUrl: resetUrl.toString() });
    } catch (err) {
      // A failed delivery must never leave a usable token in the database.
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash=?', [tokenHash]);
      console.error('Password reset email delivery failed:', { code: err.code, responseCode: err.responseCode });
      return res.status(503).json({ message: 'Password reset is temporarily unavailable. Please try again later.' });
    }
  }

  res.json({ message: 'If an account with that email exists, you will receive a password reset link shortly.' });
};

const resetPassword = async (req, res) => {
  const { token, new_password } = req.body;
  if (typeof token !== 'string' || !token || typeof new_password !== 'string' || !new_password)
    return res.status(400).json({ message: 'Missing required fields' });
  const passwordError = getPasswordError(new_password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const hash = await bcrypt.hash(new_password, 10);
  const user = await pool.transaction(async query => {
    const [tokens] = await query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash=? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [tokenHash]
    );
    if (!tokens.length) return null;

    const [users] = await query(
      `UPDATE users SET password=?, token_version=token_version+1, must_change_password=false
       WHERE id=? RETURNING id, name, email`,
      [hash, tokens[0].user_id]
    );
    if (!users.length) return null;

    await query('UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?', [tokens[0].id]);
    await query('DELETE FROM password_reset_tokens WHERE user_id=? AND id<>?', [tokens[0].user_id, tokens[0].id]);
    return users[0];
  });

  if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired' });

  emailService.passwordChanged({ to: user.email, name: user.name })
    .catch(err => console.error('Password change confirmation email failed:', { code: err.code, responseCode: err.responseCode }));

  res.json({ message: 'Your password has been reset successfully. You can now log in with your new password.' });
};

// ── TOTP 2FA setup (must be logged in) ───────────────────────────────────────
const setup2FA = async (req, res) => {
  const [rows] = await pool.query('SELECT email, totp_enabled FROM users WHERE id=?', [req.user.id]);
  if (rows[0].totp_enabled) return res.status(400).json({ message: '2FA is already enabled' });

  const secret = totp.generateSecret();
  await pool.query('UPDATE users SET totp_secret=? WHERE id=?', [secret, req.user.id]);

  const otpauthUrl = totp.otpauthURL(secret, rows[0].email);
  const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

  res.json({ secret, qrDataUrl });
};

const verifySetup2FA = async (req, res) => {
  const { code } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  const user = rows[0];
  if (!user.totp_secret) return res.status(400).json({ message: 'Start 2FA setup first' });
  if (!totp.verifyToken(user.totp_secret, code))
    return res.status(400).json({ message: 'Invalid code — check your authenticator app and try again' });

  await pool.query('UPDATE users SET totp_enabled=true WHERE id=?', [req.user.id]);
  emailService.securityAlert({
    to: user.email, name: user.name,
    message: 'Two-factor authentication was just enabled on your TennisCourt account.',
  }).catch(err => console.error('Security alert email failed:', err.message));

  res.json({ message: 'Two-factor authentication enabled' });
};

const disable2FA = async (req, res) => {
  const { password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  const user = rows[0];
  const match = await bcrypt.compare(password || '', user.password);
  if (!match) return res.status(401).json({ message: 'Password is incorrect' });

  await pool.query('UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE id=?', [req.user.id]);
  emailService.securityAlert({
    to: user.email, name: user.name,
    message: 'Two-factor authentication was just disabled on your TennisCourt account.',
  }).catch(err => console.error('Security alert email failed:', err.message));

  res.json({ message: 'Two-factor authentication disabled' });
};

module.exports = {
  register, login, verifyLogin2FA, getMe, updateProfile, changePassword,
  forgotPassword, resetPassword, setup2FA, verifySetup2FA, disable2FA,
};
