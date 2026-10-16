const pool = require('../config/db');
const { initiateCheckout, fetchTransactionStatus, getAccountBalance, isConfigured } = require('../services/momoPayments');
const emailService = require('../services/emailService');
const { sendSMS } = require('../services/atSMS');
const { createNotification } = require('../services/notificationService');
const { hasCourtConflict } = require('../utils/bookingConflict');
const { PRICES, DURATIONS, GUEST_BOOKING_PRICE } = require('../utils/pricing');

const CLUB_NAME = 'Kicukiro Ecology of Tennis Club';

// Matches the "YYYY-MM-DD HH:mm:ss" timestamp MTN MoMo itself uses in its SMS
// receipts, so our in-app notifications read the same way members already expect.
function momoTimestamp(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Masks all but the last 3 digits, e.g. "0788999756" -> "*******756" — matches
// how MTN MoMo itself masks the sender's number in its own "received" SMS.
function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  return '*'.repeat(digits.length - 3) + digits.slice(-3);
}

// Notifies every admin that a payment came in, in the same voice as an MTN MoMo
// "You have received ..." SMS. Used for both membership and guest-booking payments.
function notifyAdminsOfPayment({ amount, payerName, payerPhone, link }) {
  const when = momoTimestamp();
  pool.query("SELECT id FROM users WHERE role='admin'").then(([admins]) => {
    admins.forEach(admin => {
      createNotification({
        user_id: admin.id,
        type: 'momo_payment_received',
        message: `You have received ${amount.toLocaleString()} RWF from ${payerName} (${maskPhone(payerPhone)}) at ${when}.`,
        link,
      }).catch(err => console.error('Admin payment notification failed:', err.message));
    });
  }).catch(err => console.error('Admin lookup for payment notification failed:', err.message));
}

// Pending payments live in the DB (not an in-memory Map) so in-flight mobile-money
// requests survive a server restart and don't leak memory for abandoned payments.
async function savePending(transactionId, kind, payload) {
  await pool.query(
    'INSERT INTO pending_payments (transaction_id, kind, payload) VALUES (?,?,?)',
    [transactionId, kind, JSON.stringify(payload)]
  );
}
async function takePending(transactionId, kind) {
  const [rows] = await pool.query(
    'SELECT payload FROM pending_payments WHERE transaction_id=? AND kind=?',
    [transactionId, kind]
  );
  if (!rows.length) return null;
  await pool.query('DELETE FROM pending_payments WHERE transaction_id=?', [transactionId]);
  return rows[0].payload;
}
async function peekPending(transactionId, kind) {
  const [rows] = await pool.query(
    'SELECT payload FROM pending_payments WHERE transaction_id=? AND kind=?',
    [transactionId, kind]
  );
  return rows.length ? rows[0].payload : null;
}

// ── POST /api/payments/initiate ──────────────────────────────────────────────
const initiatePayment = async (req, res) => {
  const { type, phoneNumber } = req.body;
  const userId = req.user.id;

  if (!PRICES[type])    return res.status(400).json({ message: 'Invalid membership type' });
  if (!phoneNumber?.trim()) return res.status(400).json({ message: 'Phone number is required' });

  try {
    const result = await initiateCheckout({
      phoneNumber: phoneNumber.trim(),
      amount:   PRICES[type],
      metadata: { userId: String(userId), membershipType: type },
    });

    // ── Demo mode: MoMo not configured → activate immediately ────────────────
    if (result.status === 'demo') {
      await activateMembership(userId, type, result.transactionId, true, phoneNumber.trim());
      const [rows] = await pool.query(
        'SELECT * FROM memberships WHERE user_id=? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      return res.json({
        status: 'success',
        transactionId: result.transactionId,
        membership: rows[0],
        message: 'Membership activated (demo mode — no real payment was processed)',
      });
    }

    // ── Real MoMo: PendingConfirmation → poll status / wait for webhook ──────
    if (result.status === 'PendingConfirmation') {
      await savePending(result.transactionId, 'membership', { userId, membershipType: type, phoneNumber: phoneNumber.trim() });
      return res.json({
        status:        'pending',
        transactionId: result.transactionId,
        message:       'Payment request sent to your phone',
      });
    }

    return res.status(400).json({ message: result.description || 'Payment initiation failed' });
  } catch (err) {
    console.error('Payment error:', err.response?.data || err.message);
    return res.status(500).json({ message: 'Payment service error, please try again' });
  }
};

