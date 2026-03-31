// src/controllers/users.js
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { normalizePhone } = require('../lib/sms');

// ── Password Validation Helper ────────────────────────────
const validatePassword = (password) => {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  return { valid: true };
};

// ── GET ME ────────────────────────────────────────────────

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        store: true,
        notifications: true,
      },
    });
    const { password, refreshToken, emailOtp, phoneOtp, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// ── UPDATE ME ─────────────────────────────────────────────

exports.updateMe = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const data = {};
    if (name) data.name = name;
    if (phone !== undefined) {
      data.phone = normalizePhone(phone) || '';
      data.phoneVerified = false;
      data.phoneOtp = null;
      data.phoneOtpExpiry = null;
    }

    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    const { password, refreshToken, emailOtp, phoneOtp, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Validate new password strength
    const passValidation = validatePassword(newPassword);
    if (!passValidation.valid) {
      return res.status(400).json({ error: passValidation.error });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// ── UPDATE NOTIFICATIONS ──────────────────────────────────

exports.updateNotifications = async (req, res) => {
  try {
    const allowed = ['emailNotif', 'smsAlert', 'browserNotif', 'waLeads', 'boostExpiry', 'weeklyReport'];
    const data = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) data[k] = Boolean(req.body[k]); });

    const prefs = await prisma.notificationPref.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    });

    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

// ── WISHLIST ──────────────────────────────────────────────

exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: { store: { select: { bizName: true, slug: true, verified: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(wishlist.map((w) => w.listing).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { listingId } = req.params;
    const item = await prisma.wishlist.upsert({
      where: { userId_listingId: { userId: req.user.id, listingId } },
      update: {},
      create: { userId: req.user.id, listingId },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { listingId } = req.params;
    await prisma.wishlist.deleteMany({
      where: { userId: req.user.id, listingId },
    });
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
};
