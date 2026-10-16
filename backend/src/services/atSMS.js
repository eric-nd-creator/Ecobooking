const axios = require('axios');

const SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';
const PROD_URL    = 'https://api.africastalking.com/version1/messaging';

const isConfigured = () =>
  process.env.AT_API_KEY && process.env.AT_API_KEY !== 'atsk_your_api_key_here';

const sendSMS = async (to, message) => {
  if (!isConfigured()) {
    console.log(`[SMS demo] To: ${to} | Message: ${message}`);
    return { status: 'demo' };
  }

  const isSandbox = (process.env.AT_USERNAME || 'sandbox') === 'sandbox';
  const url = isSandbox ? SANDBOX_URL : PROD_URL;

  const payload = new URLSearchParams({
    username: process.env.AT_USERNAME || 'sandbox',
    to,
    message,
  });

  const { data } = await axios.post(url, payload.toString(), {
    headers: {
      ApiKey:         process.env.AT_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept:         'application/json',
    },
  });

  return data;
};

module.exports = { sendSMS };
