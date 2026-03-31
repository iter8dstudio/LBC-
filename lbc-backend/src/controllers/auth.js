// src/controllers/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendEmail, templates } = require('../lib/email');
const { getFrontendBaseUrl } = require('../lib/frontend');
const { normalizePhone, sendSms } = require('../lib/sms');

// ── Helpers ────────────────────────────────────────────────

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const isProduction = process.env.NODE_ENV === 'production';

// ── JWT Secret Validation ─────────────────────────────────
const validateJwtSecret = (secret, name) => {
  if (!secret) {
    throw new Error(`${name} is not set`);
  }
  if (secret.length < 64) {
    throw new Error(`${name} must be at least 64 characters (use openssl rand -base64 48)`);
  }
  return secret;
};

const accessTokenSecret = validateJwtSecret(
  process.env.ACCESS_TOKEN_SECRET,
  'ACCESS_TOKEN_SECRET'
);
const refreshTokenSecret = validateJwtSecret(
  process.env.REFRESH_TOKEN_SECRET,
  'REFRESH_TOKEN_SECRET'
);

const logDevOtp = (label, user, secret, expiresAt) => {
  if (isProduction) return;
  // Only log to stderr in development for debugging, NEVER log to stdout to prevent accidental exposure
  console.error(
    `[DEV OTP] userId=${user.id} code=${secret} expires=${expiresAt.toISOString()}`
  );
};

const logDeliveryFailure = (channel, identifier, error) => {
  console.error(`${channel} delivery failed for ${identifier}: ${error}`);
};

// ── Password Validation Helper ────────────────────────────
const validatePassword = (password) => {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  return { valid: true };
};

const generateTokens = (userId) => {
  // Access token: short-lived (15 minutes)
  const accessToken = jwt.sign({ userId }, accessTokenSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  // Refresh token: long-lived (30 days), used to get new access tokens
  const refreshToken = jwt.sign({ userId }, refreshTokenSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  store: user.store || null,
});

// ── REGISTER ──────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Validate password strength
    const passValidation = validatePassword(password);
    if (!passValidation.valid) {
      return res.status(400).json({ error: passValidation.error });
    }
   
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashed,
        emailOtp: otp,
        emailOtpExpiry: otpExpiry,
        notifications: {
          create: { }, // create default notification prefs
        },
      },
    });

    const tpl = templates.verifyEmail(name, otp);
    const emailResult = await sendEmail({ to: normalizedEmail, ...tpl });

    if (!emailResult.delivered) {
      logDeliveryFailure('Email OTP', normalizedEmail, emailResult.error || 'Unknown email error');
      logDevOtp('EMAIL OTP', user, otp, otpExpiry);
    }

    res.status(201).json({
      message: emailResult.delivered
        ? 'Account created. Check your email for a 6-digit verification code.'
        : 'Account created. Email delivery failed, use the dev OTP endpoint or server log to verify locally.',
      userId: user.id,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// ── VERIFY EMAIL ──────────────────────────────────────────

exports.verifyEmail = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: 'userId and otp are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    if (user.emailOtp !== otp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (user.emailOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Request a new one.' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailOtp: null,
        emailOtpExpiry: null,
        refreshToken,
      },
      include: { store: true },
    });

    res.json({
      message: 'Email verified successfully',
      accessToken,
      refreshToken,
      user: safeUser(updated),
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// ── RESEND EMAIL OTP ──────────────────────────────────────

exports.resendEmailOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { emailOtp: otp, emailOtpExpiry: otpExpiry },
    });

    const tpl = templates.verifyEmail(user.name, otp);
    const emailResult = await sendEmail({ to: user.email, ...tpl });

    if (!emailResult.delivered) {
      logDeliveryFailure('Email OTP', user.email, emailResult.error || 'Unknown email error');
      logDevOtp('EMAIL OTP', user, otp, otpExpiry);
    }

    res.json({
      message: emailResult.delivered
        ? 'New verification code sent'
        : 'Email delivery failed, use the dev OTP endpoint or server log to verify locally.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend code' });
  }
};

