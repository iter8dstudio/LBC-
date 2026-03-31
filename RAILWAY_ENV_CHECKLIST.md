# Railway Environment Variable Checklist

**Project**: LBC (Lekki Business Connect)  
**Backend**: Node.js + Express + PostgreSQL  
**Deployment**: Railway.app  
**Last Updated**: March 31, 2026

---

## Pre-Deployment Verification

- [ ] Railway account created and logged in
- [ ] GitHub repository connected to Railway
- [ ] New Railway project created
- [ ] PostgreSQL database provisioned in Railway
- [ ] Database migration completed successfully
- [ ] `railway.json` configuration is correct
- [ ] Backend code committed to main/production branch

---

## Environment Variables to Set in Railway Dashboard

### 1. DATABASE
**Category**: Critical | **Source**: Railway PostgreSQL  
**Instructions**: Railway provides this automatically when you provision PostgreSQL

- [ ] **DATABASE_URL**
  - Value: `postgresql://user:password@host:port/database`
  - Source: Copy from Railway PostgreSQL plugin
  - Example format: `postgresql://postgres:YourPassword@db.railway.app:5432/railway`

---

### 2. FRONTEND URLS
**Category**: Configuration | **Sensitivity**: Public

- [ ] **FRONTEND_URL**
  - Current: `http://localhost:3000`
  - Production: Update to your development/staging frontend URL
  - Purpose: Local development and testing

- [ ] **FRONTEND_URL_PROD**
  - Current: `https://yourdomain.com`
  - **Action Required**: Replace with your actual production domain
  - Purpose: CORS whitelisting for production frontend
  - Example: `https://lbc.netlify.app` or your custom domain

---

### 3. JWT SECRETS
**Category**: Critical | **Sensitivity**: 🔐 HIGHLY SENSITIVE  
**Rotation**: Should be rotated regularly (every 90 days recommended)

- [ ] **ACCESS_TOKEN_SECRET**
  - Current length: 64+ characters (✓ Secure)
  - Minimum: 32 characters
  - **Action**: Keep current or generate new random secret
  - Generation: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

- [ ] **REFRESH_TOKEN_SECRET**
  - Current length: 64+ characters (✓ Secure)
  - Minimum: 32 characters
  - **Action**: Keep current or generate new random secret
  - Generation: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

- [ ] **JWT_EXPIRES_IN**
  - Current: `10d` (10 days for refresh tokens)
  - Recommended for production: `15m` (15 minutes for access tokens) or keep as is for refresh
  - Note: Already hardened in code to 15 minutes for access tokens

- [ ] **JWT_REFRESH_EXPIRES_IN**
  - Current: `30d` (30 days)
  - Recommended for production: `7d` or `14d` (shorter for higher security)
  - Adjust based on UX requirements

---

### 4. CLOUDINARY (Image Management)
**Category**: External Service | **Sensitivity**: Medium  
**Purpose**: Image upload, transformation, and delivery

- [ ] **CLOUDINARY_NAME**
  - Current: `dbdklwnht`
  - **Action**: Verify or replace with production Cloudinary account name
  - Sign up: https://cloudinary.com

- [ ] **CLOUDINARY_API_KEY**
  - Current: `265865655897788`
  - **Action**: Replace with production API key from Cloudinary Dashboard
  - Location: Cloudinary → Settings → API Keys
  - Sensitivity: Treat as semi-sensitive

- [ ] **CLOUDINARY_API_SECRET**
  - Current: `KdKbfH6RRY_LqYhLorlH_38JuUo`
  - **Action**: Replace with production API secret
  - **⚠️ NEVER commit this!**
  - Sensitivity: 🔐 HIGHLY SENSITIVE

- [ ] **CLOUDINARY_UPLOAD_FOLDER**
  - Current: `lbc`
  - Purpose: Organize uploaded images in subfolders
  - Recommended: `lbc` or `lbc-prod` for production

---

### 5. PAYSTACK (Payment Processing)
**Category**: Payment Gateway | **Sensitivity**: 🔐 HIGHLY SENSITIVE  
**Purpose**: Payment collection and webhook verification

