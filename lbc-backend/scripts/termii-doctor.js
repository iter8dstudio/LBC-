require('dotenv').config();

const {
  getTermiiApiBase,
  fetchSenderDiagnostics,
  sendSms,
} = require('../src/lib/sms');

const apiKey = process.env.TERMII_API_KEY?.trim();

const printJson = (label, value) => {
  console.log(`\n[${label}]`);
  console.log(JSON.stringify(value, null, 2));
};

(async () => {
  if (!apiKey) {
    console.error('TERMII_API_KEY is not set');
    process.exit(1);
  }

  const apiBase = getTermiiApiBase();
  console.log(`Using Termii API base: ${apiBase}`);

  const balanceRes = await fetch(`${apiBase}/get-balance?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const balanceText = await balanceRes.text();
  let balanceData = null;
  try {
    balanceData = balanceText ? JSON.parse(balanceText) : null;
  } catch {
    balanceData = { raw: balanceText };
  }

  printJson('Balance', {
    httpStatus: balanceRes.status,
    body: balanceData,
  });

  const senderDiagnostics = await fetchSenderDiagnostics({ apiBase, apiKey });
  printJson('SenderDiagnostics', senderDiagnostics || { error: 'Could not fetch sender diagnostics' });

  const testPhone = process.env.TERMII_TEST_PHONE?.trim();
  if (!testPhone) {
    console.log('\nTERMII_TEST_PHONE is not set. Skipping live SMS test.');
    process.exit(0);
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const message = `Your LBC verification code is ${otp}. It expires in 10 minutes.`;
  const sendResult = await sendSms({ to: testPhone, message });

  printJson('SendResult', sendResult);

  if (!sendResult?.delivered) {
    process.exit(2);
  }
})();
