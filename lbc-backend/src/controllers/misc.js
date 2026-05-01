// src/controllers/misc.js
const prisma = require('../lib/prisma');

const scrubText = (value) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/[<>]/g, '')
  .trim();

const CATEGORIES = [
  { id: 'fashion',      label: 'Fashion & Clothing',    icon: '👗' },
  { id: 'beauty',       label: 'Beauty & Wellness',      icon: '💄' },
  { id: 'food',         label: 'Food & Restaurants',     icon: '🍔' },
  { id: 'electronics',  label: 'Electronics',            icon: '📱' },
  { id: 'phones',       label: 'Phones & Tablets',       icon: '📱' },
  { id: 'automotive',   label: 'Automotive',             icon: '🚗' },
  { id: 'furniture',    label: 'Furniture & Home',       icon: '🛋️' },
  { id: 'services',     label: 'Services',               icon: '🔧' },
  { id: 'digital',      label: 'Digital Products',       icon: '💾' },
  { id: 'health',       label: 'Health & Pharmacy',      icon: '💊' },
  { id: 'education',    label: 'Education & Training',   icon: '📚' },
];

const LOCATIONS = [
  'Lekki Phase 1','Lekki Phase 2','Lekki Phase 3','Lekki Phase 4','Lekki Phase 5',
  'Ajah','Abraham Adesanya','Sangotedo','Awoyaya','Lakowe','Bogije','Shapati','Ibeju-Lekki',
  'Victoria Island','VI Extension','Oniru','Eti-Osa',
  'Ikoyi','Osborne','Old Ikoyi','Parkview Estate',
  'Chevron','Oral Estate','Idado','Agungi','Jakande','Ikate','Ilasan',
  'Yaba','Surulere','Gbagada','Maryland','Ojota','Ketu','Alapere',
  'Ikeja','Allen Avenue','Oregun','Alausa','Ogba',
  'Agege','Pen Cinema','Abule Egba','Ifako-Ijaiye',
  'Lagos Island','Balogun','Marina','Obalende','Broad Street',
  'Apapa','Ajegunle','Festac','Satellite Town',
  'Badagry','Iganmu','Orile','Mile 2','Ojo',
  'Mushin','Oshodi','Isolo','Ejigbo','Ago Palace Way','Okota',
  'Shomolu','Bariga','Onipanu',
  'Epe','Ikorodu','Benson','Odogunyan','Imota',
  'Magodo','Berger','Isheri','Ojodu','Omole Phase 1','Omole Phase 2',
  'Anthony Village','Palm Grove','Fadeyi',
  'Remote / Online',
];

// ── HEALTH CHECK ──────────────────────────────────────────

exports.health = (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'LBC API' });
};

// ── CATEGORIES & LOCATIONS ────────────────────────────────

exports.getCategories = (req, res) => res.json(CATEGORIES);
exports.getLocations  = (req, res) => res.json(LOCATIONS);

// ── CONTACT FORM ──────────────────────────────────────────

exports.submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }

    await prisma.contactMessage.create({
      data: {
        name: scrubText(name),
        email: scrubText(email),
        subject: scrubText(subject || 'General Enquiry'),
        message: scrubText(message),
      },
    });

    res.json({ message: 'Message received. We will get back to you within 24 hours.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit message' });
  }
};

// ── REPORT A BUSINESS ─────────────────────────────────────

exports.submitReport = async (req, res) => {
  try {
    const { storeName, storeId, reason, details, reporterEmail } = req.body;
    if (!storeName || !reason || !details) {
      return res.status(400).json({ error: 'storeName, reason and details are required' });
    }

    await prisma.report.create({
      data: {
        storeName: scrubText(storeName),
        storeId: storeId ? scrubText(storeId) : null,
        reason: scrubText(reason),
        details: scrubText(details),
        reporterEmail: reporterEmail ? scrubText(reporterEmail) : null,
      },
    });

    res.json({ message: 'Report submitted. Our Trust & Safety team will review within 24 hours.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
};
