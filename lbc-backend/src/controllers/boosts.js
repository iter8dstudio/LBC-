// src/controllers/boosts.js
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendEmail, templates } = require('../lib/email');
const { getFrontendBaseUrl } = require('../lib/frontend');

const LISTING_PLANS = {
  weekly:  { amount: 5000,  days: 7,  label: 'Weekly Spotlight' },
  monthly: { amount: 15000, days: 30, label: 'Monthly Growth' },
  premium: { amount: 35000, days: 30, label: 'Premium Presence' },
};

const STORE_PLANS = {
  biweekly: { amount: 10000, days: 14, label: 'Bi-weekly Spotlight' },
  monthly:  { amount: 18000, days: 30, label: 'Monthly Growth' },
  premium:  { amount: 35000, days: 30, label: 'Premium Presence' },
};

const getPlansForTarget = (target) => (target === 'store' ? STORE_PLANS : LISTING_PLANS);

// ── GET BOOST PLANS (public) ──────────────────────────────

exports.getPlans = (req, res) => {
  const target = req.query.target === 'store' ? 'store' : 'listing';
  res.json(getPlansForTarget(target));
};

// ── INITIATE BOOST (vendor) ───────────────────────────────

exports.initiateBoost = async (req, res) => {
  try {
    const { target, plan, listingId } = req.body;
    const frontendBaseUrl = getFrontendBaseUrl();

    if (!target || !plan) {
      return res.status(400).json({ error: 'target and plan are required' });
    }
    const plansForTarget = getPlansForTarget(target);

    if (!plansForTarget[plan]) {
      return res.status(400).json({ error: `Invalid plan for ${target}. Choose: ${Object.keys(plansForTarget).join(', ')}` });
    }
    if (target === 'listing' && !listingId) {
      return res.status(400).json({ error: 'listingId is required when boosting a listing' });
    }

    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    if (target === 'listing') {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing || listing.storeId !== store.id) {
        return res.status(403).json({ error: 'Listing not found or not yours' });
      }
    }

    const planDetails = plansForTarget[plan];
    const reference = `LBC_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create boost record with pending status
    const boost = await prisma.boost.create({
      data: {
        storeId: store.id,
        listingId: target === 'listing' ? listingId : null,
        target,
        plan,
        amount: planDetails.amount,
        paystackRef: reference,
        paymentStatus: 'pending',
        status: 'pending',
      },
    });

    // Initialize Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user.email,
        amount: planDetails.amount * 100, // Paystack uses kobo
        reference,
        metadata: {
          boostId: boost.id,
          storeId: store.id,
          plan,
          target,
          custom_fields: [
            { display_name: 'Plan', value: planDetails.label },
            { display_name: 'Business', value: store.bizName },
          ],
        },
        callback_url: `${frontendBaseUrl}/boost-success`,
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      await prisma.boost.delete({ where: { id: boost.id } });
      return res.status(500).json({ error: 'Failed to initialize payment. Try again.' });
    }

    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference,
      boostId: boost.id,
    });
  } catch (err) {
    console.error('initiateBoost error:', err);
    res.status(500).json({ error: 'Failed to initiate boost' });
  }
};

// ── VERIFY BOOST PAYMENT (frontend callback) ───────────────

exports.verifyBoost = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Payment reference required' });

    const boost = await prisma.boost.findUnique({ where: { paystackRef: reference } });
    if (!boost) return res.status(404).json({ error: 'Boost not found' });
    if (boost.status === 'active') return res.json({ message: 'Boost already active', boost });

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      await prisma.boost.update({
        where: { id: boost.id },
        data: { paymentStatus: 'failed' },
      });
      return res.status(400).json({ error: 'Payment not successful' });
    }

    await activateBoost(boost);

    const updatedBoost = await prisma.boost.findUnique({ where: { id: boost.id } });
    res.json({ message: 'Boost activated successfully', boost: updatedBoost });
  } catch (err) {
    console.error('verifyBoost error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// ── PAYSTACK WEBHOOK (server-to-server) ───────────────────

exports.paystackWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const boost = await prisma.boost.findUnique({
        where: { paystackRef: data.reference },
      });
      if (boost && boost.status === 'pending') {
        await activateBoost(boost);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
};

// ── GET MY BOOSTS (vendor) ────────────────────────────────

exports.getMyBoosts = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const boosts = await prisma.boost.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      include: { listing: { select: { title: true } } },
    });

    res.json(boosts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch boosts' });
  }
};

// ── INTERNAL: Activate a boost ────────────────────────────

async function activateBoost(boost) {
  const plansForTarget = getPlansForTarget(boost.target);
  const plan = plansForTarget[boost.plan] || LISTING_PLANS[boost.plan];
  if (!plan) {
    throw new Error(`Unknown boost plan: ${boost.plan}`);
  }
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.days * 24 * 60 * 60 * 1000);

  await prisma.boost.update({
    where: { id: boost.id },
    data: {
      paymentStatus: 'successful',
      status: 'active',
      startDate,
      endDate,
    },
  });

  // Mark target as sponsored
  if (boost.target === 'listing' && boost.listingId) {
    await prisma.listing.update({
      where: { id: boost.listingId },
      data: { sponsored: true },
    });
  } else {
    await prisma.store.update({
      where: { id: boost.storeId },
      data: { sponsored: true },
    });
  }

  // Send confirmation email
  const store = await prisma.store.findUnique({
    where: { id: boost.storeId },
    include: { user: true },
  });

  if (store?.user) {
    const tpl = templates.boostConfirmed(
      store.user.name,
      plan.label,
      endDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    );
    await sendEmail({ to: store.user.email, ...tpl });
  }
}
