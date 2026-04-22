require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  getTermiiApiBase,
  fetchSenderDiagnostics,
  sendSms,
} = require('../src/lib/sms');

const apiKey = process.env.TERMII_API_KEY?.trim();
const desiredSenderId = process.env.TERMII_SENDER_ID?.trim() || 'N-Alert';
const senderCompany = process.env.TERMII_COMPANY_NAME?.trim() || 'Iter8d Studio';
const senderUseCase = process.env.TERMII_OTP_USE_CASE?.trim() || 'OTP';
const testPhone = process.env.TERMII_TEST_PHONE?.trim() || '';
const applicationId = process.env.TERMII_APPLICATION_ID?.trim() || '62685';

const nowIso = () => new Date().toISOString();

const toStatus = (value) => String(value || '').trim().toLowerCase();
const toUsecase = (value) => String(value || '').trim().toLowerCase();

const printJson = (label, value) => {
  console.log(`\n[${label}]`);
  console.log(JSON.stringify(value, null, 2));
};

const hasActiveOtpSender = (senderStates = []) =>
  senderStates.some((item) => toStatus(item.status) === 'active' && /otp/.test(toUsecase(item.usecase)));

const requestOtpSenderApproval = async ({ apiBase }) => {
  try {
    const response = await fetch(`${apiBase}/sender-id/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        sender_id: desiredSenderId,
        use_case: senderUseCase,
        company: senderCompany,
      }),
    });

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { raw };
    }

    return {
      attempted: true,
      httpStatus: response.status,
      body: data,
    };
  } catch (error) {
    return {
      attempted: true,
      httpStatus: null,
      body: { error: String(error?.message || error) },
    };
  }
};

const buildSupportTicket = ({ apiBase, senderBefore, senderAfter, approvalAttempt, sendResult }) => {
  const senderStateLines = (senderAfter?.senderStates || senderBefore?.senderStates || [])
    .map((item) => `${item.sender_id}:${item.status}:${item.usecase}`)
    .join(' | ');

  return {
    subject: 'Enable OTP send for applicationId 62685',
    message: [
      `ApplicationId: ${applicationId}`,
      `API base: ${apiBase}`,
      `Desired sender: ${desiredSenderId}`,
      `Sender states: ${senderStateLines || 'none returned'}`,
      `Sender request attempt: ${JSON.stringify(approvalAttempt)}`,
      `Send test result: ${JSON.stringify(sendResult)}`,
      'Issue: /api/sms/send still returns 400 with empty message for this application key.',
      'Please enable OTP-capable sending for this sender/application and confirm allowed route/channel.',
    ].join('\n'),
  };
};

(async () => {
  if (!apiKey) {
    console.error('TERMII_API_KEY is not set');
    process.exit(1);
  }

  const apiBase = getTermiiApiBase();
  console.log(`Using Termii API base: ${apiBase}`);

  const senderBefore = await fetchSenderDiagnostics({ apiBase, apiKey });
  printJson('SenderDiagnosticsBefore', senderBefore || { error: 'Could not fetch sender diagnostics' });

  const otpActiveBefore = hasActiveOtpSender(senderBefore?.senderStates || []);
  let approvalAttempt = { attempted: false };

  if (!otpActiveBefore) {
    approvalAttempt = await requestOtpSenderApproval({ apiBase });
    printJson('SenderApprovalAttempt', approvalAttempt);
  } else {
    console.log('\nAn active OTP sender already exists. Skipping approval request.');
  }

  const senderAfter = await fetchSenderDiagnostics({ apiBase, apiKey });
  printJson('SenderDiagnosticsAfter', senderAfter || { error: 'Could not fetch sender diagnostics' });

  const otpActiveAfter = hasActiveOtpSender(senderAfter?.senderStates || []);

  let sendResult = { skipped: true, reason: 'TERMII_TEST_PHONE is not set' };
  if (testPhone) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const message = `Your LBC verification code is ${otp}. It expires in 10 minutes.`;
    sendResult = await sendSms({ to: testPhone, message });
    printJson('SendResult', sendResult);
  } else {
    console.log('\nTERMII_TEST_PHONE is not set. Skipping live send test.');
  }

  const supportTicket = buildSupportTicket({
    apiBase,
    senderBefore,
    senderAfter,
    approvalAttempt,
    sendResult,
  });

  const report = {
    timestamp: nowIso(),
    applicationId,
    apiBase,
    desiredSenderId,
    otpActiveBefore,
    otpActiveAfter,
    approvalAttempt,
    senderBefore,
    senderAfter,
    sendResult,
    supportTicket,
  };

  const reportPath = path.join(process.cwd(), 'termii-autofix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  printJson('AutofixReportPath', { reportPath });

  if (sendResult?.delivered) {
    console.log('\nTermii OTP send is working.');
    process.exit(0);
  }

  console.log('\nTermii OTP send is still blocked by provider-side enablement.');
  printJson('SupportTicketTemplate', supportTicket);
  process.exit(2);
})();
