// src/routes/analytics.js
const router = require('express').Router();
const ctrl = require('../controllers/analytics');
const { authMiddleware, vendorOnly } = require('../middleware/auth');

router.post('/listing/:id/event',   ctrl.trackListingEvent);
router.post('/store/:id/event',     ctrl.trackStoreEvent);
router.get('/me/overview',          authMiddleware, vendorOnly, ctrl.getOverview);
router.get('/me/listings',          authMiddleware, vendorOnly, ctrl.getListingAnalytics);
router.get('/me/chart',             authMiddleware, vendorOnly, ctrl.getChartData);

module.exports = router;
