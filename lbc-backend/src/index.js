// src/index.js
require('dotenv').config();

const crypto     = require('crypto');
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { sanitizeRequest } = require('./middleware/sanitize');
const { getAllowedOrigins, getFrontendBaseUrl } = require('./lib/frontend');
const { getPaystackSecretKey } = require('./lib/paystack');

const app = express();

const buildFallbackSecret = (name) => crypto
  .createHash('sha256')
  .update(`${process.env.RAILWAY_PROJECT_ID || 'lbc'}:${name}:fallback-secret`)
  .digest('hex');

const ensureRuntimeSecret = (name, minLength = 64) => {
  const current = (process.env[name] || '').trim();
  if (current && current.length >= minLength) return current;

  const reason = !current ? 'is not set' : `is shorter than ${minLength} characters`;
  process.env[name] = buildFallbackSecret(name);
  console.warn(
    `[CONFIG WARNING] ${name} ${reason}. Using a temporary fallback so the API can start. Set a strong value in Railway variables.`
  );
  return process.env[name];
};

ensureRuntimeSecret('ACCESS_TOKEN_SECRET', 64);
ensureRuntimeSecret('REFRESH_TOKEN_SECRET', 64);

// Trust Railway's reverse proxy so X-Forwarded-For is used for real client IPs.
// '1' = trust one proxy hop. Required for express-rate-limit to work correctly on Railway.
app.set('trust proxy', 1);

// ── SECURITY ──────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}));

// ── RATE LIMITING ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use(generalLimiter);

// ── RAW BODY for Paystack Webhook ─────────────────────────
// Must come BEFORE express.json()
app.use('/api/boosts/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

// ── BODY PARSING ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeRequest);

// ── SECRET HEALTH CHECKS ─────────────────────────────────
const checkSecret = (name, value) => {
  if (!value) {
    console.warn(`[SECURITY WARNING] ${name} is not set. Related features may be unavailable.`);
    return;
  }

  if (value.length < 32) {
    console.warn(`[SECURITY WARNING] ${name} should be at least 32 characters.`);
  }
};

checkSecret('ACCESS_TOKEN_SECRET', process.env.ACCESS_TOKEN_SECRET);
checkSecret('REFRESH_TOKEN_SECRET', process.env.REFRESH_TOKEN_SECRET);

if (process.env.NODE_ENV === 'production' && !getPaystackSecretKey()) {
  console.warn('[SECURITY WARNING] PAYSTACK_SECRET_KEY is not set. Payment features will be unavailable until configured.');
}

// ── ROUTES ────────────────────────────────────────────────
app.use('/api',           require('./routes/misc'));
app.use('/api/auth',      authLimiter, require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/stores',    require('./routes/stores'));
app.use('/api/listings',  require('./routes/listings'));
app.use('/api/boosts',    require('./routes/boosts'));
app.use('/api/analytics', require('./routes/analytics'));

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.message?.includes('Only JPG')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : err.message,
  });
});

// ── START ─────────────────────────────────────────────────
const BASE_PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const maxDevPortAttempts = 10;

const startServer = (port, attempt = 0) => {
  const server = app.listen(port, () => {
    console.log(`\n🚀 LBC API running on port ${port}`);
    console.log(`   ENV:      ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Frontend: ${getFrontendBaseUrl() || 'not set'}\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (isProd) {
        console.error(`Port ${port} is already in use. Exiting in production mode.`);
        process.exit(1);
      }

      if (attempt >= maxDevPortAttempts) {
        console.error(
          `Could not find a free port after ${maxDevPortAttempts + 1} attempts starting from ${BASE_PORT}.`
        );
        process.exit(1);
      }

      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on ${nextPort}...`);
      return startServer(nextPort, attempt + 1);
    }

    console.error('Server startup error:', err);
    process.exit(1);
  });
};

startServer(BASE_PORT);

module.exports = app;
