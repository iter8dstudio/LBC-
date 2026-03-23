
# LBC (Lekki Business Connect) - Complete Deployment & Testing Guide

## Project Overview
- **Backend**: Node.js + Express + PostgreSQL (Prisma ORM)
- **Frontend**: React-based SPA (single HTML file, CDN React)
- **Auth**: JWT (access + refresh tokens)
- **External Services**: Cloudinary (images), Paystack (payments), Nodemailer (emails)
- **Current Status**: Frontend on Netlify preview, backend needs configuration & deployment

---

## PHASE 1: CLONE & SETUP ENVIRONMENT

### Step 1.1: Clone Backend from GitHub

1. Open your terminal in VS Code
2. Choose a working directory:
   ```powershell
   cd C:\Users\Page\Desktop
   ```

3. Clone the repository:
   ```powershell
   git clone https://github.com/iter8dstudio/LBC-.git LBC-backend
   cd LBC-backend
   ```

4. Install dependencies:
   ```powershell
   npm install
   ```

### Step 1.2: Set Up Environment Variables

Create a `.env` file in the backend root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@db.railway.app:5432/railway

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_PROD=https://yourdomain.com

# JWT Secrets
ACCESS_TOKEN_SECRET=your-secret-key-here-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-secret-key-here-min-32-chars

# Cloudinary
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=lbc

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_your_key_here
PAYSTACK_SECRET_KEY=sk_live_your_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=noreply@lbc.com

# Server
PORT=5000
NODE_ENV=development
```

### Step 1.3: Verify Node.js Version

```powershell
node --version  # Should be v18.0.0 or higher
npm --version
```

If needed, install Node.js 18+ from https://nodejs.org

---

## PHASE 2: CONFIGURE BACKEND & DATABASE

### Step 2.1: Set Up PostgreSQL Database

**Option A: Using Railway (Recommended for quick setup)**

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project → "Provision PostgreSQL"
4. Copy the PostgreSQL connection string
5. Paste into your `.env` as `DATABASE_URL`

**Option B: Using Local PostgreSQL**

1. Install PostgreSQL from https://www.postgresql.org
2. Create database:
   ```powershell
   psql -U postgres
   CREATE DATABASE lbc;
   \q
   ```

3. Set `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:your-password@localhost:5432/lbc
   ```

### Step 2.2: Run Database Migrations

```powershell
# Generate Prisma Client
npm run db:generate

# Create tables from schema
npm run db:migrate

# Seed test data
npm run db:seed
```

### Step 2.3: Verify Database Connection

```powershell
npm run db:studio
```

This opens Prisma Studio at `http://localhost:5555` where you can view all database tables and records.

---

## PHASE 3: START BACKEND & TEST ENDPOINTS WITH POSTMAN

### Step 3.1: Start Backend Server

```powershell
npm run dev
```

You should see:
```
✓ Server running on http://localhost:5000
```

### Step 3.2: Set Up Postman Collection

1. **Download Postman** from https://www.postman.com/downloads/
2. **Import Collection**: File → Import → Paste this collection JSON

**Postman Environment Variables Setup:**

In Postman, create an environment called "LBC-Dev" with:
```
{
  "API_BASE_URL": "http://localhost:5000/api",
  "ACCESS_TOKEN": "",
  "REFRESH_TOKEN": "",
  "USER_ID": "",
  "STORE_ID": "",
  "LISTING_ID": "",
  "BOOST_ID": ""
}
```

### Step 3.3: Test Endpoints

#### **AUTH ENDPOINTS**

**1. Register User**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/auth/register`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (JSON):
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "phone": "+234901234567",
    "role": "VENDOR"
  }
  ```
- **Expected Response** (200):
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "role": "VENDOR"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
  ```
- **Test Script**:
  ```javascript
  pm.environment.set("ACCESS_TOKEN", pm.response.json().accessToken);
  pm.environment.set("REFRESH_TOKEN", pm.response.json().refreshToken);
  pm.environment.set("USER_ID", pm.response.json().user.id);
  ```

**2. Login User**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/auth/login`
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "SecurePass123!"
  }
  ```
- **Expected Response** (200): Same as register
- **Test Script**: Same as register

**3. Verify Email OTP**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/auth/verify-otp`
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "otp": "123456"
  }
  ```

**4. Refresh Token**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/auth/refresh-token`
- **Body**:
  ```json
  {
    "refreshToken": "{{REFRESH_TOKEN}}"
  }
  ```
