// src/routes/auth.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
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

const passwordResetLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	keyGenerator: (req) => `${req.ip}:${String(req.body?.email || req.body?.userId || '').toLowerCase()}`,
	message: { error: 'Too many password reset attempts. Please try again later.' },
	standardHeaders: true,
	legacyHeaders: false,
});

router.post('/register',         validate(registerSchema), ctrl.register);
router.post('/verify-email',     validate(verifyEmailSchema), ctrl.verifyEmail);
router.post('/resend-otp',       validate(resendOtpSchema), ctrl.resendEmailOtp);

router.post('/login',            validate(loginSchema), ctrl.login);
router.post('/refresh',          validate(refreshSchema), ctrl.refresh);
router.post('/logout',           authMiddleware, ctrl.logout);
router.post('/send-phone-otp',   authMiddleware, ctrl.sendPhoneOtp);
router.post('/verify-phone',     authMiddleware, validate(verifyPhoneSchema), ctrl.verifyPhone);
router.post('/forgot-password',  passwordResetLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password',   passwordResetLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

module.exports = router;
