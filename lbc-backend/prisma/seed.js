// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding LBC database...\n');

  // ── 1. ADMIN USER ──────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lbc.ng' },
    update: {},
    create: {
      name: 'LBC Admin',
      email: 'admin@lbc.ng',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: true,
      phoneVerified: true,
      notifications: { create: {} },
    },
  });
  console.log('✓ Admin user:', admin.email);

  // ── 2. DEMO VENDOR ─────────────────────────────────────
  const vendorPassword = await bcrypt.hash('vendor123', 12);
  const vendor = await prisma.user.upsert({
    where: { email: 'demo@lbc.ng' },
    update: {},
    create: {
      name: 'Demo Vendor',
      email: 'demo@lbc.ng',
      password: vendorPassword,
      phone: '08012345678',
      role: 'VENDOR',
      emailVerified: true,
      phoneVerified: true,
      notifications: { create: {} },
    },
  });
  console.log('✓ Demo vendor:', vendor.email);

  // ── 3. DEMO STORE ──────────────────────────────────────
  const demoStore = await prisma.store.upsert({
    where: { slug: 'atelier-co' },
    update: {},
    create: {
      userId: vendor.id,
      bizName: "Atelier & Co.",
      slug: 'atelier-co',
      category: 'fashion',
      location: 'Lekki Phase 1',
      bizPhone: '08012345678',
      bizEmail: 'hello@atelierco.ng',
      whatsapp: '2348012345678',
      bizDesc: "Lagos's premier fashion boutique offering curated contemporary and Afrocentric designs. We pride ourselves on quality fabrics, expert tailoring, and fast delivery across Lekki and beyond.",
      verified: true,
      sponsored: true,
    },
  });
  console.log('✓ Demo store:', demoStore.bizName);

  // ── 4. SAMPLE LISTINGS ─────────────────────────────────
  const listings = [
    {
      storeId: demoStore.id,
      title: 'Cartier Santos Wristwatch',
      price: 850000,
      type: 'physical',
      category: 'fashion',
      location: 'Lekki Phase 1',
      description: 'Authentic Cartier Santos stainless steel wristwatch. Original box and papers included. Available for pickup or delivery within Lagos.',
      mainImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
      status: 'live',
      sponsored: true,
      views: 423,
    },
    {
      storeId: demoStore.id,
      title: 'Ankara Print Mini Dress',
      price: 28500,
      type: 'physical',
      category: 'fashion',
      location: 'Lekki Phase 1',
      description: 'Hand-stitched Ankara mini dress. Custom sizing available. 5–7 day turnaround.',
      mainImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop',
      status: 'live',
      sponsored: false,
      views: 211,
    },
    {
      storeId: demoStore.id,
      title: 'Personal Shopping Session (2hrs)',
      price: 35000,
      type: 'service',
      category: 'services',
      location: 'Lekki Phase 1',
      description: 'We shop for you! Book a 2-hour personal styling and shopping session in Lekki.',
      mainImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=400&fit=crop',
      status: 'live',
      sponsored: false,
      views: 98,
    },
    {
      storeId: demoStore.id,
      title: 'Brand Identity Kit',
      price: 55000,
      type: 'digital',
      category: 'digital',
      location: 'Remote / Online',
      description: 'Logo, colour palette, brand guide & all files. Delivered in 5 business days.',
      mainImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop',
      status: 'draft',
      sponsored: false,
      views: 0,
    },
  ];

  for (const listing of listings) {
    await prisma.listing.create({ data: listing });
  }
  console.log(`✓ ${listings.length} sample listings created`);

  // ── 5. DEMO BUYER ──────────────────────────────────────
  const buyerPassword = await bcrypt.hash('buyer123', 12);
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@lbc.ng' },
    update: {},
    create: {
      name: 'Test Buyer',
      email: 'buyer@lbc.ng',
      password: buyerPassword,
      role: 'BUYER',
      emailVerified: true,
      phoneVerified: false,
      notifications: { create: {} },
    },
  });
  console.log('✓ Demo buyer:', buyer.email);

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts:');
  console.log('  Admin:  admin@lbc.ng  / admin123');
  console.log('  Vendor: demo@lbc.ng   / vendor123');
  console.log('  Buyer:  buyer@lbc.ng  / buyer123\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