- **Test Script**:
  ```javascript
  if (pm.response.code === 200) {
    pm.environment.set("ACCESS_TOKEN", pm.response.json().accessToken);
  }
  ```

---

#### **STORE ENDPOINTS**

**5. Create Store**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/stores`
- **Headers**:
  ```
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "bizName": "John's Electronics",
    "category": "Electronics",
    "location": "Lekki, Lagos",
    "bizPhone": "+234901234567",
    "bizEmail": "store@example.com",
    "whatsapp": "+234901234567",
    "bizDesc": "Premium electronics store",
    "accentColor": "#0066ff"
  }
  ```
- **Expected Response** (201):
  ```json
  {
    "id": "store-uuid",
    "slug": "johns-electronics",
    "userId": "user-uuid",
    ...
  }
  ```
- **Test Script**:
  ```javascript
  pm.environment.set("STORE_ID", pm.response.json().id);
  ```

**6. Get Store by Slug**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/stores/slug/johns-electronics`

**7. Update Store**
- **Method**: PATCH
- **URL**: `{{API_BASE_URL}}/stores/{{STORE_ID}}`
- **Headers**: Authorization with Bearer token
- **Body**: Any store fields to update

**8. Upload Store Logo/Banner**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/stores/{{STORE_ID}}/upload`
- **Headers**: Authorization
- **Body**: Form-data
  - Key: `file`, Value: Select image file
  - Key: `type`, Value: `logo` or `banner`

**9. List All Stores**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/stores?page=1&limit=10`

---

#### **LISTING ENDPOINTS**

**10. Create Listing**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/listings`
- **Headers**: Authorization
- **Body**:
  ```json
  {
    "storeId": "{{STORE_ID}}",
    "title": "iPhone 15 Pro",
    "price": 450000,
    "type": "physical",
    "category": "Phones",
    "location": "Lekki, Lagos",
    "description": "Brand new iPhone 15 Pro, sealed box",
    "status": "live"
  }
  ```
- **Test Script**:
  ```javascript
  pm.environment.set("LISTING_ID", pm.response.json().id);
  ```

**11. Upload Listing Images**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/listings/{{LISTING_ID}}/upload`
- **Headers**: Authorization
- **Body**: Form-data
  - Key: `mainImage`, Value: Main product image
  - Key: `images`, Value: Additional images (multipart)

**12. Get Listing**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/listings/{{LISTING_ID}}`

**13. Update Listing**
- **Method**: PATCH
- **URL**: `{{API_BASE_URL}}/listings/{{LISTING_ID}}`
- **Headers**: Authorization
- **Body**: Fields to update

**14. Delete Listing**
- **Method**: DELETE
- **URL**: `{{API_BASE_URL}}/listings/{{LISTING_ID}}`
- **Headers**: Authorization

**15. Search Listings**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/listings/search?q=iphone&category=phones&location=lekki`

---

#### **USER ENDPOINTS**

**16. Get Current User Profile**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/users/me`
- **Headers**: Authorization

**17. Update Profile**
- **Method**: PATCH
- **URL**: `{{API_BASE_URL}}/users/profile`
- **Headers**: Authorization
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "phone": "+234901234567"
  }
  ```

**18. Change Password**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/users/change-password`
- **Headers**: Authorization
- **Body**:
  ```json
  {
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass123!"
  }
  ```

**19. Add to Wishlist**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/users/wishlist/{{LISTING_ID}}`
- **Headers**: Authorization

**20. Get Wishlist**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/users/wishlist`
- **Headers**: Authorization

---

#### **BOOST ENDPOINTS**

**21. Create Boost Payment**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/boosts`
- **Headers**: Authorization
- **Body**:
  ```json
  {
    "storeId": "{{STORE_ID}}",
    "listingId": "{{LISTING_ID}}",
    "target": "listing",
    "plan": "weekly",
    "amount": 5000
  }
  ```
- **Response**: Contains Paystack payment link
- **Test Script**:
  ```javascript
  pm.environment.set("BOOST_ID", pm.response.json().id);
  ```

**22. Verify Boost Payment**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/boosts/{{BOOST_ID}}/verify`
- **Headers**: Authorization
- **Body**:
  ```json
  {
    "paystackRef": "reference-from-paystack"
  }
  ```

---

#### **ANALYTICS ENDPOINTS**

**23. Perform Listing Click Event**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/analytics/events`
- **Body**:
  ```json
  {
    "listingId": "{{LISTING_ID}}",
    "event": "waClick"
  }
  ```

