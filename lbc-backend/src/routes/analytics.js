// src/routes/analytics.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/analytics');
const { authMiddleware, vendorOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { analyticsEventSchema } = require('../validation/schemas');

const analyticsLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 90,
	message: { error: 'Too many analytics events. Please slow down.' },
	standardHeaders: true,
	legacyHeaders: false,
});

router.post('/listing/:id/event',   analyticsLimiter, validate(analyticsEventSchema), ctrl.trackListingEvent);
router.post('/store/:id/event',     analyticsLimiter, validate(analyticsEventSchema), ctrl.trackStoreEvent);
router.get('/me/overview',          authMiddleware, vendorOnly, ctrl.getOverview);
router.get('/me/listings',          authMiddleware, vendorOnly, ctrl.getListingAnalytics);
router.get('/me/chart',             authMiddleware, vendorOnly, ctrl.getChartData);

module.exports = router;
