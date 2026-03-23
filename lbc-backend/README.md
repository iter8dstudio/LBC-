# LBC Backend — Lekki Business Connect API

Node.js + Express + PostgreSQL + Prisma backend for the LBC marketplace platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | PostgreSQL (via Railway) |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens) |
| Images | Cloudinary |
| Payments | Paystack |
| Email | Nodemailer (SMTP) |

---

## Project Structure

```
lbc-backend/
├── prisma/
│   ├── schema.prisma       # All database models
│   └── seed.js             # Test data seeder
├── src/
│   ├── index.js            # Express server entry point
│   ├── lib/
│   │   ├── prisma.js       # Prisma client singleton
│   │   ├── cloudinary.js   # Cloudinary config
│   │   └── email.js        # Email templates + sender
│   ├── middleware/
│   │   ├── auth.js         # JWT verification middleware
│   │   └── upload.js       # Multer + Cloudinary upload
│   ├── controllers/
│   │   ├── auth.js         # Register, login, OTP, password reset
│   │   ├── stores.js       # Store CRUD + image uploads
│   │   ├── listings.js     # Listing CRUD + image uploads
│   │   ├── boosts.js       # Paystack payment + boost activation
│   │   ├── analytics.js    # Event tracking + dashboard stats
│   │   ├── users.js        # Profile, password, wishlist
│   │   └── misc.js         # Health, categories, contact, report
│   └── routes/
│       ├── auth.js
│       ├── stores.js
│       ├── listings.js
│       ├── boosts.js
│       ├── analytics.js
│       ├── users.js
│       └── misc.js
├── .env.example            # Environment variable template
├── .gitignore
└── package.json
```

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/lbc.git
cd lbc/backend
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values. At minimum for local development:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/lbc"
JWT_SECRET="any-random-string-at-least-32-chars"
FRONTEND_URL="http://localhost:5500"
```

### 3. Set up local PostgreSQL

Option A — Install PostgreSQL locally:
```bash
# Mac
brew install postgresql && brew services start postgresql
createdb lbc

# Ubuntu
sudo apt install postgresql
sudo -u postgres createdb lbc
```

Option B — Use Docker:
```bash
docker run --name lbc-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=lbc -p 5432:5432 -d postgres
```

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Seed the database

```bash
npm run db:seed
```

This creates 3 test accounts:
- **Admin:** `admin@lbc.ng` / `admin123`
- **Vendor:** `demo@lbc.ng` / `vendor123`
- **Buyer:** `buyer@lbc.ng` / `buyer123`

### 6. Start the server

```bash
npm run dev      # Development (with auto-restart)
npm start        # Production
```

Server runs on `http://localhost:3000`

### 7. Email OTP behavior in development

- Verification emails are sent through the configured SMTP provider.
- For local testing, if SMTP is unreachable or credentials are invalid, the API still creates the account and logs the OTP in the server console.
- You can also fetch the current email OTP in non-production environments with:

```bash
GET /api/auth/dev/email-otp?userId=<user-id>
GET /api/auth/dev/email-otp?email=user@example.com
```

- This route is disabled automatically when `NODE_ENV=production`.

---

## Deploying to Railway (Production)

### Step 1 — Create Railway account

