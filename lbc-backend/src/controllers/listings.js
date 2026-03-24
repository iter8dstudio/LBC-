// src/controllers/listings.js
const prisma = require('../lib/prisma');
const { uploadToCloudinary } = require('../middleware/upload');

// ── GET ALL LISTINGS (public search) ─────────────────────

exports.getListings = async (req, res) => {
  try {
    const {
      q, category, location, type,
      minPrice, maxPrice, sponsored,
      sort = 'relevance', page = 1, limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: 'live',
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
      ...(type && { type }),
      ...(sponsored === 'true' && { sponsored: true }),
      ...((minPrice || maxPrice) && {
        price: {
          ...(minPrice && { gte: parseFloat(minPrice) }),
          ...(maxPrice && { lte: parseFloat(maxPrice) }),
        },
      }),
    };

    const orderBy = {
      relevance:  [{ sponsored: 'desc' }, { views: 'desc' }],
      price_asc:  [{ price: 'asc' }],
      price_desc: [{ price: 'desc' }],
      newest:     [{ createdAt: 'desc' }],
    }[sort] || [{ sponsored: 'desc' }];

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          store: {
            select: {
              id: true,
              bizName: true,
              slug: true,
              verified: true,
              sponsored: true,
              category: true,
              location: true,
              whatsapp: true,
              bizPhone: true,
              bizEmail: true,
              logo: true,
              banner: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({ listings, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('getListings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
};

// ── GET SINGLE LISTING (public) ───────────────────────────

exports.getListing = async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        store: {
          select: {
            id: true, bizName: true, slug: true, verified: true,
            sponsored: true, location: true, whatsapp: true,
            logo: true, banner: true, bizPhone: true, bizDesc: true,
          },
        },
      },
    });

    if (!listing || listing.status !== 'live') {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Record view (do not fail listing fetch if analytics write fails)
    try {
      await prisma.listingAnalytic.create({
        data: { listingId: listing.id, event: 'view', source: req.query.source || 'direct' },
      });
      await prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } });
    } catch (analyticsErr) {
      console.warn('getListing analytics write failed:', analyticsErr.message);
    }

    res.json(listing);
  } catch (err) {
    console.error('getListing error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
};

// ── GET LISTINGS BY STORE (public) ────────────────────────

exports.getListingsByStore = async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { storeId: req.params.storeId, status: 'live' },
      orderBy: [{ sponsored: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
};

// ── GET MY LISTINGS (vendor) ──────────────────────────────

exports.getMyListings = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const listings = await prisma.listing.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your listings' });
  }
};

// ── CREATE LISTING ────────────────────────────────────────

exports.createListing = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Set up your store profile before adding listings' });

    const { title, price, type, category, description, status = 'draft' } = req.body;

    if (!title || !price || !type || !category) {
      return res.status(400).json({ error: 'Title, price, type and category are required' });
    }

    const listing = await prisma.listing.create({
      data: {
        storeId: store.id,
        title,
        price: parseFloat(price),
        type,
        category,
        location: req.body.location || store.location,
        description: description || null,
        status: ['draft', 'live'].includes(status) ? status : 'draft',
      },
    });

    res.status(201).json(listing);
  } catch (err) {
    console.error('createListing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
};

// ── UPDATE LISTING ────────────────────────────────────────

exports.updateListing = async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store || listing.storeId !== store.id) {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }

    const allowed = ['title', 'price', 'type', 'category', 'location', 'description'];
    const data = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    if (data.price) data.price = parseFloat(data.price);

    const updated = await prisma.listing.update({ where: { id: listing.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

// ── UPDATE STATUS (publish / unpublish / draft) ───────────

exports.updateListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'live', 'unpublished'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store || listing.storeId !== store.id) {
      return res.status(403).json({ error: 'You can only modify your own listings' });
    }

    const updated = await prisma.listing.update({ where: { id: listing.id }, data: { status } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// ── DELETE LISTING ────────────────────────────────────────

exports.deleteListing = async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store || listing.storeId !== store.id) {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }

    await prisma.listing.delete({ where: { id: listing.id } });
    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
};

// ── UPLOAD LISTING IMAGES ─────────────────────────────────

exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store || listing.storeId !== store.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    const uploads = await Promise.all(
      req.files.map((file) =>
        uploadToCloudinary(file.buffer, 'listings', {
          transformation: [{ width: 800, height: 800, crop: 'fill' }],
        })
      )
    );

    const urls = uploads.map((u) => u.secure_url);
    const [mainImage, ...rest] = urls;

    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        mainImage: listing.mainImage || mainImage,
        images: [...listing.images, ...urls],
      },
    });

    res.json({ urls, listing: updated });
  } catch (err) {
    res.status(500).json({ error: 'Image upload failed' });
  }
};
