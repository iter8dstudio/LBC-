// src/routes/boosts.js
const router = require('express').Router();
const ctrl = require('../controllers/boosts');
const { authMiddleware, vendorOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { initiateBoostSchema, verifyBoostSchema } = require('../validation/schemas');

router.get('/plans',        ctrl.getPlans);
router.get('/me',           authMiddleware, vendorOnly, ctrl.getMyBoosts);
router.post('/initiate',    authMiddleware, vendorOnly, validate(initiateBoostSchema), ctrl.initiateBoost);
router.post('/verify',      authMiddleware, vendorOnly, validate(verifyBoostSchema), ctrl.verifyBoost);
router.post('/webhook',     ctrl.paystackWebhook); // Paystack posts here directly

module.exports = router;
