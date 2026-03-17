// src/controllers/analytics.js
const prisma = require('../lib/prisma');

// ── TRACK LISTING EVENT (public) ─────────────────────────

exports.trackListingEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { event } = req.body; // 'view' | 'wa_click' | 'phone_reveal'
    const validEvents = ['view', 'wa_click', 'phone_reveal'];

    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: `Event must be one of: ${validEvents.join(', ')}` });
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    await prisma.listingAnalytic.create({
      data: { listingId: id, event, source: req.body.source || 'direct' },
    });

    if (event === 'wa_click') {
      await prisma.listing.update({ where: { id }, data: { waClicks: { increment: 1 } } });
    }
    if (event === 'view') {
      await prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track event' });
  }
};

// ── TRACK STORE EVENT (public) ────────────────────────────

exports.trackStoreEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { event } = req.body;
    const validEvents = ['view', 'wa_click', 'phone_reveal'];

    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: `Event must be one of: ${validEvents.join(', ')}` });
    }

    await prisma.storeAnalytic.create({
      data: { storeId: id, event, source: req.body.source || 'direct' },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track event' });
  }
};

// ── OVERVIEW STATS (vendor dashboard) ────────────────────

exports.getOverview = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalListings,
      liveListings,
      profileViews,
      waClicks,
      activeBoosts,
      recentViews,
    ] = await Promise.all([
      prisma.listing.count({ where: { storeId: store.id } }),
      prisma.listing.count({ where: { storeId: store.id, status: 'live' } }),
      prisma.storeAnalytic.count({ where: { storeId: store.id, event: 'view' } }),
      prisma.storeAnalytic.count({ where: { storeId: store.id, event: 'wa_click' } }),
      prisma.boost.count({ where: { storeId: store.id, status: 'active' } }),
      prisma.storeAnalytic.count({ where: { storeId: store.id, event: 'view', createdAt: { gte: weekAgo } } }),
    ]);

    res.json({
      totalListings,
      liveListings,
      profileViews,
      waClicks,
      activeBoosts,
      recentViews,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
};

// ── PER-LISTING ANALYTICS (vendor dashboard) ──────────────

exports.getListingAnalytics = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const listings = await prisma.listing.findMany({
      where: { storeId: store.id },
      select: {
        id: true, title: true, status: true, views: true, waClicks: true,
        mainImage: true, price: true, type: true,
      },
      orderBy: { views: 'desc' },
    });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing analytics' });
  }
};

// ── CHART DATA (vendor dashboard) ────────────────────────

exports.getChartData = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const { period = 'monthly' } = req.query;
    const now = new Date();

    // Build date buckets
    let buckets = [];
    if (period === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        buckets.push({ label: d.toLocaleDateString('en-NG', { weekday: 'short' }), date: d });
      }
    } else if (period === 'weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        buckets.push({ label: `Week ${4 - i}`, date: d });
      }
    } else {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ label: d.toLocaleDateString('en-NG', { month: 'short' }), date: d });
      }
    }

    // Fetch all store analytics for the period
    const since = buckets[0].date;
    const analytics = await prisma.storeAnalytic.findMany({
      where: { storeId: store.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    // Group into buckets
    const views = buckets.map(() => 0);
    const waClicks = buckets.map(() => 0);

    analytics.forEach((a) => {
      const idx = buckets.findIndex((b, i) => {
        const next = buckets[i + 1];
        return a.createdAt >= b.date && (!next || a.createdAt < next.date);
      });
      if (idx >= 0) {
        if (a.event === 'view') views[idx]++;
        if (a.event === 'wa_click') waClicks[idx]++;
      }
    });

    res.json({
      labels: buckets.map((b) => b.label),
      views,
      waClicks,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};