// ── POST /api/payments/callback  (MTN MoMo webhook, no JWT) ──────────────────
// Defense-in-depth: the callback URL registered as the sandbox API user's
// providerCallbackHost includes a shared secret in the query string (?token=...).
// A request missing/mismatching it isn't a genuine callback. We also never trust
// client-supplied metadata for *which account gets credited* unless we ourselves
// stored that transactionId as pending — otherwise anyone could POST an arbitrary
// userId/membershipType and get a free membership.
// Note: MoMo sandbox callbacks require a public HTTPS host, which local dev
// usually doesn't have — checkStatus/guestBookingStatus below actively poll MoMo
// as the primary confirmation path, and this webhook is best-effort on top.
const paymentCallback = async (req, res) => {
  try {
    if (process.env.PAYMENT_WEBHOOK_SECRET &&
        req.query.token !== process.env.PAYMENT_WEBHOOK_SECRET) {
      console.warn('MoMo callback rejected: bad/missing webhook token');
      return res.sendStatus(403);
    }

    const { externalId: transactionId, status } = req.body;
    console.log('MoMo callback received:', JSON.stringify(req.body));

    if (status !== 'SUCCESSFUL') return res.sendStatus(200);

    const guestPayload = await takePending(transactionId, 'guest_booking');
    if (guestPayload) {
      await confirmGuestBooking(guestPayload, transactionId, false);
      console.log(`Guest booking confirmed via MoMo: txn=${transactionId}`);
      return res.sendStatus(200);
    }

    const membershipPayload = await takePending(transactionId, 'membership');
    if (!membershipPayload) {
      console.warn('MoMo callback: unrecognized transactionId, ignoring', transactionId);
      return res.sendStatus(200);
    }

    const { userId, membershipType, phoneNumber } = membershipPayload;
    if (!userId || !PRICES[membershipType]) {
      console.error('MoMo callback: malformed pending payload', membershipPayload);
      return res.sendStatus(200);
    }

    await activateMembership(userId, membershipType, transactionId, false, phoneNumber);
    console.log(`Membership activated via MoMo: user=${userId} type=${membershipType}`);
  } catch (err) {
    console.error('MoMo callback error:', err.message);
  }
  res.sendStatus(200);
};

// ── GET /api/payments/status/:transactionId  (frontend polls this) ───────────
const checkStatus = async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user.id;

  const [rows] = await pool.query(
    'SELECT status, type, end_date FROM memberships WHERE user_id=? AND payment_reference=? LIMIT 1',
    [userId, transactionId]
  );

  if (rows.length && rows[0].status === 'active')
    return res.json({ status: 'success', membership: rows[0] });

  const pending = await peekPending(transactionId, 'membership');
  if (!pending) return res.json({ status: 'unknown' });

  // Actively ask MoMo rather than waiting on the callback webhook, which needs a
  // public HTTPS host that local/sandbox setups usually don't have.
  if (isConfigured()) {
    try {
      const momoStatus = await fetchTransactionStatus(transactionId);
      if (momoStatus.status === 'SUCCESSFUL') {
        await takePending(transactionId, 'membership');
        await activateMembership(pending.userId, pending.membershipType, transactionId, false, pending.phoneNumber);
        const [updated] = await pool.query(
          'SELECT status, type, end_date FROM memberships WHERE user_id=? AND payment_reference=? LIMIT 1',
          [userId, transactionId]
        );
        return res.json({ status: 'success', membership: updated[0] });
      }
      if (momoStatus.status === 'FAILED') {
        await takePending(transactionId, 'membership');
        return res.json({ status: 'failed', message: momoStatus.reason });
      }
    } catch (err) {
      console.error('MoMo status check failed:', err.response?.data || err.message);
    }
  }

  return res.json({ status: 'pending' });
};

