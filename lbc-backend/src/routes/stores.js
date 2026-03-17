// src/routes/stores.js
const router = require('express').Router();
const ctrl = require('../controllers/stores');
const { authMiddleware, vendorOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/',                     ctrl.getStores);
router.get('/me',                   authMiddleware, vendorOnly, ctrl.getMyStore);
router.post('/',                    authMiddleware, ctrl.createStore);
router.patch('/me',                 authMiddleware, vendorOnly, ctrl.updateStore);
router.post('/me/logo',             authMiddleware, vendorOnly, upload.single('logo'),   ctrl.uploadLogo);
router.post('/me/banner',           authMiddleware, vendorOnly, upload.single('banner'), ctrl.uploadBanner);
router.post('/me/request-verification', authMiddleware, vendorOnly, ctrl.requestVerification);
router.get('/:slug',                ctrl.getStoreBySlug);

module.exports = router;
