const nodemailer = require('nodemailer');

let transporter = null;

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function passwordResetUnavailableReason() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return 'SMTP email settings are missing';
  if (!process.env.FRONTEND_URL) return 'FRONTEND_URL is missing';
  try {
    const url = new URL(process.env.FRONTEND_URL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return 'FRONTEND_URL must be an HTTP(S) URL without credentials';
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return 'FRONTEND_URL must use HTTPS in production';
  } catch {
    return 'FRONTEND_URL is invalid';
  }
  return null;
}

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'Email is not configured: set EMAIL_HOST, EMAIL_USER and EMAIL_PASS in backend/.env ' +
      '(e.g. smtp.gmail.com / your Gmail address / a Gmail app password).'
    );
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  return transporter;
}

async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.EMAIL_FROM || 'TennisCourt <noreply@tenniscourt.com>',
    to, subject, html,
  });
}

const wrapper = (title, titleColor, bodyHtml) => `
  <div style="font-family:sans-serif;max-width:520px;margin:auto">
    <div style="background:${titleColor};padding:28px 32px;border-radius:12px 12px 0 0">
      <h1 style="color:#fff;margin:0;font-size:22px">${title}</h1>
    </div>
    <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
      ${bodyHtml}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px">TennisCourt Management System</div>
    </div>
  </div>`;

const emailService = {
  async bookingConfirmed({ to, name, courtName, date, startTime, endTime }) {
    await sendMail({
      to,
      subject: 'Court Booking Confirmed — TennisCourt',
      html: wrapper('Booking Confirmed', '#1a5276', `
        <p style="color:#374151">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151">Your court reservation is confirmed:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;color:#6b7280;font-size:13px">Court</td><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;font-weight:600">${courtName}</td></tr>
          <tr><td style="padding:10px;background:#f9fafb;border:1px solid #e5e7eb;color:#6b7280;font-size:13px">Date</td><td style="padding:10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600">${date}</td></tr>
          <tr><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;color:#6b7280;font-size:13px">Time</td><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;font-weight:600">${startTime} – ${endTime}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px">Please arrive 5 minutes before your session. See you on the court!</p>`)
    });
  },

  async adminBookingCreated({ to, adminName, message }) {
    await sendMail({
      to,
      subject: 'New court booking — TennisCourt',
      html: wrapper('New Booking', '#1a5276', `
        <p style="color:#374151">Hi <strong>${adminName || 'Admin'}</strong>,</p>
        <p style="color:#374151">${message}</p>
        <p style="color:#6b7280;font-size:13px">Sign in to the admin dashboard to view booking details.</p>`)
    });
  },

  async bookingCancelled({ to, name, courtName, date, startTime, reason }) {
    await sendMail({
      to,
      subject: 'Booking Cancelled — TennisCourt',
      html: wrapper('Booking Cancelled', '#c0392b', `
        <p style="color:#374151">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151">Your reservation for <strong>${courtName}</strong> on <strong>${date}</strong> at <strong>${startTime}</strong> has been cancelled.</p>
        ${reason ? `<p style="color:#374151"><strong>Reason:</strong> ${reason}</p>` : ''}
        <p style="color:#6b7280;font-size:13px">You can make a new booking anytime from your dashboard.</p>`)
    });
  },

  async membershipActivated({ to, name, plan, expiresOn, amount }) {
    await sendMail({
      to,
      subject: 'Membership Activated — TennisCourt',
      html: wrapper('Membership Activated', '#1e8449', `
        <p style="color:#374151">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151">Your <strong>${plan}</strong> membership is now active!</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;color:#6b7280;font-size:13px">Plan</td><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;font-weight:600;text-transform:capitalize">${plan.replace('_',' ')}</td></tr>
          <tr><td style="padding:10px;background:#f9fafb;border:1px solid #e5e7eb;color:#6b7280;font-size:13px">Amount</td><td style="padding:10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600">${Number(amount).toLocaleString()} RWF</td></tr>
          <tr><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;color:#6b7280;font-size:13px">Expires</td><td style="padding:10px;background:#fff;border:1px solid #e5e7eb;font-weight:600">${expiresOn}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px">You can now book any of our 6 courts. Enjoy your membership!</p>`)
    });
  },

  async welcomeEmail({ to, name }) {
    await sendMail({
      to,
      subject: 'Welcome to TennisCourt!',
      html: wrapper('Welcome to TennisCourt', '#1a5276', `
        <p style="color:#374151">Hi <strong>${name}</strong>, welcome aboard!</p>
        <p style="color:#374151">Your account has been created. Subscribe to a membership plan to start booking courts.</p>`)
    });
  },

  async passwordReset({ to, name, resetUrl }) {
    const recipientName = escapeHtml(name || 'there');
    const safeResetUrl = escapeHtml(resetUrl);
    await sendMail({
      to,
      subject: 'Reset Your TennisCourt Password',
      html: wrapper('Reset Your Password', '#1a5276', `
        <p style="color:#374151">Hi <strong>${recipientName}</strong>,</p>
        <p style="color:#374151">We received a request to reset your TennisCourt password. Use the button below to choose a new password. This link expires in 30 minutes and can only be used once.</p>
        <p style="margin:24px 0"><a href="${safeResetUrl}" style="background:#1a5276;color:#fff;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Reset Password</a></p>
        <p style="color:#6b7280;font-size:13px">If the button does not work, copy this address into your browser:<br><a href="${safeResetUrl}" style="color:#1a5276;word-break:break-all">${safeResetUrl}</a></p>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email — your password won't change.</p>`)
    });
  },

  async passwordChanged({ to, name }) {
    await sendMail({
      to,
      subject: 'Your TennisCourt password was changed',
      html: wrapper('Password Changed', '#1e8449', `
        <p style="color:#374151">Hi <strong>${escapeHtml(name || 'there')}</strong>,</p>
        <p style="color:#374151">The password for your TennisCourt account was changed successfully. All existing sessions have been signed out.</p>
        <p style="color:#6b7280;font-size:13px">If you did not make this change, contact TennisCourt support immediately so we can help secure your account.</p>`)
    });
  },

  async securityAlert({ to, name, message }) {
    await sendMail({
      to,
      subject: 'Security alert — TennisCourt',
      html: wrapper('Security Alert', '#c0392b', `
        <p style="color:#374151">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151">${message}</p>
        <p style="color:#6b7280;font-size:13px">If this wasn't you, change your password immediately and contact support.</p>`)
    });
  },
};

emailService.passwordResetUnavailableReason = passwordResetUnavailableReason;

module.exports = emailService;
