// src/routes/listings.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/listings');
const { authMiddleware, vendorOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const {
	createListingSchema,
	updateListingSchema,
	updateListingStatusSchema,
} = require('../validation/schemas');

const publicReadLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	message: { error: 'Too many listing requests. Please slow down.' },
	standardHeaders: true,
	legacyHeaders: false,
});

router.get('/',                         publicReadLimiter, ctrl.getListings);
router.get('/me',                       authMiddleware, vendorOnly, ctrl.getMyListings);
router.get('/store/:storeId',           publicReadLimiter, ctrl.getListingsByStore);
router.post('/',                        authMiddleware, vendorOnly, validate(createListingSchema), ctrl.createListing);
router.post('/:id/images',              authMiddleware, vendorOnly, upload.array('images', 5), ctrl.uploadImages);
router.patch('/:id/status',             authMiddleware, vendorOnly, validate(updateListingStatusSchema), ctrl.updateListingStatus);
router.patch('/:id',                    authMiddleware, vendorOnly, validate(updateListingSchema), ctrl.updateListing);
router.delete('/:id',                   authMiddleware, vendorOnly, ctrl.deleteListing);
router.get('/:id',                      publicReadLimiter, ctrl.getListing);

module.exports = router;