// ── POST /api/payments/guest-initiate  (no auth — guest checkout) ────────────
const initiateGuestBooking = async (req, res) => {
  const { court_id, date, start_time, guest_name, guest_phone } = req.body;

  if (!court_id || !date || !start_time)
    return res.status(400).json({ message: 'Court, date and start time are required' });
  if (!guest_name?.trim() || !guest_phone?.trim())
    return res.status(400).json({ message: 'Name and phone number are required' });

  const slotTime = new Date(`${date}T${start_time}`);
  if (slotTime <= new Date())
    return res.status(400).json({ message: 'Cannot book a time slot that has already passed' });

  const startH = parseInt(start_time.split(':')[0]);
  const end_time = `${(startH + 1).toString().padStart(2, '0')}:00`;

  if (await hasCourtConflict(pool.query, { court_id, date, start_time, end_time }))
    return res.status(409).json({ message: 'Court already booked for this time slot' });

  const details = { court_id, date, start_time, end_time, guest_name: guest_name.trim(), guest_phone: guest_phone.trim() };

  try {
    const result = await initiateCheckout({
      phoneNumber: details.guest_phone,
      amount:   GUEST_BOOKING_PRICE,
      metadata: { kind: 'guest_booking' },
    });

    if (result.status === 'demo') {
      const booking = await confirmGuestBooking(details, result.transactionId, true);
      return res.json({ status: 'success', transactionId: result.transactionId, booking, message: 'Booking confirmed (demo mode — no real payment was processed)' });
    }

    if (result.status === 'PendingConfirmation') {
      await savePending(result.transactionId, 'guest_booking', details);
      return res.json({ status: 'pending', transactionId: result.transactionId, message: 'Payment request sent to your phone' });
    }

    return res.status(400).json({ message: result.description || 'Payment initiation failed' });
  } catch (err) {
    console.error('Guest payment error:', err.response?.data || err.message);
    return res.status(500).json({ message: 'Payment service error, please try again' });
  }
};

// ── GET /api/payments/guest-status/:transactionId  (no auth) ─────────────────
const guestBookingStatus = async (req, res) => {
  const { transactionId } = req.params;

  const [rows] = await pool.query(
    `SELECT b.*, c.name AS court_name FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     JOIN courts c ON c.id = b.court_id
     WHERE p.reference = ? LIMIT 1`,
    [transactionId]
  );
  if (rows.length) return res.json({ status: 'success', booking: rows[0] });

  const pending = await peekPending(transactionId, 'guest_booking');
  if (!pending) return res.json({ status: 'unknown' });

  // Actively ask MoMo rather than waiting on the callback webhook, which needs a
  // public HTTPS host that local/sandbox setups usually don't have.
  if (isConfigured()) {
    try {
      const momoStatus = await fetchTransactionStatus(transactionId);
      if (momoStatus.status === 'SUCCESSFUL') {
        await takePending(transactionId, 'guest_booking');
        const booking = await confirmGuestBooking(pending, transactionId, false);
        return res.json({ status: 'success', booking });
      }
      if (momoStatus.status === 'FAILED') {
        await takePending(transactionId, 'guest_booking');
        return res.json({ status: 'failed', message: momoStatus.reason });
      }
    } catch (err) {
      console.error('MoMo status check failed:', err.response?.data || err.message);
    }
  }

  return res.json({ status: 'pending' });
};

