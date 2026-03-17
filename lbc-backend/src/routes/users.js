// src/routes/users.js
const router = require('express').Router();
const ctrl = require('../controllers/users');
const { authMiddleware } = require('../middleware/auth');

router.get('/me',                         authMiddleware, ctrl.getMe);
router.patch('/me',                       authMiddleware, ctrl.updateMe);
router.patch('/me/password',              authMiddleware, ctrl.changePassword);
router.patch('/me/notifications',         authMiddleware, ctrl.updateNotifications);
router.get('/me/wishlist',                authMiddleware, ctrl.getWishlist);
router.post('/me/wishlist/:listingId',    authMiddleware, ctrl.addToWishlist);
router.delete('/me/wishlist/:listingId',  authMiddleware, ctrl.removeFromWishlist);

module.exports = router;
