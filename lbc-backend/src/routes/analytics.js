// src/routes/analytics.js
const router = require('express').Router();
const ctrl = require('../controllers/analytics');
const { authMiddleware, vendorOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { analyticsEventSchema } = require('../validation/schemas');

router.post('/listing/:id/event',   validate(analyticsEventSchema), ctrl.trackListingEvent);
router.post('/store/:id/event',     validate(analyticsEventSchema), ctrl.trackStoreEvent);
router.get('/me/overview',          authMiddleware, vendorOnly, ctrl.getOverview);
router.get('/me/listings',          authMiddleware, vendorOnly, ctrl.getListingAnalytics);
router.get('/me/chart',             authMiddleware, vendorOnly, ctrl.getChartData);

module.exports = router;
