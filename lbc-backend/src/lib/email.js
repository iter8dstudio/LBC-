// src/lib/email.js
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const { getFrontendBaseUrl } = require('./frontend');

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resendFrom = (process.env.RESEND_FROM_EMAIL || '').trim();
const resendReplyTo = (process.env.RESEND_REPLY_TO || process.env.EMAIL_FROM || '').trim();

const mailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
const mailPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
const mailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const rawMailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
const mailFrom = process.env.EMAIL_FROM || mailUser;
const mailReplyTo = (process.env.EMAIL_REPLY_TO || resendReplyTo || '').trim();

const parseBooleanEnv = (value) => {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const smtpSecureOverride = parseBooleanEnv(process.env.SMTP_SECURE || process.env.EMAIL_SECURE);
const smtpPriority = (process.env.EMAIL_PROVIDER_PRIORITY || '').trim().toLowerCase();
const looksLikeGmailConfig = /gmail\.com$/i.test(mailHost || '') || /@gmail\.com$/i.test(mailUser || '');
const mailPass = looksLikeGmailConfig ? rawMailPass.replace(/\s+/g, '') : rawMailPass;

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const defaultResendFrom = 'onboarding@resend.dev';
const hasResendConfig = Boolean(resend && resendFrom);
const hasMailConfig = Boolean(mailHost && mailPort && mailUser && mailPass && mailFrom);

if (!hasResendConfig && !hasMailConfig) {
  console.warn('[EMAIL CONFIG WARNING] Email is not fully configured. Set RESEND_API_KEY + RESEND_FROM_EMAIL, or SMTP_* / EMAIL_* values.');
}

const buildSmtpTransportConfigs = () => {
  if (!hasMailConfig) return [];

  const auth = {
    user: mailUser,
    pass: mailPass,
  };

  const baseConfig = {
    host: mailHost,
    port: mailPort,
    secure: smtpSecureOverride ?? mailPort === 465,
    requireTLS: (smtpSecureOverride ?? mailPort === 465) === false,
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth,
  };

  const configs = [baseConfig];

  if (looksLikeGmailConfig) {
    configs.push(
      {
        service: 'gmail',
        auth,
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
      },
      {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        auth,
      },
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        auth,
      }
    );
  }

  const seen = new Set();
  return configs.filter((config) => {
    const key = `${config.service || config.host}:${config.port || 'default'}:${config.secure === true ? 'secure' : 'plain'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const smtpTransportConfigs = buildSmtpTransportConfigs();
const smtpTransports = smtpTransportConfigs.map((config) => nodemailer.createTransport(config));

if (smtpTransports.length > 0 && process.env.NODE_ENV !== 'production') {
  smtpTransports[0].verify((err, success) => {
    if (err) {
      console.error('[EMAIL SMTP ERROR] Connection failed:', err.message);
    } else if (success) {
      console.log('[EMAIL SMTP OK] Ready for messages');
    }
  });
}

const sendViaResend = async ({ to, subject, html }) => {
  if (!resend) {
    return { delivered: false, error: 'Resend is not configured.' };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const senderCandidates = Array.from(new Set([
    resendFrom,
    defaultResendFrom,
  ].filter(Boolean)));

  const errors = [];

  for (const fromAddress of senderCandidates) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: recipients,
        subject,
        html,
        ...(resendReplyTo ? { replyTo: resendReplyTo } : {}),
      });

      if (error) {
        errors.push(`${fromAddress} (${error.message || JSON.stringify(error)})`);
        continue;
      }

      return { delivered: true, messageId: data?.id, provider: `resend:${fromAddress}` };
    } catch (err) {
      errors.push(`${fromAddress} (${err.message})`);
    }
  }

  return { delivered: false, error: errors.join(' | ') || 'Resend delivery failed.' };
};

const sendViaSmtp = async ({ to, subject, html }) => {
  if (smtpTransports.length === 0) {
    return { delivered: false, error: 'SMTP is not configured.' };
  }

  const attempts = [];

  for (let index = 0; index < smtpTransports.length; index += 1) {
    const transport = smtpTransports[index];
    const label = smtpTransportConfigs[index]?.service || `${smtpTransportConfigs[index]?.host}:${smtpTransportConfigs[index]?.port}`;

    try {
      const info = await transport.sendMail({
        from: mailFrom,
        to,
        subject,
        html,
        ...(mailReplyTo ? { replyTo: mailReplyTo } : {}),
      });

      return { delivered: true, messageId: info.messageId, provider: `smtp:${label}` };
    } catch (err) {
      attempts.push(`${label} (${err.message})`);
    }
  }

  return { delivered: false, error: attempts.join(' | ') || 'SMTP delivery failed.' };
};

const sendEmail = async ({ to, subject, html }) => {
  const strategies = [];

  const preferSmtpFirst = smtpPriority === 'smtp-first' || (hasMailConfig && looksLikeGmailConfig);

  if (preferSmtpFirst) {
    if (smtpTransports.length > 0) strategies.push({ name: 'smtp', fn: sendViaSmtp });
    if (hasResendConfig) strategies.push({ name: 'resend', fn: sendViaResend });
  } else {
    if (hasResendConfig) strategies.push({ name: 'resend', fn: sendViaResend });
    if (smtpTransports.length > 0) strategies.push({ name: 'smtp', fn: sendViaSmtp });
  }

  for (const strategy of strategies) {
    const result = await strategy.fn({ to, subject, html });
    if (result.delivered) {
      return result;
    }

    console.error(`[EMAIL ${strategy.name.toUpperCase()} ERROR]`, result.error);
  }

  const error = hasResendConfig || smtpTransports.length > 0
    ? 'All configured email providers failed to deliver the message.'
    : 'Email is not configured. Set RESEND_API_KEY + RESEND_FROM_EMAIL or SMTP_* values.';

  console.error('Email send failed:', error);
  return { delivered: false, error };
};

const templates = {
  verifyEmail: (name, otp) => ({
    subject: 'Verify your LBC email address',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#060d1f;padding:1.5rem 2rem;border-radius:12px 12px 0 0;text-align:center">
        <span style="font-size:1.5rem;font-weight:900;color:#fff">LB<span style="color:#0066ff">C</span></span>
      </div>
      <div style="background:#fff;padding:2rem;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <h2 style="color:#060d1f">Hi ${name} 👋</h2>
        <p style="color:#64748b">Use the code below to verify your email. Expires in 15 minutes.</p>
        <div style="background:#f1f5f9;border-radius:10px;padding:1.5rem;text-align:center;margin:1.5rem 0">
          <span style="font-size:2.5rem;font-weight:900;letter-spacing:.3em;color:#060d1f">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:.85rem">If you didn't create an LBC account, ignore this email.</p>
      </div>
    </div>`,
  }),

  welcomeVendor: (name) => ({
    subject: 'Welcome to LBC — Your business is live!',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#060d1f;padding:1.5rem 2rem;border-radius:12px 12px 0 0;text-align:center">
        <span style="font-size:1.5rem;font-weight:900;color:#fff">LB<span style="color:#0066ff">C</span></span>
      </div>
      <div style="background:#fff;padding:2rem;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <h2 style="color:#060d1f">Welcome to LBC, ${name}!</h2>
        <p style="color:#64748b">Your business is now listed on Lagos's fastest-growing local marketplace.</p>
        <ul style="color:#334155;line-height:2">
          <li>Add your WhatsApp number in Settings to activate the WhatsApp button</li>
          <li>Upload product photos for better visibility</li>
          <li>Consider a Weekly Boost (N5,000) to appear on the homepage</li>
        </ul>
        <a href="${getFrontendBaseUrl()}" style="display:inline-block;background:#0066ff;color:#fff;padding:.75rem 2rem;border-radius:10px;text-decoration:none;font-weight:700;margin-top:1rem">Go to Dashboard</a>
      </div>
    </div>`,
  }),

  boostConfirmed: (name, plan, endDate) => ({
    subject: `Your LBC ${plan} Boost is live!`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#060d1f;padding:1.5rem 2rem;border-radius:12px 12px 0 0;text-align:center">
        <span style="font-size:1.5rem;font-weight:900;color:#fff">LB<span style="color:#0066ff">C</span></span>
      </div>
      <div style="background:#fff;padding:2rem;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <h2 style="color:#060d1f">Your Boost is Live, ${name}!</h2>
        <p style="color:#64748b">Your <strong>${plan}</strong> boost is now active. Expires: <strong>${endDate}</strong></p>
        <a href="${getFrontendBaseUrl()}" style="display:inline-block;background:#f59e0b;color:#7c3e00;padding:.75rem 2rem;border-radius:10px;text-decoration:none;font-weight:700;margin-top:1rem">View Dashboard</a>
      </div>
    </div>`,
  }),

  resetPassword: (name, resetUrl) => ({
    subject: 'Reset your LBC password',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#060d1f;padding:1.5rem 2rem;border-radius:12px 12px 0 0;text-align:center">
        <span style="font-size:1.5rem;font-weight:900;color:#fff">LB<span style="color:#0066ff">C</span></span>
      </div>
      <div style="background:#fff;padding:2rem;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <h2 style="color:#060d1f">Password Reset, ${name}</h2>
        <p style="color:#64748b">Click below to reset your password. Expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#060d1f;color:#fff;padding:.75rem 2rem;border-radius:10px;text-decoration:none;font-weight:700;margin-top:1rem">Reset Password</a>
        <p style="color:#94a3b8;font-size:.85rem;margin-top:1.5rem">If you didn't request this, you can safely ignore it.</p>
      </div>
    </div>`,
  }),
};

module.exports = { sendEmail, templates };