- [ ] **PAYSTACK_PUBLIC_KEY**
  - Current: `pk_test_5474d2178833c08491769ff593423a696e94feac` (Test key)
  - **Action**: Replace with production public key (`pk_live_...`)
  - Location: Paystack Dashboard → API Keys & Webhooks
  - Note: Test vs. Live distinction is critical

- [ ] **PAYSTACK_SECRET_KEY**
  - Current: `sk_test_b7ec433b9810f5f77d48dd8ced9887591274dd16` (Test key)
  - **Action**: Replace with production secret key (`sk_live_...`)
  - **⚠️ NEVER commit this!**
  - Sensitivity: 🔐 HIGHLY SENSITIVE
  - Test vs. Live: Make sure you use LIVE keys for production

- [ ] **PAYSTACK_WEBHOOK_SECRET**
  - Current: `https://testlbc-production.up.railway.app/api/paystack/webhook`
  - **Action**: This should be a secret string, not the webhook URL
  - Recommended value: Generate a random secret for webhook signature verification
  - Generation: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Location in Paystack: Dashboard → Settings → API Keys & Webhooks → Webhook Signing Secret

---

### 6. EMAIL (Nodemailer Configuration)
**Category**: External Service | **Sensitivity**: Medium  
**Purpose**: Transactional emails (password reset, notifications, etc.)

- [ ] **EMAIL_HOST**
  - Current: `smtp.gmail.com`
  - Recommended for production:
    - Gmail: `smtp.gmail.com`
    - SendGrid: `smtp.sendgrid.net`
    - Custom SMTP: Your email provider's SMTP server
  - Port: Usually 587 or 465

- [ ] **EMAIL_PORT**
  - Current: `587` (TLS)
  - Alternative: `465` (SSL)
  - Recommended: `587` with TLS

- [ ] **EMAIL_USER**
  - Current: `admin@lbc.ng`
  - **Action**: Use your production email account
  - Note: Should be a dedicated noreply or admin email, not personal

- [ ] **EMAIL_PASS**
  - Current: `0m5uxv1Sle0B5qCv9mgPIpY67NWLEmh5tHgG4tf9y0D7GELMH3QXQxZHau0dnOx6`
  - **⚠️ NEVER commit this!**
  - Sensitivity: 🔐 HIGHLY SENSITIVE
  - For Gmail: Generate App-Specific Password (not regular password)
  - Location: Google Account → Security → App passwords
  - Copy the exact format provided by Google

- [ ] **EMAIL_FROM**
  - Current: `noreply@lbc.com`
  - **Action**: Update to match your domain
  - Format: `noreply@yourdomain.com` or `support@yourdomain.com`

---

### 7. SERVER CONFIGURATION
**Category**: Runtime | **Sensitivity**: Public

- [ ] **PORT**
  - Current: `8000`
  - Railway default: Uses `$PORT` environment variable
  - **Note**: Railway auto-assigns ports; set to `$PORT` or let Railway override
  - Recommended for Railway: Use `$PORT` or remove (Railway sets automatically)

- [ ] **NODE_ENV**
  - Current: `development`
  - **Action for Production**: Change to `production`
  - Important: This triggers security optimizations and disables debug logging
  - Options: `development`, `staging`, `production`

---

## Railway Dashboard Setup Steps

### Step 1: Access Environment Variables
1. Go to Railway Dashboard
2. Select your LBC project
3. Click on the backend service
4. Click "Variables" tab

### Step 2: Add Variables
1. For each variable in sections above:
   - Click "Add Variable"
   - Enter the key (e.g., `DATABASE_URL`)
   - Enter/paste the value
   - Click "Add"

### Step 3: Database Connection
1. If using Railway PostgreSQL plugin:
   - Railway automatically injects `DATABASE_URL`
   - Verify it appears in your variables
   - No manual action needed

### Step 4: Critical Review Checklist
Before deployment, verify:

**Security Check:**
- [ ] No test API keys left for production (all `pk_test_`, `sk_test_`)
- [ ] Sensitive values masked in Railway dashboard (shown as `•••••`)
- [ ] `.env` file NOT committed to Git
- [ ] `.env.example` committed instead (without secrets)

**Configuration Check:**
- [ ] `FRONTEND_URL_PROD` points to actual production domain
- [ ] `NODE_ENV` set to `production`
- [ ] All external service credentials updated for production
- [ ] Email configuration tested
- [ ] Paystack using LIVE keys (not test keys)

