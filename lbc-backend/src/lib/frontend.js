const DEFAULT_FRONTEND_URL = 'https://lekkibusinessconnect.com';

const normalizeUrl = (value) => {
  const trimmed = (value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getFrontendBaseUrl = () => normalizeUrl(
  process.env.FRONTEND_URL_PROD
  || process.env.FRONTEND_URL_STAGING
  || process.env.FRONTEND_URL
  || DEFAULT_FRONTEND_URL
);

const getAllowedOrigins = () => {
  const productionOrigins = [
    getFrontendBaseUrl(),
    normalizeUrl(process.env.FRONTEND_URL),
    normalizeUrl(process.env.FRONTEND_URL_PROD),
    normalizeUrl(process.env.FRONTEND_URL_STAGING),
    'https://www.lekkibusinessconnect.com',
  ];

  if (process.env.NODE_ENV === 'production') {
    return Array.from(new Set(productionOrigins.filter(Boolean)));
  }

  return Array.from(new Set([
    ...productionOrigins,
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ].filter(Boolean)));
};

module.exports = {
  DEFAULT_FRONTEND_URL,
  getAllowedOrigins,
  getFrontendBaseUrl,
};