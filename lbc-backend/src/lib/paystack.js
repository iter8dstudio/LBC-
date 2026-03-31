const getPaystackSecretKey = () => process.env.PAYSTACK_SECRET_KEY?.trim() || '';

const assertPaystackConfigured = () => {
  const secretKey = getPaystackSecretKey();

  if (!secretKey) {
    const error = new Error('PAYSTACK_SECRET_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }

  return secretKey;
};

module.exports = {
  getPaystackSecretKey,
  assertPaystackConfigured,
};