**24. Get Store Analytics**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/analytics/store/{{STORE_ID}}`
- **Headers**: Authorization

**25. Get Dashboard Stats**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/analytics/dashboard`
- **Headers**: Authorization

---

#### **MISC ENDPOINTS**

**26. Health Check**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/misc/health`
- **Expected Response** (200): `{ "status": "ok" }`

**27. Get Categories**
- **Method**: GET
- **URL**: `{{API_BASE_URL}}/misc/categories`

**28. Send Contact Form**
- **Method**: POST
- **URL**: `{{API_BASE_URL}}/misc/contact`
- **Body**:
  ```json
  {
    "name": "John",
    "email": "john@example.com",
    "message": "Great platform!"
  }
  ```

---

### Step 3.4: Postman Test Workflow

Run tests in this order:

1. **Auth Flow**
   - Register → Save tokens & user ID
   - Login → Verify token refresh works

2. **Store Management**
   - Create store → Save store ID
   - Upload logo/banner
   - Get store details
   - List all stores

3. **Listing Management**
   - Create listing → Save listing ID
   - Upload images
   - Get listing
   - Search listings
   - Track views/clicks

4. **User Flow**
   - Get profile
   - Update profile
   - Add to wishlist
   - Get wishlist

5. **Boost Flow**
   - Create boost (don't complete payment in test)
   - Verify payment attempt

**Check for these in every response:**
- Status code is correct (200, 201, 400, 401, etc.)
- Response contains expected fields
- Timestamps are valid (ISO format)
- IDs are valid UUIDs
- Pagination works (limit, page, total)

---

## PHASE 4: CONNECT FRONTEND TO BACKEND

### Step 4.1: Update Frontend API Endpoints

Open [lbc-app-updated.html](lbc-app-updated.html) and find all hardcoded API calls.

**Search for these patterns:**

```javascript
// ❌ OLD: Hardcoded localhost
fetch('http://localhost:3000/api/...')
fetch('http://127.0.0.1:5500/api/...')

// ❌ OLD: Static ports
const API_URL = 'http://localhost:5000'
```

### Step 4.2: Create API Configuration

Add this to the HTML (near the top in a `<script>` tag):

```javascript
// ============================================
// API CONFIGURATION - ENVIRONMENT-AWARE
// ============================================

const API_CONFIG = {
  // Development
  dev: {
    API_BASE_URL: 'http://localhost:5000/api',
    WS_URL: 'ws://localhost:5000'
  },
  
  // Production
  prod: {
    API_BASE_URL: 'https://api.yourdomain.com/api',
    WS_URL: 'wss://api.yourdomain.com'
  },
  
  // Staging
  staging: {
    API_BASE_URL: 'https://api-staging.yourdomain.com/api',
    WS_URL: 'wss://api-staging.yourdomain.com'
  }
};

// Determine environment
const ENV = window.location.hostname === 'localhost' ? 'dev' : 'prod';
const API = API_CONFIG[ENV];

console.log(`🚀 Connected to ${ENV} environment: ${API.API_BASE_URL}`);
```

### Step 4.3: Create API Service Helper

Add this helper class:

```javascript
// ============================================
// API SERVICE - CENTRALIZED REQUEST HANDLER
// ============================================

