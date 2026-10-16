const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';

const isConfigured = () =>
  !!(process.env.MOMO_SUBSCRIPTION_KEY && process.env.MOMO_API_USER && process.env.MOMO_API_KEY);

// Access tokens are valid ~1hr; cache in memory so we don't fetch one per request.
let cachedToken = null; // { value, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const auth = Buffer.from(`${process.env.MOMO_API_USER}:${process.env.MOMO_API_KEY}`).toString('base64');
  const { data } = await axios.post(`${BASE_URL}/collection/token/`, null, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
    },
  });

  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Target-Environment': process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox',
    'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
  };
}

// Starts a Collection payment. Returns the X-Reference-Id we generated as
// transactionId — that's what MoMo uses to look the transaction up later, and
// what the rest of the app treats as its payment reference.
const initiateCheckout = async ({ phoneNumber, amount, metadata = {} }) => {
  if (!isConfigured()) {
    // Demo mode — no real MoMo credentials, simulate immediately
    return { status: 'demo', transactionId: `DEMO-${Date.now()}` };
  }

  const referenceId = crypto.randomUUID();
  const token = await getAccessToken();

  await axios.post(
    `${BASE_URL}/collection/v2_0/payment`,
    {
      amount: String(amount),
      // Sandbox only accepts EUR test money, regardless of the real product currency.
      currency: process.env.MOMO_CURRENCY || 'EUR',
      externalId: referenceId,
      payer: { partyIdType: 'MSISDN', partyId: phoneNumber.replace(/\D/g, '') },
      payerMessage: 'TennisCourt payment',
      payeeNote: JSON.stringify(metadata).slice(0, 160),
    },
    {
      headers: {
        ...authHeaders(token),
        'X-Reference-Id': referenceId,
        'Content-Type': 'application/json',
      },
    }
  );

  return { status: 'PendingConfirmation', transactionId: referenceId };
};

// Polls MoMo for the current status of a payment (PENDING | SUCCESSFUL | FAILED).
// Sandbox callbacks need a public HTTPS host, which local dev usually doesn't have,
// so the frontend's status-polling endpoints call this directly instead of relying
// solely on the /callback webhook.
const fetchTransactionStatus = async (referenceId) => {
  const token = await getAccessToken();
  const { data } = await axios.get(
    `${BASE_URL}/collection/v2_0/payment/${referenceId}`,
    { headers: authHeaders(token) }
  );
  return data;
};

// GET /collection/v1_0/account/balance — current MoMo Collections account balance.
const getAccountBalance = async () => {
  const token = await getAccessToken();
  const { data } = await axios.get(
    `${BASE_URL}/collection/v1_0/account/balance`,
    { headers: authHeaders(token) }
  );
  return data; // { availableBalance, currency }
};

module.exports = { initiateCheckout, fetchTransactionStatus, getAccountBalance, isConfigured };
