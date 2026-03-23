// src/routes/users.js
const router = require('express').Router();
const ctrl = require('../controllers/users');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
	updateMeSchema,
	changePasswordSchema,
	updateNotificationsSchema,
} = require('../validation/schemas');

router.get('/me',                         authMiddleware, ctrl.getMe);
router.patch('/me',                       authMiddleware, validate(updateMeSchema), ctrl.updateMe);
router.patch('/me/password',              authMiddleware, validate(changePasswordSchema), ctrl.changePassword);
router.patch('/me/notifications',         authMiddleware, validate(updateNotificationsSchema), ctrl.updateNotifications);
router.get('/me/wishlist',                authMiddleware, ctrl.getWishlist);
router.post('/me/wishlist/:listingId',    authMiddleware, ctrl.addToWishlist);
router.delete('/me/wishlist/:listingId',  authMiddleware, ctrl.removeFromWishlist);

module.exports = router;
