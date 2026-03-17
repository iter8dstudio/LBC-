// src/routes/listings.js
const router = require('express').Router();
const ctrl = require('../controllers/listings');
const { authMiddleware, vendorOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/',                         ctrl.getListings);
router.get('/me',                       authMiddleware, vendorOnly, ctrl.getMyListings);
router.get('/store/:storeId',           ctrl.getListingsByStore);
router.get('/:id',                      ctrl.getListing);
router.post('/',                        authMiddleware, vendorOnly, ctrl.createListing);
router.patch('/:id',                    authMiddleware, vendorOnly, ctrl.updateListing);
router.patch('/:id/status',             authMiddleware, vendorOnly, ctrl.updateListingStatus);
router.delete('/:id',                   authMiddleware, vendorOnly, ctrl.deleteListing);
router.post('/:id/images',              authMiddleware, vendorOnly, upload.array('images', 5), ctrl.uploadImages);

module.exports = router;
