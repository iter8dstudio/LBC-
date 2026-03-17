// src/routes/boosts.js
const router = require('express').Router();
const ctrl = require('../controllers/boosts');
const { authMiddleware, vendorOnly } = require('../middleware/auth');

router.get('/plans',        ctrl.getPlans);
router.get('/me',           authMiddleware, vendorOnly, ctrl.getMyBoosts);
router.post('/initiate',    authMiddleware, vendorOnly, ctrl.initiateBoost);
router.post('/verify',      authMiddleware, vendorOnly, ctrl.verifyBoost);
router.post('/webhook',     ctrl.paystackWebhook); // Paystack posts here directly

module.exports = router;
