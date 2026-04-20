const { z } = require('zod');

const nonEmptyString = (field) => z.string({ required_error: `${field} is required` }).trim().min(1, `${field} is required`);
const optionalTrimmedString = (field, max) => z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().max(max, `${field} is too long`).optional());
const optionalEmailString = (field) => z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().email(`Invalid ${field}`).optional());
const optionalInt = (field) => z.preprocess((value) => {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  return value;
}, z.coerce.number().int().min(0, `${field} cannot be negative`).optional());

const registerSchema = z.object({
  name: nonEmptyString('name').max(100, 'name is too long'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

const verifyEmailSchema = z.object({
  userId: nonEmptyString('userId'),
  otp: z.string().trim().min(4, 'otp is invalid'),
});

const resendOtpSchema = z.object({
  userId: nonEmptyString('userId'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'password is required'),
});

const refreshSchema = z.object({
  refreshToken: nonEmptyString('refreshToken'),
});

const verifyPhoneSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'otp must be a 6-digit code'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  userId: nonEmptyString('userId'),
  token: nonEmptyString('token'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

const createStoreSchema = z.object({
  bizName: nonEmptyString('bizName').max(120, 'bizName is too long'),
  category: nonEmptyString('category').max(64, 'category is too long'),
  location: nonEmptyString('location').max(120, 'location is too long'),
  bizPhone: optionalTrimmedString('bizPhone', 40),
  bizEmail: optionalEmailString('bizEmail'),
  whatsapp: optionalTrimmedString('whatsapp', 40),
  bizDesc: optionalTrimmedString('bizDesc', 5000),
});

const updateStoreSchema = z.object({
  bizName: optionalTrimmedString('bizName', 120),
  category: optionalTrimmedString('category', 64),
  location: optionalTrimmedString('location', 120),
  bizPhone: optionalTrimmedString('bizPhone', 40),
  bizEmail: optionalEmailString('bizEmail'),
  whatsapp: optionalTrimmedString('whatsapp', 40),
  bizDesc: optionalTrimmedString('bizDesc', 5000),
  accentColor: optionalTrimmedString('accentColor', 32),
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

const listingType = z.enum(['physical', 'digital', 'service']);
const listingStatus = z.enum(['draft', 'live', 'unpublished']);

const createListingSchema = z.object({
  title: nonEmptyString('title').max(180, 'title is too long'),
  price: z.coerce.number().positive('price must be greater than 0'),
  type: listingType,
  category: nonEmptyString('category').max(64, 'category is too long'),
  subcategory: optionalTrimmedString('subcategory', 120),
  location: optionalTrimmedString('location', 120),
  description: optionalTrimmedString('description', 5000),
  stock: optionalInt('stock'),
  status: listingStatus.optional(),
});

const updateListingSchema = z.object({
  title: optionalTrimmedString('title', 180),
  price: z.preprocess((value) => {
    if (value === undefined || value === null || String(value).trim() === '') return undefined;
    return value;
  }, z.coerce.number().positive().optional()),
  type: listingType.optional(),
  category: optionalTrimmedString('category', 64),
  subcategory: optionalTrimmedString('subcategory', 120),
  location: optionalTrimmedString('location', 120),
  description: optionalTrimmedString('description', 5000),
  stock: optionalInt('stock'),
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

const updateListingStatusSchema = z.object({
  status: listingStatus,
});

const contactSchema = z.object({
  name: nonEmptyString('name').max(100, 'name is too long'),
  email: z.string().trim().email('Invalid email address'),
  subject: z.string().trim().max(160, 'subject is too long').optional(),
  message: nonEmptyString('message').max(5000, 'message is too long'),
});

const reportSchema = z.object({
  storeName: nonEmptyString('storeName').max(160, 'storeName is too long'),
  storeId: optionalTrimmedString('storeId', 120),
  reason: nonEmptyString('reason').max(160, 'reason is too long'),
  details: nonEmptyString('details').max(5000, 'details is too long'),
  reporterEmail: optionalEmailString('reporterEmail'),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(40).optional(),
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: z.string().min(8, 'newPassword must be at least 8 characters').max(128, 'newPassword is too long'),
});

const updateNotificationsSchema = z.object({
  emailNotif: z.boolean().optional(),
  smsAlert: z.boolean().optional(),
  browserNotif: z.boolean().optional(),
  waLeads: z.boolean().optional(),
  boostExpiry: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

const initiateBoostSchema = z.object({
  target: z.enum(['listing', 'store']),
  plan: z.enum(['weekly', 'biweekly', 'monthly', 'premium']),
  listingId: z.string().trim().optional(),
}).refine((data) => data.target !== 'listing' || !!data.listingId, {
  message: 'listingId is required when target is listing',
  path: ['listingId'],
});

const verifyBoostSchema = z.object({
  reference: nonEmptyString('reference'),
});

const analyticsEventSchema = z.object({
  event: z.enum(['view', 'wa_click', 'phone_reveal']),
  source: z.string().trim().max(64, 'source is too long').optional(),
});

module.exports = {
  registerSchema,
  verifyEmailSchema,
  resendOtpSchema,
  loginSchema,
  refreshSchema,
  verifyPhoneSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createStoreSchema,
  updateStoreSchema,
  createListingSchema,
  updateListingSchema,
  updateListingStatusSchema,
  contactSchema,
  reportSchema,
  updateMeSchema,
  changePasswordSchema,
  updateNotificationsSchema,
  initiateBoostSchema,
  verifyBoostSchema,
  analyticsEventSchema,
};
