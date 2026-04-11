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
const mailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const mailFrom = process.env.EMAIL_FROM || mailUser;

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const hasResendConfig = Boolean(resend && resendFrom);
const hasMailConfig = Boolean(mailHost && mailPort && mailUser && mailPass && mailFrom);

if (!hasResendConfig && !hasMailConfig) {
  console.warn('[EMAIL CONFIG WARNING] Email is not fully configured. Set RESEND_API_KEY + RESEND_FROM_EMAIL, or SMTP_* / EMAIL_* values.');
}

const transporter = hasMailConfig
  ? nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailPort === 465,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    })
  : null;

if (transporter && process.env.NODE_ENV !== 'production') {
  transporter.verify((err, success) => {
    if (err) {
      console.error('[EMAIL SMTP ERROR] Connection failed:', err.message);
    } else if (success) {
      console.log('[EMAIL SMTP OK] Ready for messages');
    }
  });
}

const sendViaResend = async ({ to, subject, html }) => {
  if (!hasResendConfig) {
    return { delivered: false, error: 'Resend is not configured.' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(resendReplyTo ? { replyTo: resendReplyTo } : {}),
    });

    if (error) {
      return { delivered: false, error: error.message || JSON.stringify(error) };
    }

    return { delivered: true, messageId: data?.id, provider: 'resend' };
  } catch (err) {
    return { delivered: false, error: err.message };
  }
};

const sendViaSmtp = async ({ to, subject, html }) => {
  if (!transporter) {
    return { delivered: false, error: 'SMTP is not configured.' };
  }

  try {
    const info = await transporter.sendMail({ from: mailFrom, to, subject, html });
    return { delivered: true, messageId: info.messageId, provider: 'smtp' };
  } catch (err) {
    return { delivered: false, error: err.message };
  }
};

const sendEmail = async ({ to, subject, html }) => {
  if (hasResendConfig) {
    const resendResult = await sendViaResend({ to, subject, html });
    if (resendResult.delivered) {
      return resendResult;
    }
    console.error('[EMAIL RESEND ERROR]', resendResult.error);
  }

  if (transporter) {
    const smtpResult = await sendViaSmtp({ to, subject, html });
    if (smtpResult.delivered) {
      return smtpResult;
    }
    console.error('[EMAIL SMTP ERROR]', smtpResult.error);
    return smtpResult;
  }

  const error = hasResendConfig
    ? 'Resend could not deliver the email and SMTP fallback is not configured.'
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
