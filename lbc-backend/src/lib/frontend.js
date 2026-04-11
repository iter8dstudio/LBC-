const DEFAULT_FRONTEND_URL = 'https://lekkibusinessconnect.com';

const normalizeUrl = (value) => (value || '').trim().replace(/\/$/, '');

const getFrontendBaseUrl = () => normalizeUrl(
  process.env.FRONTEND_URL_PROD
  || process.env.FRONTEND_URL_STAGING
  || process.env.FRONTEND_URL
  || DEFAULT_FRONTEND_URL
);

const getAllowedOrigins = () => Array.from(new Set([
  getFrontendBaseUrl(),
  normalizeUrl(process.env.FRONTEND_URL),
  normalizeUrl(process.env.FRONTEND_URL_PROD),
  normalizeUrl(process.env.FRONTEND_URL_STAGING),
  'https://www.lekkibusinessconnect.com',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean)));

module.exports = {
  DEFAULT_FRONTEND_URL,
  getAllowedOrigins,
  getFrontendBaseUrl,
};