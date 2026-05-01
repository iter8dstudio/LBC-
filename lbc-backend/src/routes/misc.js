// src/routes/misc.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/misc');
const { validate } = require('../middleware/validate');
const { contactSchema, reportSchema } = require('../validation/schemas');

const publicFormLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: { error: 'Too many submissions. Please try again later.' },
	standardHeaders: true,
	legacyHeaders: false,
});

router.get('/health',       ctrl.health);
router.get('/categories',   ctrl.getCategories);
router.get('/locations',    ctrl.getLocations);
router.post('/contact',     publicFormLimiter, validate(contactSchema), ctrl.submitContact);
router.post('/report',      publicFormLimiter, validate(reportSchema), ctrl.submitReport);

module.exports = router;