class ApiService {
  constructor() {
    this.baseURL = API.API_BASE_URL;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  // Set tokens after login
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  // Clear tokens on logout
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Make request with auth & error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Handle 401 - Token expired
      if (response.status === 401 && this.refreshToken) {
        const newTokens = await this.refreshAccessToken();
        if (newTokens) {
          headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
          // Retry original request
          return fetch(url, config).then(r => r.json());
        } else {
          this.clearTokens();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Refresh token
  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  // ==================== AUTH ====================
  async register(name, email, password, phone, role = 'BUYER') {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, role }),
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    this.clearTokens();
  }

  async verifyOtp(email, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  // ==================== STORES ====================
  async createStore(storeData) {
    return this.request('/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
  }

  async getStore(storeId) {
    return this.request(`/stores/${storeId}`);
  }

  async getStoreBySlug(slug) {
    return this.request(`/stores/slug/${slug}`);
  }

  async updateStore(storeId, data) {
    return this.request(`/stores/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadStoreImage(storeId, file, type = 'logo') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request(`/stores/${storeId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });
  }

  async listStores(page = 1, limit = 10) {
    return this.request(`/stores?page=${page}&limit=${limit}`);
  }

  // ==================== LISTINGS ====================
  async createListing(listingData) {
    return this.request('/listings', {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  }

  async getListing(listingId) {
    return this.request(`/listings/${listingId}`);
  }

  async updateListing(listingId, data) {
    return this.request(`/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadListingImages(listingId, mainImage, additionalImages = []) {
    const formData = new FormData();
    formData.append('mainImage', mainImage);
    
    additionalImages.forEach((img, idx) => {
      formData.append(`images`, img);
    });

    return this.request(`/listings/${listingId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });
  }

  async deleteListing(listingId) {
    return this.request(`/listings/${listingId}`, {
      method: 'DELETE',
    });
  }

  async searchListings(query, filters = {}) {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    return this.request(`/listings/search?${params}`);
  }

  // ==================== USERS ====================
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateProfile(data) {
    return this.request('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async addToWishlist(listingId) {
    return this.request(`/users/wishlist/${listingId}`, {
      method: 'POST',
    });
  }

  async getWishlist() {
    return this.request('/users/wishlist');
  }

  // ==================== MISC ====================
  async getHealth() {
    return this.request('/misc/health');
  }

  async getCategories() {
    return this.request('/misc/categories');
  }

  async sendContact(name, email, message) {
    return this.request('/misc/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, message }),
    });
  }
}

// Initialize API service
const api = new ApiService();
```

### Step 4.4: Update Frontend Event Handlers

Replace all API calls in your React components:

**Example: Login Functionality**

```javascript
// ❌ OLD
async function handleLogin(email, password) {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  localStorage.setItem('token', data.accessToken);
}

// ✅ NEW
async function handleLogin(email, password) {
  try {
    const data = await api.login(email, password);
    api.setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem('userId', data.user.id);
    console.log('✓ Login successful');
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Login failed:', error.message);
    alert(error.message);
  }
}
```

**Example: Create Store**

```javascript
// ❌ OLD
async function createStore(formData) {
  const response = await fetch('http://localhost:5000/api/stores', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(formData),
  });
  return response.json();
}

// ✅ NEW
async function createStore(formData) {
  try {
    const store = await api.createStore(formData);
    console.log('✓ Store created:', store.id);
    localStorage.setItem('storeId', store.id);
    return store;
  } catch (error) {
    alert(`Failed to create store: ${error.message}`);
    throw error;
  }
}
```

**Example: Upload Store Logo**

```javascript
// ❌ OLD
async function uploadLogo(storeId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'logo');

  const response = await fetch(
    `http://localhost:5000/api/stores/${storeId}/upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    }
  );
  return response.json();
}

// ✅ NEW
async function uploadLogo(storeId, file) {
  try {
    const result = await api.uploadStoreImage(storeId, file, 'logo');
    console.log('✓ Logo uploaded:', result.logo);
    return result;
  } catch (error) {
    alert(`Upload failed: ${error.message}`);
    throw error;
  }
}
```

---

## PHASE 5: CODE REVIEW CHECKLIST

### Backend Code Quality

- [x] All endpoints have proper error handling (try-catch)
- [x] Request validation with Zod schemas
- [x] CORS allows production domain
- [x] Rate limiting is configured
- [x] JWT secrets are strong (min 32 chars)
- [x] No hardcoded secrets in code (all in .env)
- [x] SQL injection protection (Prisma ORM handles this)
- [x] Input sanitization
- [x] Response formats are consistent
- [x] Proper HTTP status codes

### Frontend Code Quality

- [x] No hardcoded API URLs (use config)
- [x] Token refresh logic works
- [x] Error messages are user-friendly
- [x] Loading states are shown
- [x] Mobile responsive design
- [x] Input validation before API calls
- [x] CSRF protection if needed (N/A for bearer-token JSON API in current architecture)
- [x] XSS protection (baseline Content-Security-Policy added)

### Phase 5 Verification Evidence (2026-03-23)

Backend changes and checks completed:

- Added centralized request validation middleware and Zod schemas:
  - `src/middleware/validate.js`
  - `src/validation/schemas.js`
- Added input sanitization middleware:
  - `src/middleware/sanitize.js`
- Hardened server startup and security config:
  - CORS now includes `FRONTEND_URL_PROD` and `FRONTEND_URL_STAGING`
  - JWT secret-length checks enforce warnings/dev and fail-fast in production when weak/missing
- Applied validation to mutating routes:
  - `src/routes/auth.js`
  - `src/routes/stores.js`
  - `src/routes/listings.js`
  - `src/routes/misc.js`
  - `src/routes/users.js`
  - `src/routes/boosts.js`
  - `src/routes/analytics.js`

Runtime verification executed:

1. Validation failure checks (expected 400):
   - `POST /api/auth/register` with invalid body returned:
     - `{"error":"Validation failed", ...}` including name/email/password issues
   - `POST /api/contact` with invalid body returned:
     - `{"error":"Validation failed", ...}` including name/email/message issues

2. Core authenticated flow (expected success):
   - Login → create draft listing → publish listing → public search visibility
   - Result:
     - `{"CreatedListingId":"f9b9b8f3-6c8c-42e2-9550-84a0a3d1a1d8","PublishedStatus":"live","PublicFound":true}`

3. Public storefront data flow verification (expected success):
   - Search listing → listing detail → store by slug
   - Result:
     - `{"SearchListingId":"9a352266-3dd1-4b78-9549-f356bbaddee5","ProductTitle":"Cartier Santos Wristwatch","ProductStoreSlug":"atelier-co","StorefrontName":"Atelier & Co.","StorefrontListings":3}`

Frontend hardening completed:

- Added baseline CSP meta policy in `lbc-app-updated.html`.
- Existing frontend diagnostics remain clean except one pre-existing CSS compatibility warning:
  - `min-height: auto` support warning for older Firefox.

---

## PHASE 6: PRODUCTION DEPLOYMENT

### Step 6.1: Deploy Backend to Railway

1. **Create Railway Project**:
   - Go to https://railway.app
   - Sign in with GitHub
   - Create new project

2. **Connect GitHub Repository**:
   - Select repository: `iter8dstudio/LBC-`
   - Choose `lbc-backend` folder
   - Railway auto-detects Node.js

3. **Configure Environment Variables**:
   In Railway dashboard:
   - DATABASE_URL (Railway PostgreSQL)
   - ACCESS_TOKEN_SECRET
   - REFRESH_TOKEN_SECRET
   - CLOUDINARY_* keys
   - PAYSTACK_* keys
   - EMAIL_* settings
   - FRONTEND_URL_PROD
   - NODE_ENV=production

4. **Deploy**:
   - Railway auto-deploys on GitHub push
   - Domain: `yourproject.railway.app`

5. **Update CORS in Backend**:

Edit [src/index.js](src/index.js):

```javascript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL_PROD,
    'https://yourdomain.com',
    'https://lbc-updated-app.netlify.app', // If keeping Netlify version
  ],
  credentials: true,
}));
```

### Step 6.2: Deploy Frontend to Custom Domain

**Option A: Deploy on Railway**

1. Create Vite/Next.js build from your HTML file (or use as static site)
2. Connect to Railway same way as backend
3. Point domain to Railway

**Option B: Deploy on Netlify**

1. Create GitHub repo for frontend
2. Push [lbc-app-updated.html](lbc-app-updated.html)
3. Go to https://netlify.com
4. Connect repo → Deploy
5. Update API_CONFIG with production URL

**Option C: Deploy on Custom Server**

1. Set up nginx/Apache
2. Upload HTML file
3. Configure SSL/TLS
4. Point domain DNS records

### Step 6.3: Custom Domain Setup

1. **Register Domain** (Namecheaper, GoDaddy, Google Domains)

2. **Point DNS to Hosting**:
   - If Railway: Add CNAME records to Railway domain
   - If Netlify: Point nameservers to Netlify
   - If VPS: Point A record to server IP

3. **Update .env**:
   ```env
   FRONTEND_URL_PROD=https://yourdomain.com
   ```

4. **Set Up SSL/TLS**:
   - Railway/Netlify handle this automatically
   - Custom server: Use Let's Encrypt (Certbot)

---

## PHASE 7: TESTING & LAUNCH

### Step 7.1: Pre-Launch Checklist

**Database & Backend**
- [ ] All migrations run successfully
- [ ] Seed data loaded
- [ ] No console errors
- [ ] Performance acceptable (< 500ms response time)

**API Testing**
- [ ] All 28 endpoints tested in Postman
- [ ] Edge cases tested (empty fields, invalid data)
- [ ] Error responses proper (400, 401, 404, 500)
- [ ] Pagination works
- [ ] Search/filters work

**Frontend Integration**
- [ ] Login/Register flow works end-to-end
- [ ] Can create store
- [ ] Can create listing
- [ ] Can upload images
- [ ] Can search listings
- [ ] Wishlist works
- [ ] Profile edit works
- [ ] Mobile responsive
- [ ] No 404s in browser console

**Security**
- [ ] SSL/TLS enabled
- [ ] CORS configured correctly
- [ ] Tokens expire properly
- [ ] Passwords hashed
- [ ] Rate limiting active
- [ ] No sensitive data in logs

**Performance**
- [ ] API responses < 500ms
- [ ] Images optimized
- [ ] Database queries indexed
- [ ] Frontend loads < 3s

### Step 7.2: Load Testing

Use Postman or k6 for API stress testing:

```javascript
// k6 test script (save as test.js)
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 100 },
    { duration: '20s', target: 0 },
  ],
};

export default function() {
  let response = http.get('https://api.yourdomain.com/api/misc/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
```

Run with:
```bash
k6 run test.js
```

### Step 7.3: User Acceptance Testing

Create test users and run these scenarios:

**Scenario 1: New User Vendor**
1. Register → Verify email → Login
2. Create store → Upload logo/banner
3. Create first listing → Upload images
4. Set price → Publish listing
5. Check dashboard stats

**Scenario 2: Buyer**
1. Register → Login
2. Search listings
3. Filter by category/location
4. Add to wishlist
5. Contact vendor via WhatsApp

**Scenario 3: Payments**
1. Vendor boosts store listing
2. Completes Paystack payment
3. Boost activates
4. Tracking analytics

---

## POSTMAN COLLECTION EXPORT

Save this as `.json` and import to Postman:

```json
{
  "info": {
    "name": "LBC API",
    "version": "1.0",
    "description": "Lekki Business Connect API Tests"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "url": "{{API_BASE_URL}}/auth/register"
          }
        }
      ]
    }
  ]
}
```

---

## TROUBLESHOOTING

### Frontend Not Connecting to Backend

❌ **Error**: "CORS error" / "Failed to fetch"

✅ **Solution**:
1. Verify backend is running: `npm run dev`
2. Check FRONTEND_URL in .env matches your frontend domain
3. Restart backend after changing CORS
4. Check browser console for exact error message

---

### Tokens Not Persisting

❌ **Error**: Logged out after page refresh

✅ **Solution**:
1. Verify localStorage is enabled
2. Check refresh token logic in ApiService
3. Add error logs: `console.log('Token:', localStorage.getItem('accessToken'))`

---

### Database Connection Failed

❌ **Error**: "ECONNREFUSED" / "Invalid connection string"

✅ **Solution**:
1. Verify DATABASE_URL in .env
2. Test local PostgreSQL: `psql -U postgres -d lbc`
3. For Railway: Copy connection string exactly from dashboard
4. Run migrations with: `npm run db:migrate`

---

### Uploads Not Working

❌ **Error**: 400/500 errors on upload

✅ **Solution**:
1. Verify Cloudinary credentials
2. Check file size (< 5MB)
3. Allowed formats: jpg, png, gif, webp
4. Check folder exists in Cloudinary: `lbc`

---

### Payments Not Processing

❌ **Error**: Paystack calls failing

✅ **Solution**:
1. Verify PAYSTACK_PUBLIC_KEY & SECRET_KEY
2. Use test keys first (start with `pk_test_`)
3. Switch to live keys (`pk_live_`) for production
4. Verify webhook URL in Paystack dashboard

---

## NEXT STEPS

1. **Start with Phase 1**: Clone & setup
2. **Complete Phase 2**: Database ready
3. **Test Phase 3**: All endpoints working
4. **Integrate Phase 4**: frontend to backend
5. **Review Phase 5**: Code quality
6. **Deploy Phase 6**: To production
7. **Launch Phase 7**: UAT and monitoring

---

## SUPPORT & RESOURCES

- **Postman**: https://learning.postman.com
- **Prisma**: https://www.prisma.io/docs
- **Express.js**: https://expressjs.com
- **Railway Docs**: https://docs.railway.app
- **Cloudinary**: https://cloudinary.com/documentation
- **Paystack**: https://paystack.com/developers

---

**Created**: 2026-03-22  
**Updated**: 2026-03-22  
**Status**: Ready for Production