**Connectivity Check:**
- [ ] DATABASE_URL connects successfully
- [ ] Cloudinary credentials valid
- [ ] Paystack credentials valid
- [ ] Email service connectivity tested

---

## Sensitive Variables Comparison: Dev vs Production

| Variable | Dev Value Type | Production Value Type | Change Required |
|----------|----------------|-----------------------|-----------------|
| DATABASE_URL | Local/Test DB | Railway PostgreSQL | ✓ Yes |
| FRONTEND_URL_PROD | yourdomain.com | Actual prod domain | ✓ Yes |
| ACCESS_TOKEN_SECRET | Dev secret | New random secret | Consider |
| REFRESH_TOKEN_SECRET | Dev secret | New random secret | Consider |
| CLOUDINARY_* | Test account | Production account | ✓ Yes |
| PAYSTACK_PUBLIC_KEY | `pk_test_...` | `pk_live_...` | ✓ Yes |
| PAYSTACK_SECRET_KEY | `sk_test_...` | `sk_live_...` | ✓ Yes |
| EMAIL_USER | admin@lbc.ng | Production email | ✓ Yes |
| EMAIL_PASS | Test password | Production app-password | ✓ Yes |
| NODE_ENV | development | production | ✓ Yes |

---

## Secret Rotation & Expiration Policy

### JWT Secrets
- **Rotation Schedule**: Every 90 days (quarterly)
- **Process**: Generate new secrets, deploy new version, monitor logs
- **No user logout required**: Old tokens still valid until expiry

### External Service Credentials
- **Paystack Keys**: Rotate as per compliance requirements (usually annually)
- **Cloudinary Keys**: Regenerate if compromised
- **Email Password**: Change when service provider requires

### Database Credentials
- **Policy**: Change if password exposure suspected
- **Railway**: Use Railway's built-in password management

---

## Post-Deployment Verification

After deploying to Railway, verify everything works:

- [ ] Backend service deployed successfully
- [ ] Health check endpoint responds (`/api/health`)
- [ ] Database migrations ran automatically
- [ ] Authentication endpoints working (login/register)
- [ ] Image upload working (Cloudinary)
- [ ] Payments processing correctly (Paystack test transaction)
- [ ] Emails sending correctly (password reset flow)
- [ ] CORS errors resolved for frontend
- [ ] No 500 errors in Railway logs
- [ ] Access tokens expiring after 15 minutes
- [ ] Refresh tokens working correctly

---

## Troubleshooting

### "DATABASE_URL not set"
- Solution: Add DATABASE_URL to Railway Variables
- Verify: Railway PostgreSQL plugin is provisioned

### "CORS errors from frontend"
- Check: FRONTEND_URL_PROD matches your frontend domain
- Verify: Add your frontend domain to CORS whitelist in code

### "Emails not sending"
- Check: EMAIL_USER and EMAIL_PASS correct
- For Gmail: Use App-Specific Password (not regular password)
- Verify: SMTP port matches provider (usually 587)

### "Paystack webhook not updating"
- Check: PAYSTACK_WEBHOOK_SECRET is set correctly
- Verify: Webhook URL registered in Paystack dashboard
- Test: Use Paystack test transactions first

### "Token validation failing"
- Check: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET match deployment
- Verify: JWT secrets haven't been rotated without redeploy
- Solution: Clear browser cookies and retry

---

## Security Best Practices

✅ **DO:**
- Store all secrets in Railway Variables (not .env file)
- Use strong random secrets (32+ characters)
- Rotate secrets quarterly
- Review Railway logs for suspicious activity
- Use HTTPS for all external communications
- Keep dependencies updated

❌ **DON'T:**
- Commit `.env` file to Git
- Use test API keys in production
- Reuse secrets across environments
- Share secrets via email or chat
- Log sensitive values
- Hardcode secrets in code

---

## Quick Reference: Variable Count

**Total Variables**: 24  
**Critical/Sensitive**: 8  
**External Services**: 9  
**Configuration**: 4  
**Server**: 3

---

**Status**: Ready for Railway Deployment  
**All Required**: ✓ Identified and listed  
**Next Step**: Update production values and deploy to Railway
