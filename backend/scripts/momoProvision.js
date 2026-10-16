// One-time setup: creates a sandbox API user + API key against the MTN MoMo
// Developer sandbox from your Collections Primary/Subscription Key, and prints
// the values to paste into .env as MOMO_API_USER / MOMO_API_KEY.
//
// Usage:
//   1. Get a Collections product Primary Key from https://momodeveloper.mtn.com
//   2. Put it in .env as MOMO_SUBSCRIPTION_KEY
//   3. node scripts/momoProvision.js
require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';

async function main() {
  const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
  if (!subscriptionKey) {
    console.error('Set MOMO_SUBSCRIPTION_KEY in .env first (Collections product Primary Key from momodeveloper.mtn.com).');
    process.exit(1);
  }

  const referenceId = crypto.randomUUID();
  const callbackHost = process.env.MOMO_CALLBACK_HOST || 'example.com';

  await axios.post(
    `${BASE_URL}/v1_0/apiuser`,
    { providerCallbackHost: callbackHost },
    {
      headers: {
        'X-Reference-Id': referenceId,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('Created sandbox API user:', referenceId);

  const { data } = await axios.post(
    `${BASE_URL}/v1_0/apiuser/${referenceId}/apikey`,
    null,
    { headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey } }
  );

  console.log('\nAdd these to your .env:\n');
  console.log(`MOMO_API_USER=${referenceId}`);
  console.log(`MOMO_API_KEY=${data.apiKey}`);
}

main().catch(err => {
  console.error('Provisioning failed:', err.response?.data || err.message);
  process.exit(1);
});
