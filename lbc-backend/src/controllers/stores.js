// src/controllers/stores.js
const prisma = require('../lib/prisma');
const { uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const { sendEmail, templates } = require('../lib/email');

// Generate a URL-safe slug from business name
const makeSlug = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const uniqueSlug = async (base) => {
  let slug = makeSlug(base);
  let count = 0;
  while (await prisma.store.findUnique({ where: { slug } })) {
    count++;
    slug = `${makeSlug(base)}-${count}`;
  }
  return slug;
};

// ── GET ALL STORES (public) ───────────────────────────────

exports.getStores = async (req, res) => {
  try {
    const { q, category, location, sponsored, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(q && {
        OR: [
          { bizName: { contains: q, mode: 'insensitive' } },
          { bizDesc: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
      ...(sponsored === 'true' && { sponsored: true }),
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ sponsored: 'desc' }, { verified: 'desc' }, { createdAt: 'desc' }],
        include: {
          _count: { select: { listings: true } },
        },
      }),
      prisma.store.count({ where }),
    ]);

    res.json({ stores, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('getStores error:', err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
};

// ── GET SINGLE STORE (public, by slug) ────────────────────

exports.getStoreBySlug = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: req.params.slug },
      include: {
        listings: {
          where: { status: 'live' },
          orderBy: [{ sponsored: 'desc' }, { createdAt: 'desc' }],
        },
        _count: { select: { listings: true } },
      },
    });

    if (!store) return res.status(404).json({ error: 'Store not found' });

    // Record store view
    await prisma.storeAnalytic.create({
      data: {
        storeId: store.id,
        event: 'view',
        source: req.query.source || 'direct',
      },
    });

    res.json(store);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch store' });
  }
};

// ── GET MY STORE (vendor) ─────────────────────────────────

exports.getMyStore = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({
      where: { userId: req.user.id },
      include: {
        listings: {
          orderBy: { createdAt: 'desc' },
        },
        boosts: {
          where: { status: 'active' },
          orderBy: { endDate: 'asc' },
        },
      },
    });

    if (!store) return res.status(404).json({ error: 'You have not set up a store yet' });
    res.json(store);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch store' });
  }
};

// ── CREATE STORE (vendor onboarding) ─────────────────────

exports.createStore = async (req, res) => {
  try {
    const existing = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (existing) {
      return res.status(409).json({ error: 'You already have a store. Use PATCH /stores/me to update it.' });
    }

    const { bizName, category, location, bizPhone, bizEmail, whatsapp, bizDesc } = req.body;

    if (!bizName || !category || !location) {
      return res.status(400).json({ error: 'Business name, category and location are required' });
    }

    const slug = await uniqueSlug(bizName);

    const store = await prisma.store.create({
      data: {
        userId: req.user.id,
        bizName,
        slug,
        category,
        location,
        bizPhone: bizPhone || null,
        bizEmail: bizEmail || null,
        whatsapp: whatsapp || null,
        bizDesc: bizDesc || null,
      },
    });

    // Update user role to VENDOR
    await prisma.user.update({ where: { id: req.user.id }, data: { role: 'VENDOR' } });

    // Send welcome email
    const tpl = templates.welcomeVendor(req.user.name);
    await sendEmail({ to: req.user.email, ...tpl });

    res.status(201).json(store);
  } catch (err) {
    console.error('createStore error:', err);
    res.status(500).json({ error: 'Failed to create store' });
  }
};

// ── UPDATE STORE (vendor settings) ───────────────────────

exports.updateStore = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const allowed = ['bizName', 'category', 'location', 'bizPhone', 'bizEmail', 'whatsapp', 'bizDesc', 'accentColor'];
    const data = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });

    // If bizName changed, regenerate slug
    if (data.bizName && data.bizName !== store.bizName) {
      data.slug = await uniqueSlug(data.bizName);
    }

    const updated = await prisma.store.update({ where: { id: store.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update store' });
  }
};

// ── UPLOAD LOGO ───────────────────────────────────────────

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const result = await uploadToCloudinary(req.file.buffer, 'logos', {
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    await prisma.store.update({ where: { id: store.id }, data: { logo: result.secure_url } });

    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: 'Logo upload failed' });
  }
};

// ── UPLOAD BANNER ─────────────────────────────────────────

exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const result = await uploadToCloudinary(req.file.buffer, 'banners', {
      transformation: [{ width: 1200, height: 400, crop: 'fill' }],
    });

    await prisma.store.update({ where: { id: store.id }, data: { banner: result.secure_url } });

    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: 'Banner upload failed' });
  }
};

// ── REQUEST VERIFICATION ──────────────────────────────────

exports.requestVerification = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.verified) return res.status(400).json({ error: 'Store is already verified' });

    // In production: create a verification request record and notify admin
    // For now we just acknowledge the request
    res.json({ message: 'Verification request submitted. Our team will review within 24 hours.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit verification request' });
  }
};
