# LBC Project - COMPLETE EXECUTION PLAN
## Full Stack Developer Project Workflow

**Project Goal**: Test, connect, review, and deploy a full-stack marketplace app to production

**Timeline**: 1-2 weeks (if working full-time)

---

## 📋 YOU HAVE 3 MAIN DOCUMENTS

### 1. **QUICK_START.md** ← START HERE!
   - 5-minute setup
   - Common issues & fixes
   - Essential commands only
   - **Open this first**

### 2. **DEPLOYMENT_GUIDE.md** ← Complete Reference
   - 7 phases with detailed steps
   - 28 API endpoints to test
   - Postman setup with test variables
   - Frontend integration guide
   - Production deployment steps
   - Troubleshooting section

### 3. **LBC_API_Postman_Collection.json** ← Import this
   - Ready-to-use Postman collection
   - All 28 endpoints
   - Pre-configured environment variables
   - Built-in test scripts
   - Auto-saves tokens for chaining requests

---

## 🚀 YOUR IMMEDIATE ACTION PLAN

### RIGHT NOW (Next 30 minutes)

**1. Gather Your Credentials** (have these ready before starting):

   ```
   CLOUDINARY:
   - Account: https://cloudinary.com (free tier)
   - Get: CLOUDINARY_NAME, API_KEY, API_SECRET
   
   PAYSTACK:
   - Account: https://paystack.com (test mode)
   - Get: PUBLIC_KEY (pk_test_*), SECRET_KEY (sk_test_*)
   
   GMAIL (for emails):
   - Gmail account password
   - App-specific password (not main password!)
   
   POSTGRESQL:
   - Railway account: https://railway.app (OR local PostgreSQL)
   - Get connection string
   
   GENERATE:
   - 2 random 32+ character secrets for JWT
   - Use: https://www.random.org/strings/
   ```

**2. Open Terminal & Start Phase 1**

![PHASE 1: ENVIRONMENT SETUP]

```powershell
# Step 1: Navigate to your workspace
cd C:\Users\Page\Desktop\LBC

# Step 2: Clone if not already done
git clone https://github.com/iter8dstudio/LBC-.git LBC-backend
cd LBC-backend

# Step 3: Install dependencies
npm install

# Step 4: Create .env file
# OPTION A: Interactive setup
.\setup-env.bat

# OPTION B: Manual setup
# Create file: lbc-backend\.env
# Copy content from QUICK_START.md
```

**3. Fill .env with Your Credentials**

```env
# Copy this template and fill in your values from step 1

# Database (Railway or local)
DATABASE_URL=postgresql://...

# Frontend (for CORS)
FRONTEND_URL=http://localhost:3000

# JWT Secrets (32+ random characters)
ACCESS_TOKEN_SECRET=your-secret-here
REFRESH_TOKEN_SECRET=your-secret-here

# Cloudinary (from cloudinary.com)
CLOUDINARY_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
CLOUDINARY_UPLOAD_FOLDER=lbc

# Paystack (from paystack.com - test keys)
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_WEBHOOK_SECRET=xxx

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@lbc.com

# Server
PORT=5000
NODE_ENV=development
```

**4. Set Up Database**

```powershell
# Generate Prisma client
npm run db:generate

# Create database tables
npm run db:migrate

# Load test data
npm run db:seed

# Verify it worked
npm run db:studio
# Opens http://localhost:5555 - see all tables
```

**5. Start Backend**

```powershell
npm run dev

# Should see:
# ✓ Server running on http://localhost:5000
```

✅ **PHASE 1 COMPLETE**

---

### THEN (Next 1-2 hours)

![PHASE 2 & 3: TESTING]

**6. Import Postman Collection**

- Open Postman
- File → Import
- Select: `LBC_API_Postman_Collection.json`
- Environment: Create "LBC-Dev" with:
  ```
  API_BASE_URL: http://localhost:5000/api
  ```

**7. Run API Tests in This Order**

```
✓ AUTH → Register User (saves tokens)
✓ AUTH → Login User (verifies tokens work)
✓ STORES → Create Store (saves store ID)
✓ LISTINGS → Create Listing (saves listing ID)
✓ LISTINGS → Search Listings
✓ USERS → Get Profile
✓ USERS → Add to Wishlist
✓ BOOSTS → Create Boost
✓ MISC → Health Check
✓ ANALYTICS → Track Event

Use Postman's "Tests" tab - it validates responses automatically
Check: Status codes, required fields, data types
```

