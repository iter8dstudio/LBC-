// src/routes/auth.js
const router = require('express').Router();
const ctrl = require('../controllers/auth');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
	registerSchema,
	verifyEmailSchema,
	resendOtpSchema,
	loginSchema,
	refreshSchema,
	verifyPhoneSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
} = require('../validation/schemas');

router.post('/register',         validate(registerSchema), ctrl.register);
router.post('/verify-email',     validate(verifyEmailSchema), ctrl.verifyEmail);
router.post('/resend-otp',       validate(resendOtpSchema), ctrl.resendEmailOtp);

const enableDevOtpEndpoint =
  process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_OTP_ENDPOINT === 'true';

if (enableDevOtpEndpoint) {
  router.get('/dev/email-otp', ctrl.getDevEmailOtp);
}

router.post('/login',            validate(loginSchema), ctrl.login);
router.post('/refresh',          validate(refreshSchema), ctrl.refresh);
router.post('/logout',           authMiddleware, ctrl.logout);
router.post('/send-phone-otp',   authMiddleware, ctrl.sendPhoneOtp);
router.post('/verify-phone',     authMiddleware, validate(verifyPhoneSchema), ctrl.verifyPhone);
router.post('/forgot-password',  validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password',   validate(resetPasswordSchema), ctrl.resetPassword);

module.exports = router;
