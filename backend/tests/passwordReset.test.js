const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  PASSWORD_MIN_LENGTH,
  createResetToken,
  getPasswordError,
  isValidEmail,
} = require('../src/utils/passwordReset');

test('reset tokens are random 256-bit values and only their SHA-256 digest is stored', () => {
  const first = createResetToken();
  const second = createResetToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(first.tokenHash, crypto.createHash('sha256').update(first.token).digest('hex'));
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.tokenHash, second.tokenHash);
});

test('email input is checked before account lookup', () => {
  assert.equal(isValidEmail('member@example.com'), true);
  assert.equal(isValidEmail('member@localhost'), false);
  assert.equal(isValidEmail('bad address@example.com'), false);
  assert.equal(isValidEmail(''), false);
});

test('reset passwords require at least 10 characters, a letter, and a number', () => {
  assert.equal(PASSWORD_MIN_LENGTH, 10);
  assert.match(getPasswordError('Short1'), /at least 10/);
  assert.match(getPasswordError('longpassword'), /letter and one number/);
  assert.match(getPasswordError('1234567890'), /letter and one number/);
  assert.equal(getPasswordError('tennisCourt9'), null);
});