**Checklist for Each Endpoint**:
- [ ] Status code correct (200, 201, 400, etc.)
- [ ] All required fields in response
- [ ] No errors in console
- [ ] Response time < 500ms

✅ **PHASES 2 & 3 COMPLETE**

---

### AFTER (Next 3-4 days)

![PHASE 4: FRONTEND INTEGRATION]

**8. Connect Frontend to Backend**

Edit `lbc-app-updated.html`:

**Search for all API calls:**
```javascript
// FIND ALL THESE PATTERNS:
fetch('http://localhost:3000/...')
fetch('http://127.0.0.1:...')
const API_URL = 'http://...'
```

**Replace with:**
```javascript
// Add this at top of HTML (in <script>)
const API_CONFIG = {
  dev: {
    API_BASE_URL: 'http://localhost:5000/api',
  },
  prod: {
    API_BASE_URL: 'https://api.yourdomain.com/api',
  }
};

const ENV = window.location.hostname === 'localhost' ? 'dev' : 'prod';
const API = API_CONFIG[ENV];

// Then use in all requests:
fetch(`${API.API_BASE_URL}/auth/login`, {...})
```

**Or use the ApiService Helper** (provided in DEPLOYMENT_GUIDE.md):
```javascript
// Copy the ApiService class to your HTML
// Then use simpler API calls:
api.login(email, password)
api.createStore(data)
api.createListing(data)
```

**Test These User Flows:**
1. Register → Verify tokens saved
2. Login → Check dashboard loads
3. Create Store → Check store ID saved
4. Create Listing → Check listing displayed
5. Search → Check results load
6. Mobile → Check responsive design

✅ **PHASE 4 COMPLETE**

---

### THEN (Code Review - 1-2 days)

![PHASE 5: CODE REVIEW]

**9. Review Backend Code**

| File | Check For |
|------|-----------|
| `src/index.js` | CORS config, rate limiting, error handlers |
| `src/controllers/*` | Error handling, validation, error messages |
| `src/middleware/auth.js` | JWT verification logic, token expiry |
| `src/lib/email.js` | Email templates, SMTP config |
| `prisma/schema.prisma` | All models defined, relations correct |

**Critical Checks:**
- [ ] No hardcoded passwords/secrets
- [ ] All env vars read from .env
- [ ] Error responses include helpful messages
- [ ] Rate limiting configured
- [ ] Input validation with Zod
- [ ] Proper HTTP status codes
- [ ] Async/await error handling (try-catch)
- [ ] SQL injection protection (Prisma handles)
- [ ] XSS protection for user inputs

**10. Test Edge Cases**

```
Login:
- ✓ Valid credentials
- ✗ Wrong password
- ✗ Non-existent email
- ✗ Empty fields

Listings:
- ✓ Valid data
- ✗ Negative price
- ✗ Missing required fields
- ✗ XSS attempt in description

Search:
- ✓ Valid search term
- ✗ Empty search
- ✗ SQL injection attempt
```

✅ **PHASE 5 COMPLETE**

---

### FINALLY (Deployment - 2-3 days)

![PHASE 6 & 7: DEPLOY & LAUNCH]

**11. Deploy Backend to Railway**

```
1. Go to: https://railway.app
2. Sign in with GitHub
3. New Project → GitHub repo: iter8dstudio/LBC-
4. Select folder: lbc-backend
5. Add all .env variables to Railway dashboard
6. Railway auto-deploys on git push
7. Get domain: yourproject.railway.app
```

**12. Deploy Frontend**

```
OPTION A: Use Railway
- Create separate Railway project for frontend
- Upload lbc-app-updated.html
- Get domain

OPTION B: Use Netlify
- Push HTML to GitHub repo
- Connect to Netlify
- Auto-deploys on push
- Get domain

OPTION C: Buy Custom Domain
- Register at Namecheap/GoDaddy
- Point DNS to Railway/Netlify
```

**13. Update CORS for Production**

Edit `src/index.js`:
```javascript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL_PROD,  // Your production domain
    'https://yourdomain.com',
    'https://www.yourdomain.com',
  ],
  credentials: true,
}));
```

**14. Update Frontend API Config for Production**

```javascript
const API_CONFIG = {
  prod: {
    API_BASE_URL: 'https://api.railway.app/api',  // Your production backend
  }
};
```

**15. Pre-Launch Checklist**

