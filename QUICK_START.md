# LBC - QUICK START GUIDE

## TL;DR - Get Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- PostgreSQL (local or Railway account)
- Postman desktop app
- Git
- Cloudinary account (free tier ok)
- Paystack account (test mode)

---

## STEP 1: Clone & Install (2 minutes)

```powershell
cd C:\Users\Page\Desktop
git clone https://github.com/iter8dstudio/LBC-.git LBC-backend
cd LBC-backend
npm install
```

---

## STEP 2: Set Up .env File (1 minute)

Create `.env` in `lbc-backend/`:

```env
# Database - Use Railway or local PostgreSQL
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/lbc

# Frontend
FRONTEND_URL=http://localhost:3000

# JWT - Use strong secrets (32+ characters)
ACCESS_TOKEN_SECRET=your-super-secret-key-12345678901234567890
REFRESH_TOKEN_SECRET=your-refresh-secret-key-12345678901234567890

# External Services (get from their dashboards)
CLOUDINARY_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLOUDINARY_UPLOAD_FOLDER=lbc

PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_WEBHOOK_SECRET=your_secret

# Email (Gmail: use app password, not main password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=noreply@lbc.com

# Server
PORT=5000
NODE_ENV=development
```

---

## STEP 3: Database Setup (1 minute)

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

**Verify:**
```powershell
npm run db:studio
# Opens http://localhost:5555 - check if tables exist
```

---

## STEP 4: Start Backend (30 seconds)

```powershell
npm run dev
```

You should see:
```
✓ Server running on http://localhost:5000
```

---

## STEP 5: Import Postman Collection (30 seconds)

1. Open Postman
2. **File** → **Import**
3. Select: `LBC_API_Postman_Collection.json`
4. Create environment "LBC-Dev" with variables:
   ```
   API_BASE_URL: http://localhost:5000/api
   ```

---

## STEP 6: Test First Endpoint

1. In Postman, go to **AUTH** → **Register User**
2. Click **Send**
3. Check response: Should see `accessToken` and `refreshToken` ✓

---

## Common Issues & Fixes

### ❌ "ECONNREFUSED" Database Error
```powershell
# Install/start PostgreSQL
# Or use Railway: https://railway.app

# Verify connection
psql -U postgres -d lbc
```

### ❌ "Cannot find module" or npm errors
```powershell
# Delete node_modules and reinstall
rmdir /s node_modules
npm install
```

### ❌ Port 5000 already in use
```powershell
# Find and kill process
netstat -ano | findstr :5000
taskkill /PID {PID} /F

# Or use different port
# Edit .env: PORT=5001
```

### ❌ CORS errors in frontend
1. Verify `FRONTEND_URL` in `.env` matches your frontend domain
2. Restart backend: `npm run dev`
3. Check browser console for exact error

---

## Next Steps

1. **Import Postman Collection** → Test all endpoints
2. **Connect Frontend** → Update API URLs in HTML
3. **Test User Flows** → Register, Login, Create Store, List Product
4. **Deploy** → Railway (backend) + Netlify (frontend)

---

## File Structure Reference

```
lbc-backend/
├── .env                 ← YOUR CONFIG (create this!)
├── src/
│   ├── index.js        ← Server entry point
│   ├── controllers/    ← Business logic
│   ├── routes/         ← API endpoints
│   ├── middleware/     ← Auth, upload
│   └── lib/            ← Cloudinary, email, Prisma
├── prisma/
│   ├── schema.prisma   ← Database models
│   └── seed.js         ← Test data
└── package.json        ← Dependencies
```

---

## Environment Variables Cheat Sheet

| Variable | Where to Get | Purpose |
|----------|-------------|---------|
| DATABASE_URL | Railway dashboard or local PostgreSQL | Database connection |
| CLOUDINARY_* | cloudinary.com → settings | Image uploads |
| PAYSTACK_* | paystack.com → settings | Payment processing |
| EMAIL_* | Gmail account settings | Sending emails |
| JWT_SECRETS | Generate random (32+ chars) | Token encryption |

---

## Useful Commands

```powershell
# Development
npm run dev                # Start with auto-reload

# Database
npm run db:generate        # Regenerate Prisma client
npm run db:migrate         # Apply migrations
npm run db:seed            # Populate test data
npm run db:studio          # Visual database editor (http://localhost:5555)

# Production
npm run start               # Regular start (no reload)
```

---

## Test as You Go Checklist

After each phase, verify:

- [ ] Backend starts without errors
- [ ] Database tables exist (check with `npm run db:studio`)
- [ ] Register endpoint works in Postman (save the tokens!)
- [ ] Can create store with saved token
- [ ] Can create listing under store
- [ ] Frontend loads without 404 errors
- [ ] Frontend API calls connect to backend

---

## Get Help

- **Backend Issues**: Check `npm run dev` console output
- **Database Issues**: Try `npm run db:migrate` again
- **API Issues**: Look at response body in Postman
- **Frontend Issues**: Check browser DevTools Network/Console tabs

---

Created: 2026-03-22
Ready: ✅ Start now!