exports.getDevEmailOtp = async (req, res) => {
  try {
    // CRITICAL: This endpoint should NEVER exist in production
    // Even if NODE_ENV is misconfigured, block access with multiple checks
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod' || !process.env.NODE_ENV) {
      console.warn('[SECURITY] Dev OTP endpoint accessed in production-like environment!');
      return res.status(404).json({ error: 'Route not found' });
    }

    // Additional security: Log all access to this endpoint
    console.warn(`[DEV-OTP-ACCESS] User agent: ${req.get('user-agent')}, IP: ${req.ip}`);

    const userId = req.query.userId || req.body?.userId;
    const email = req.query.email?.toLowerCase().trim() || req.body?.email?.toLowerCase().trim();

    if (!userId && !email) {
      return res.status(400).json({ error: 'userId or email is required' });
    }

    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailOtp: true,
        emailOtpExpiry: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // SECURITY: Only return OTP in development with explicit warning
    console.warn(`[DEV-OTP] Returning OTP for ${user.email} - DO NOT USE IN PRODUCTION`);

    res.json({
      _warning: 'This is a development-only endpoint. Should not exist in production!',
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      otp: user.emailOtp,
      expiresAt: user.emailOtpExpiry,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dev OTP' });
  }
};

// ── LOGIN ─────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { store: true },
    });

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email before signing in',
        code: 'EMAIL_NOT_VERIFIED',
        userId: user.id,
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.json({ accessToken, refreshToken, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, refreshTokenSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { store: true },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    res.json({ ...tokens, user: safeUser(user) });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// ── LOGOUT ────────────────────────────────────────────────

exports.logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

// ── SEND PHONE OTP ────────────────────────────────────────

exports.sendPhoneOtp = async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.user.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Add a valid phone number in your account settings before requesting an OTP.' });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const smsMessage = `Your LBC verification code is ${otp}. It expires in 10 minutes.`;

    const smsResult = await sendSms({ to: normalizedPhone, message: smsMessage });

    if (!smsResult.delivered) {
      logDeliveryFailure('Phone OTP', normalizedPhone, smsResult.error || 'Unknown SMS error');
      return res.status(503).json({ error: smsResult.error || 'Failed to send OTP. Please try again.' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { phone: normalizedPhone, phoneOtp: otp, phoneOtpExpiry: otpExpiry, phoneVerified: false },
    });

    res.json({ message: 'OTP sent to your phone number' });
  } catch (err) {
    console.error('sendPhoneOtp error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// ── VERIFY PHONE ──────────────────────────────────────────

exports.verifyPhone = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = req.user;

    if (user.phoneOtp !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }
    if (user.phoneOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Request a new one.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true, phoneOtp: null, phoneOtpExpiry: null },
    });

    res.json({ message: 'Phone number verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Phone verification failed' });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOtp: resetToken,
        emailOtpExpiry: resetExpiry,
      },
    });

    const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}&userId=${user.id}`;
    const tpl = templates.resetPassword(user.name, resetUrl);
    const emailResult = await sendEmail({ to: user.email, ...tpl });

    if (!emailResult.delivered) {
      logDeliveryFailure('Password reset', user.email, emailResult.error || 'Unknown email error');
      logDevOtp('RESET TOKEN', user, resetToken, resetExpiry);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────

exports.resetPassword = async (req, res) => {
  try {
    const { userId, token, password } = req.body;

    if (!userId || !token || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate password strength
    const passValidation = validatePassword(password);
    if (!passValidation.valid) {
      return res.status(400).json({ error: passValidation.error });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailOtp !== token || user.emailOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, emailOtp: null, emailOtpExpiry: null, refreshToken: null },
    });

    res.json({ message: 'Password reset successfully. Please sign in.' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};
