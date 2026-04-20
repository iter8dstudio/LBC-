const isProduction = process.env.NODE_ENV === 'production';

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
};

const sendViaTermii = async ({ to, message }) => {
  const apiKey = process.env.TERMII_API_KEY?.trim();
  const senderId = process.env.TERMII_SENDER_ID?.trim() || 'N-Alert';
  const channel = process.env.TERMII_CHANNEL?.trim() || 'dnd';
  const baseUrl = process.env.TERMII_BASE_URL?.trim() || 'https://api.ng.termii.com/api';

  if (!apiKey) {
    return { delivered: false, error: 'TERMII_API_KEY is not configured' };
  }

  const response = await fetch(`${baseUrl}/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: senderId,
      sms: message,
      type: 'plain',
      channel,
    }),
  });

  const data = await response.json().catch(() => ({}));
  const responseCode = String(data?.code || '').trim();
  const responseStatus = String(data?.status || '').toLowerCase().trim();
  const isErrorCode = responseCode.startsWith('4') || responseCode.startsWith('5');
  const isExplicitFailure = ['failed', 'error'].includes(responseStatus);
  const success = response.ok && !isErrorCode && !isExplicitFailure;

  return {
    delivered: success,
    data,
    error: success ? null : data?.message || data?.error || `SMS request failed (${response.status})`,
  };
};

const sendSms = async ({ to, message }) => {
  const normalizedPhone = normalizePhone(to);

  if (!normalizedPhone) {
    return { delivered: false, error: 'A valid phone number is required' };
  }

  if (process.env.TERMII_API_KEY) {
    return sendViaTermii({ to: normalizedPhone, message });
  }

  if (isProduction) {
    return { delivered: false, error: 'SMS provider is not configured. Set TERMII_API_KEY, TERMII_SENDER_ID, and TERMII_CHANNEL.' };
  }

  console.log(`[DEV SMS] to=${normalizedPhone} message=${message}`);
  return { delivered: true, provider: 'dev-log' };
};

module.exports = {
  normalizePhone,
  sendSms,
};