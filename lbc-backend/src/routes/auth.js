// src/routes/auth.js
const router = require('express').Router();
const ctrl = require('../controllers/auth');
const { authMiddleware } = require('../middleware/auth');

router.post('/register',         ctrl.register);
router.post('/verify-email',     ctrl.verifyEmail);
router.post('/resend-otp',       ctrl.resendEmailOtp);
router.post('/login',            ctrl.login);
router.post('/refresh',          ctrl.refresh);
router.post('/logout',           authMiddleware, ctrl.logout);
router.post('/send-phone-otp',   authMiddleware, ctrl.sendPhoneOtp);
router.post('/verify-phone',     authMiddleware, ctrl.verifyPhone);
router.post('/forgot-password',  ctrl.forgotPassword);
router.post('/reset-password',   ctrl.resetPassword);

module.exports = router;
