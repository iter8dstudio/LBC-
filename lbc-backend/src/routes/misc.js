// src/routes/misc.js
const router = require('express').Router();
const ctrl = require('../controllers/misc');

router.get('/health',       ctrl.health);
router.get('/categories',   ctrl.getCategories);
router.get('/locations',    ctrl.getLocations);
router.post('/contact',     ctrl.submitContact);
router.post('/report',      ctrl.submitReport);

module.exports = router;
