// src/routes/misc.js
const router = require('express').Router();
const ctrl = require('../controllers/misc');
const { validate } = require('../middleware/validate');
const { contactSchema, reportSchema } = require('../validation/schemas');

router.get('/health',       ctrl.health);
router.get('/categories',   ctrl.getCategories);
router.get('/locations',    ctrl.getLocations);
router.post('/contact',     validate(contactSchema), ctrl.submitContact);
router.post('/report',      validate(reportSchema), ctrl.submitReport);

module.exports = router;
