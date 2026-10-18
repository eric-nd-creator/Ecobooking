const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

process.env.FRONTEND_URL ||= 'http://localhost:5173';

const dbModule = require.resolve('../src/config/db');
const emailModule = require.resolve('../src/services/emailService');
const controllerModule = require.resolve('../src/controllers/authController');

function createHarness(t, { user = null, token = null, emailFailure = false } = {}) {
  const state = { user: user && { ...user }, token: token && { ...token }, emailSent: null, confirmationSent: false };
  const emailService = {
    passwordResetUnavailableReason: () => null,
    passwordReset: async message => {
      if (emailFailure) throw Object.assign(new Error('SMTP unavailable'), { code: 'ECONNREFUSED' });
      state.emailSent = message;
    },
    passwordChanged: async () => { state.confirmationSent = true; },
  };
  const pool = {
    query: async (sql, params) => {
      if (/SELECT id, name, email FROM users/i.test(sql)) {
        const match = state.user && state.user.email.toLowerCase() === params[0];
        return [match ? [{ id: state.user.id, name: state.user.name, email: state.user.email }] : []];
      }
      if (/DELETE FROM password_reset_tokens WHERE token_hash/i.test(sql)) {
        if (state.token?.tokenHash === params[0]) state.token = null;
        return [[]];
      }
      throw new Error(`Unexpected pool query: ${sql}`);
    },
    transaction: async callback => callback(async (sql, params) => {
      if (/SELECT id, user_id FROM password_reset_tokens/i.test(sql)) {
        const valid = state.token && state.token.tokenHash === params[0] && !state.token.usedAt && state.token.expiresAt > Date.now();
        return [valid ? [{ id: state.token.id, user_id: state.token.userId }] : []];
      }
      if (/INSERT INTO password_reset_tokens/i.test(sql)) {
        state.token = { id: 1, userId: params[0], tokenHash: params[1], expiresAt: params[2].getTime(), usedAt: null };
        return [[{ id: 1 }]];
      }
      if (/UPDATE users SET password/i.test(sql)) {
        if (!state.user || state.user.id !== params[1]) return [[]];
        state.user.password = params[0];
        state.user.token_version += 1;
        return [[{ id: state.user.id, name: state.user.name, email: state.user.email }]];
      }
      if (/UPDATE password_reset_tokens SET used_at/i.test(sql)) {
        state.token.usedAt = Date.now();
        return [[]];
      }
      if (/DELETE FROM password_reset_tokens WHERE user_id/i.test(sql)) {
        if (state.token?.userId === params[0] && state.token.id !== params[1]) state.token = null;
        return [[]];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    }),
  };

  const originals = {
    db: require.cache[dbModule],
    email: require.cache[emailModule],
    controller: require.cache[controllerModule],
  };
  delete require.cache[controllerModule];
  require.cache[dbModule] = { id: dbModule, filename: dbModule, loaded: true, exports: pool, children: [], paths: [] };
  require.cache[emailModule] = { id: emailModule, filename: emailModule, loaded: true, exports: emailService, children: [], paths: [] };
  const controller = require('../src/controllers/authController');
  t.after(() => {
    delete require.cache[controllerModule];
    if (originals.db) require.cache[dbModule] = originals.db;
    else delete require.cache[dbModule];
    if (originals.email) require.cache[emailModule] = originals.email;
    else delete require.cache[emailModule];
    if (originals.controller) require.cache[controllerModule] = originals.controller;
  });

  const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  return { state, controller, response };
}

test('registered user can request and use a single-use reset link; password and sessions are updated', async t => {
  const { state, controller, response } = createHarness(t, {
    user: { id: 4, name: 'Court Member', email: 'member@example.com', password: await bcrypt.hash('old-password1', 4), token_version: 0 },
  });
  const forgotRes = response();

  await controller.forgotPassword({ body: { email: 'MEMBER@example.com' } }, forgotRes);
  assert.equal(forgotRes.statusCode, 200);
  assert.match(forgotRes.body.message, /If an account with that email exists/);
  assert.ok(state.emailSent);

  const resetToken = new URL(state.emailSent.resetUrl).searchParams.get('token');
  const expectedHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  assert.equal(state.token.tokenHash, expectedHash);
  assert.notEqual(state.token.tokenHash, resetToken);
  assert.ok(state.token.expiresAt > Date.now());

  const resetRes = response();
  await controller.resetPassword({ body: { token: resetToken, new_password: 'new-password9' } }, resetRes);
  assert.equal(resetRes.statusCode, 200);
  assert.match(resetRes.body.message, /reset successfully/);
  assert.equal(await bcrypt.compare('old-password1', state.user.password), false);
  assert.equal(await bcrypt.compare('new-password9', state.user.password), true);
  assert.equal(state.user.token_version, 1);
  assert.equal(state.token.usedAt !== null, true);
  assert.equal(state.confirmationSent, true);

  const reuseRes = response();
  await controller.resetPassword({ body: { token: resetToken, new_password: 'another-password8' } }, reuseRes);
  assert.equal(reuseRes.statusCode, 400);
});

test('unregistered addresses receive the same generic response and do not create reset tokens', async t => {
  const { state, controller, response } = createHarness(t);
  const res = response();
  await controller.forgotPassword({ body: { email: 'nobody@example.com' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /If an account with that email exists/);
  assert.equal(state.token, null);
  assert.equal(state.emailSent, null);
});

test('invalid and expired reset tokens are rejected without changing the password', async t => {
  const originalHash = await bcrypt.hash('old-password1', 4);
  const { state, controller, response } = createHarness(t, {
    user: { id: 4, name: 'Court Member', email: 'member@example.com', password: originalHash, token_version: 0 },
    token: { id: 1, userId: 4, tokenHash: 'a'.repeat(64), expiresAt: Date.now() - 1, usedAt: null },
  });
  for (const token of ['not-the-token', 'expired-token']) {
    const res = response();
    await controller.resetPassword({ body: { token, new_password: 'new-password9' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'This reset link is invalid or has expired');
    assert.equal(state.user.password, originalHash);
  }
});

test('SMTP failure returns a safe error and removes the newly created token', async t => {
  const originalError = console.error;
  console.error = () => {};
  t.after(() => { console.error = originalError; });
  const { state, controller, response } = createHarness(t, {
    user: { id: 4, name: 'Court Member', email: 'member@example.com', password: 'hash', token_version: 0 },
    emailFailure: true,
  });
  const res = response();
  await controller.forgotPassword({ body: { email: 'member@example.com' } }, res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /temporarily unavailable/);
  assert.equal(state.token, null);
});