Go to [railway.app](https://railway.app) and sign up with your GitHub account.

### Step 2 — Create a new project

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Choose your `lbc` repository
4. Set the **Root Directory** to `backend`
5. Railway will auto-detect Node.js

### Step 3 — Add PostgreSQL database

1. In your Railway project, click **+ New**
2. Select **Database → Add PostgreSQL**
3. Railway creates the database and automatically sets `DATABASE_URL` in your environment

### Step 4 — Add environment variables

In Railway → your backend service → **Variables**, add:

```
NODE_ENV=production
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=https://your-netlify-app.netlify.app

CLOUDINARY_CLOUD_NAME=<from cloudinary.com dashboard>
CLOUDINARY_API_KEY=<from cloudinary.com dashboard>
CLOUDINARY_API_SECRET=<from cloudinary.com dashboard>

PAYSTACK_SECRET_KEY=sk_live_<from dashboard.paystack.com>
PAYSTACK_PUBLIC_KEY=pk_live_<from dashboard.paystack.com>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@lbc.ng
SMTP_PASS=<Gmail App Password>
EMAIL_FROM=LBC <noreply@lbc.ng>
```

> **Note:** `DATABASE_URL` is set automatically by Railway when you add PostgreSQL.

### Step 5 — Run migrations on deploy

In Railway → your backend service → **Settings → Deploy**, set the **Start Command** to:

```
npx prisma migrate deploy && node src/index.js
```

This runs migrations automatically every time you deploy.

### Step 6 — Get your API URL

Once deployed, Railway gives you a URL like:
```
https://lbc-backend-production.up.railway.app
```

Copy this URL — you'll need it to connect the frontend.

### Step 7 — Connect the frontend

In your `lbc-frontend/index.html`, find the `API_BASE` constant (or add it near the top of the script):

```javascript
const API_BASE = 'https://lbc-backend-production.up.railway.app/api';
```

Then replace all mock data calls with real fetch calls to this URL.

### Step 8 — Configure Paystack Webhook

1. Go to [dashboard.paystack.com](https://dashboard.paystack.com)
2. Settings → API Keys & Webhooks
3. Set webhook URL to: `https://lbc-backend-production.up.railway.app/api/boosts/webhook`

### Step 9 — Seed production data (optional)

From your local machine with production `DATABASE_URL`:
```bash
DATABASE_URL="<your Railway DATABASE_URL>" npm run db:seed
```

---

## API Reference

### Base URL
```
https://lbc-backend-production.up.railway.app/api
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Endpoints Summary

#### Auth — `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create account |
| POST | `/verify-email` | No | Verify email OTP |
| POST | `/resend-otp` | No | Resend email OTP |
| POST | `/login` | No | Sign in |
| POST | `/refresh` | No | Refresh access token |
| POST | `/logout` | Yes | Sign out |
| POST | `/send-phone-otp` | Yes | Send phone OTP |
| POST | `/verify-phone` | Yes | Verify phone OTP |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password` | No | Set new password |

#### Stores — `/api/stores`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | List all stores |
| GET | `/:slug` | No | Get store by slug |
| GET | `/me` | Vendor | Get my store |
| POST | `/` | Yes | Create store |
| PATCH | `/me` | Vendor | Update store |
| POST | `/me/logo` | Vendor | Upload logo |
| POST | `/me/banner` | Vendor | Upload banner |
| POST | `/me/request-verification` | Vendor | Request verified badge |

#### Listings — `/api/listings`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Search listings |
| GET | `/:id` | No | Get listing |
| GET | `/store/:storeId` | No | Get store listings |
| GET | `/me` | Vendor | Get my listings |
| POST | `/` | Vendor | Create listing |
| PATCH | `/:id` | Vendor | Update listing |
| PATCH | `/:id/status` | Vendor | Change status |
| DELETE | `/:id` | Vendor | Delete listing |
| POST | `/:id/images` | Vendor | Upload images |

#### Boosts — `/api/boosts`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plans` | No | Get boost plans |
| GET | `/me` | Vendor | Get my boosts |
| POST | `/initiate` | Vendor | Start Paystack payment |
| POST | `/verify` | Vendor | Verify payment |
| POST | `/webhook` | No | Paystack webhook |

#### Analytics — `/api/analytics`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/listing/:id/event` | No | Track listing event |
| POST | `/store/:id/event` | No | Track store event |
| GET | `/me/overview` | Vendor | Dashboard overview stats |
| GET | `/me/listings` | Vendor | Per-listing analytics |
| GET | `/me/chart` | Vendor | Chart data |

#### Users — `/api/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Yes | Get profile |
| PATCH | `/me` | Yes | Update profile |
| PATCH | `/me/password` | Yes | Change password |
| PATCH | `/me/notifications` | Yes | Update notifications |
| GET | `/me/wishlist` | Yes | Get wishlist |
| POST | `/me/wishlist/:listingId` | Yes | Add to wishlist |
| DELETE | `/me/wishlist/:listingId` | Yes | Remove from wishlist |

#### Misc — `/api`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/categories` | No | All categories |
| GET | `/locations` | No | All Lagos locations |
| POST | `/contact` | No | Contact form |
| POST | `/report` | No | Report a business |

---

## Database Management

```bash
# Open Prisma Studio (visual database browser)
npm run db:studio

# Create a new migration after schema changes
npx prisma migrate dev --name describe_your_change

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-generate Prisma client after schema changes
npx prisma generate
```

---

## Notes for Production

1. **SMS OTP** — The `/auth/send-phone-otp` endpoint currently logs the OTP to console. In production, integrate with [Termii](https://termii.com) or [Africa's Talking](https://africastalking.com) for Nigerian SMS delivery.

2. **Email** — Gmail SMTP works for low volume. For production scale, switch to [Resend](https://resend.com) or [Mailgun](https://mailgun.com).

3. **Boost expiry** — Set up a cron job or Railway's scheduled jobs to run daily and expire boosts past their `endDate`. Update `status: 'expired'` and set `sponsored: false` on the related listing/store.

4. **Image CDN** — Cloudinary free tier gives 25GB storage and 25GB bandwidth/month — sufficient for MVP launch.

---

## License

Private — Lekki Business Connect © 2026
