const isProduction = process.env.NODE_ENV === 'production';

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
};

const getTermiiApiBase = () => {
  const rawBase = process.env.TERMII_BASE_URL?.trim() || 'https://v3.api.termii.com';
  const withoutTrailingSlash = rawBase.replace(/\/+$/, '');

  if (withoutTrailingSlash.endsWith('/api')) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api`;
};

const normalizeTermiiMessage = (message) => {
  if (!message) return '';

  if (Array.isArray(message)) {
    return message
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const field = item.field ? `${item.field}: ` : '';
          return `${field}${item.issue || item.message || JSON.stringify(item)}`;
        }
        return String(item);
      })
      .filter(Boolean)
      .join('; ');
  }

  if (typeof message === 'object') {
    return message.message || message.error || JSON.stringify(message);
  }

  return String(message);
};

const buildTermiiError = ({ response, data, rawText }) => {
  const code = data?.code != null ? String(data.code) : '';
  const status = data?.status ? String(data.status).trim() : '';
  const detail = normalizeTermiiMessage(data?.message) || data?.error;
  const fallbackDetail = code
    ? `Termii rejected SMS (code ${code}) with no diagnostic message`
    : normalizeTermiiMessage(rawText) || `SMS request failed (${response.status})`;

  return {
    message: detail || fallbackDetail,
    code,
    status,
    link: data?.link || null,
    httpStatus: response.status,
    requestId: response.headers.get('x-request-id') || response.headers.get('request-id') || null,
  };
};

const fetchSenderDiagnostics = async ({ apiBase, apiKey }) => {
  try {
    const senderRes = await fetch(`${apiBase}/sender-id?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const senderRaw = await senderRes.text();
    const senderData = (() => {
      try {
        return senderRaw ? JSON.parse(senderRaw) : null;
      } catch {
        return null;
      }
    })();

    const senderItems = Array.isArray(senderData?.content) ? senderData.content : [];
    const senderStates = senderItems
      .map((item) => ({
        sender_id: item?.sender_id,
        status: item?.status,
        usecase: item?.usecase,
      }))
      .filter((item) => item.sender_id);

    return {
      senderStatusHttp: senderRes.status,
      senderStates,
    };
  } catch {
    return null;
  }
};

const sendViaTermii = async ({ to, message }) => {
  const apiKey = process.env.TERMII_API_KEY?.trim();
  const senderId = process.env.TERMII_SENDER_ID?.trim() || 'N-Alert';
  const preferredChannel = process.env.TERMII_CHANNEL?.trim() || 'dnd';
  const apiBase = getTermiiApiBase();
  const channelCandidates = [preferredChannel, 'generic', 'dnd']
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  if (!apiKey) {
    return { delivered: false, error: 'TERMII_API_KEY is not configured' };
  }

  let lastFailure = null;

  for (const channel of channelCandidates) {
    const response = await fetch(`${apiBase}/sms/send`, {
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

    const rawText = await response.text();
    const data = (() => {
      try {
        return rawText ? JSON.parse(rawText) : {};
      } catch {
        return {};
      }
    })();

    const responseCode = String(data?.code || '').trim();
    const responseStatus = String(data?.status || '').toLowerCase().trim();
    const isErrorCode = responseCode.startsWith('4') || responseCode.startsWith('5');
    const isExplicitFailure = ['failed', 'error'].includes(responseStatus);
    const success = response.ok && !isErrorCode && !isExplicitFailure;

    if (success) {
      return {
        delivered: true,
        data,
        provider: 'termii',
        channel,
      };
    }

    const termiiError = buildTermiiError({ response, data, rawText });
    const shouldAttachSenderDiagnostics = termiiError.code === '400' && !normalizeTermiiMessage(data?.message);
    const senderDiagnostics = shouldAttachSenderDiagnostics
      ? await fetchSenderDiagnostics({ apiBase, apiKey })
      : null;

    const senderHint = senderDiagnostics?.senderStates?.length
      ? ` Sender states: ${senderDiagnostics.senderStates
          .map((item) => `${item.sender_id}:${item.status}:${item.usecase}`)
          .join(' | ')}`
      : '';

    lastFailure = {
      delivered: false,
      data,
      error: `${termiiError.message}${senderHint}`.trim(),
      provider: 'termii',
      channel,
      details: termiiError,
      senderDiagnostics,
    };

    console.error('[TERMII_SEND_FAILED]', {
      apiBase,
      senderId,
      to,
      channel,
      httpStatus: termiiError.httpStatus,
      code: termiiError.code,
      status: termiiError.status,
      message: termiiError.message,
      link: termiiError.link,
      requestId: termiiError.requestId,
      senderDiagnostics,
    });
  }

  return lastFailure || { delivered: false, error: 'SMS request failed' };
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