```
Backend:
- [ ] No console errors
- [ ] All env vars set
- [ ] Database migrations run
- [ ] Response times < 500ms

Frontend:
- [ ] Loads without 404s
- [ ] Connects to backend
- [ ] Mobile responsive
- [ ] No hardcoded localhost URLs

Security:
- [ ] SSL/TLS enabled
- [ ] CORS configured correctly
- [ ] No sensitive data in logs
- [ ] JWT tokens expire properly
- [ ] Passwords salted & hashed

Performance:
- [ ] Page loads < 3 seconds
- [ ] API responses < 500ms
- [ ] Images optimized
- [ ] Database queries indexed
```

**16. User Acceptance Testing (UAT)**

Create 3 test accounts and run scenarios:

**Scenario 1: Vendor Workflow**
1. Register as vendor
2. Create store
3. Upload store logo
4. Create product listing
5. Upload product images
6. Publish listing
7. Check dashboard stats

**Scenario 2: Buyer Workflow**
1. Register as buyer
2. Search products
3. Filter by category
4. Add to wishlist
5. Contact vendor

**Scenario 3: Payment Flow**
1. Vendor tries boost
2. Goes to Paystack
3. Completes test payment
4. Boost activates
5. Listing becomes featured

✅ **PHASES 6 & 7 COMPLETE - READY FOR PRODUCTION**

---

## 📊 TESTING CHECKLIST BY PHASE

### Phase 1-2: Backend Setup
- [x] Backend clone successful
- [x] Dependencies installed
- [x] .env created with all variables
- [x] Database connected
- [x] Migrations ran
- [x] Test data seeded
- [x] Backend starts: `npm run dev`

### Phase 3: API Testing
- [x] All 28 endpoints tested
- [x] Auth flow works (register → tokens → login → refresh)
- [x] CRUD operations work (create, read, update, delete)
- [x] File uploads work (Cloudinary integration)
- [x] Pagination works
- [x] Search/filters work
- [x] Error handling works (400, 401, 404, 500)

### Phase 4: Frontend Integration
- [x] Frontend loads (no 404s)
- [x] API config points to backend
- [x] Login works (tokens saved)
- [x] Can create store
- [x] Can create listing
- [x] Can upload images
- [x] Can search products
- [x] Mobile responsive

### Phase 5: Code Review
- [x] No hardcoded secrets
- [x] Error messages helpful
- [x] Input validation
- [x] Rate limiting works
- [x] Security headers (helmet)
- [x] CORS configured

### Phase 6-7: Production
- [x] Backend deployed to Railway
- [x] Frontend deployed to Netlify/custom
- [x] Custom domain configured
- [x] SSL/TLS active
- [x] Production env vars set
- [x] UAT passed
- [x] Performance acceptable
- [x] Monitoring active

---

## 🔑 KEY POSTMAN ENVIRONMENT VARIABLES

These auto-populate when you run tests:

```
API_BASE_URL        → http://localhost:5000/api
ACCESS_TOKEN        → Saved after login (used in Authorization header)
REFRESH_TOKEN       → Saved after login (for token refresh)
USER_ID             → Saved after register
STORE_ID            → Saved after creating store
LISTING_ID          → Saved after creating listing
BOOST_ID            → Saved after creating boost
```

**How to use**: 
- Reference with `{{VARIABLE_NAME}}` in URL/body
- Click "Tests" tab after each request to see auto-population

---

## 🎯 SUCCESS CRITERIA

Project is COMPLETE when:

✅ All 28 API endpoints tested and working
✅ Frontend connects to backend without errors
✅ User can register → login → create store → list products
✅ Payments integrate with Paystack (test mode)
✅ Images upload and display correctly
✅ Mobile responsive design works
✅ Backend deployed to production domain
✅ Frontend deployed to production domain
✅ No console errors
✅ Response times < 500ms
✅ Ready for real users

---

## 📞 SUPPORT

**Stuck?** Check these in order:

1. Read error message carefully
2. Check `npm run dev` console output
3. Search DEPLOYMENT_GUIDE.md troubleshooting section
4. Look at request/response in Postman Network tab
5. Check browser DevTools (F12 → Network/Console)
6. Verify .env file has all variables

---

## 🎓 LEARNING RESOURCES

As you work through this:

- [Express.js Docs](https://expressjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Postman Learning Center](https://learning.postman.com)
- [Railway Deployment](https://docs.railway.app)
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

---

## 🚦 READY TO START?

1. Open `QUICK_START.md` ← First!
2. Follow the 5-minute setup
3. Return to this document for phases 2-7
4. Use `DEPLOYMENT_GUIDE.md` as reference
5. Import `LBC_API_Postman_Collection.json`

**Good Luck!** 🚀

---

**Created**: 2026-03-22
**Status**: Ready for Execution
**Estimated Time**: 7-10 working days