// ── Shared helper ────────────────────────────────────────────────────────────
// payerPhone is the Mobile Money number the payment was actually made with —
// it may differ from the member's profile phone (or the profile may have none),
// so it's threaded through from the payment form rather than re-derived here.
async function activateMembership(userId, type, reference, isDemo, payerPhone) {
  const amount = PRICES[type];
  const days   = DURATIONS[type];

  await pool.transaction(async (query) => {
    // Carry over any remaining days from the current active membership
    const [existing] = await query(
      "SELECT end_date FROM memberships WHERE user_id=? AND status='active' AND end_date >= CURRENT_DATE ORDER BY end_date DESC LIMIT 1",
      [userId]
    );

    const base = existing.length > 0 ? new Date(existing[0].end_date) : new Date();
    const startDate = new Date();
    const endDate   = new Date(base);
    endDate.setDate(endDate.getDate() + days);

    await query("UPDATE memberships SET status='expired' WHERE user_id=? AND status='active'", [userId]);

    const [result] = await query(
      `INSERT INTO memberships (user_id, type, amount, start_date, end_date, status, payment_reference)
       VALUES (?,?,?,?,?,?,?) RETURNING id`,
      [userId, type, amount,
       startDate.toISOString().split('T')[0],
       endDate.toISOString().split('T')[0],
       'active', reference]
    );

    await query(
      'INSERT INTO payments (user_id, membership_id, amount, reference, status, is_demo) VALUES (?,?,?,?,?,?)',
      [userId, result.insertId, amount, reference, 'successful', isDemo]
    );

    return endDate;
  }).then(async (endDate) => {
    const [userRows] = await pool.query('SELECT name, email, phone FROM users WHERE id=?', [userId]);
    const user = userRows[0];

    if (user?.email) {
      emailService.membershipActivated({
        to: user.email, name: user.name, plan: type,
        expiresOn: endDate.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }),
        amount,
      }).catch(err => console.error('Membership email failed:', err.message));
    }

    if (user?.phone) {
      const planLabel = { monthly: 'Monthly', half_yearly: 'Half-Yearly', yearly: 'Yearly' }[type] || type;
      const expiresOn = endDate.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
      sendSMS(
        user.phone,
        `Hello ${user.name}, your TennisCourt ${planLabel} membership is now ACTIVE until ${expiresOn}. Amount paid: RWF ${amount.toLocaleString()}. Thank you!`
      ).catch(err => console.error('Membership SMS failed:', err.message));
    }

    // In-app receipt for the payer, plus a heads-up for every admin (with a
    // deep link into that member's account so the admin can see the MoMo status).
    createNotification({
      user_id: userId,
      type: 'payment_confirmed',
      message: `Your payment of ${amount.toLocaleString()} RWF to ${CLUB_NAME} was completed at ${momoTimestamp()}.`,
    }).catch(err => console.error('Member payment notification failed:', err.message));

    notifyAdminsOfPayment({
      amount,
      payerName: user?.name || 'a member',
      payerPhone: payerPhone || user?.phone || 'N/A',
      link: `/admin/members?view=${userId}`,
    });
  });
}

// ── Guest booking helper ─────────────────────────────────────────────────────
async function confirmGuestBooking(details, reference, isDemo) {
  const { court_id, date, start_time, end_time, guest_name, guest_phone } = details;

  const booking = await pool.transaction(async (query) => {
    await query('SELECT pg_advisory_xact_lock(?)', [Number(court_id)]);

    if (await hasCourtConflict(query, { court_id, date, start_time, end_time }))
      throw new Error('Court already booked for this time slot');

    const [result] = await query(
      `INSERT INTO bookings (court_id, user_id, coach_id, date, start_time, end_time, booked_by, guest_name, guest_phone)
       VALUES (?,NULL,NULL,?,?,?,'guest',?,?) RETURNING id`,
      [court_id, date, start_time, end_time, guest_name, guest_phone]
    );

    await query(
      'INSERT INTO payments (user_id, membership_id, booking_id, amount, reference, status, is_demo) VALUES (NULL,NULL,?,?,?,?,?)',
      [result.insertId, GUEST_BOOKING_PRICE, reference, 'successful', isDemo]
    );

    const [rows] = await query(
      'SELECT b.*, c.name AS court_name FROM bookings b JOIN courts c ON c.id=b.court_id WHERE b.id=?',
      [result.insertId]
    );
    return rows[0];
  });

  sendSMS(
    guest_phone,
    `Hello ${guest_name}, your TennisCourt booking for ${booking.court_name} on ${date} at ${start_time.slice(0, 5)}-${end_time.slice(0, 5)} is CONFIRMED. Amount paid: RWF ${GUEST_BOOKING_PRICE.toLocaleString()}. Thank you!`
  ).catch(err => console.error('Guest booking SMS failed:', err.message));

  // Guests have no account/in-app inbox — the SMS above is their receipt.
  // Admins still get the same "payment received" notification as for members.
  notifyAdminsOfPayment({
    amount: GUEST_BOOKING_PRICE,
    payerName: guest_name,
    payerPhone: guest_phone,
    link: '/admin/bookings',
  });

  return booking;
}

// ── GET /api/payments/balance  (admin only) ───────────────────────────────────
const getBalance = async (req, res) => {
  if (!isConfigured())
    return res.status(400).json({ message: 'MTN MoMo is not configured (demo mode)' });

  try {
    const balance = await getAccountBalance();
    res.json(balance);
  } catch (err) {
    console.error('MoMo balance check failed:', err.response?.data || err.message);
    res.status(500).json({ message: 'Could not retrieve MoMo account balance' });
  }
};

module.exports = { initiatePayment, paymentCallback, checkStatus, initiateGuestBooking, guestBookingStatus, getBalance };
