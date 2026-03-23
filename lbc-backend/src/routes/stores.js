// src/routes/stores.js
const router = require('express').Router();
const ctrl = require('../controllers/stores');
const { authMiddleware, vendorOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const { createStoreSchema, updateStoreSchema } = require('../validation/schemas');

router.get('/',                     ctrl.getStores);
router.get('/me',                   authMiddleware, vendorOnly, ctrl.getMyStore);
router.post('/',                    authMiddleware, validate(createStoreSchema), ctrl.createStore);
router.patch('/me',                 authMiddleware, vendorOnly, validate(updateStoreSchema), ctrl.updateStore);
router.post('/me/logo',             authMiddleware, vendorOnly, upload.single('logo'),   ctrl.uploadLogo);
router.post('/me/banner',           authMiddleware, vendorOnly, upload.single('banner'), ctrl.uploadBanner);
router.post('/me/request-verification', authMiddleware, vendorOnly, ctrl.requestVerification);
router.get('/:slug',                ctrl.getStoreBySlug);

module.exports = router;
