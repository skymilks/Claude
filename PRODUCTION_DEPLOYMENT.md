# 🚀 CrownBids Production Deployment Guide

**Complete step-by-step guide to deploy CrownBids to production**

> **Target Timeline:** 2-3 hours total deployment time
> **Total Monthly Cost:** ~$30-50 USD

---

## 📋 Pre-Deployment Checklist

Before you start, ensure you have:

- [ ] GitHub account (for code hosting)
- [ ] Render.com account (free tier available)
- [ ] Stripe account (optional, for payment processing)
- [ ] Custom domain (optional, but recommended)
- [ ] Email address for notifications

---

## PART 1: Backend Deployment on Render.com

### Step 1.1: Create Render.com Account

1. Go to https://render.com
2. Click "Sign Up"
3. Choose "Sign up with GitHub" for easier integration
4. Grant permissions to your repositories

### Step 1.2: Create PostgreSQL Database

1. In Render dashboard, click "New +" → "PostgreSQL"
2. Enter database name: `crownbids-db`
3. Select free plan
4. Click "Create Database"

**Wait for database creation** (2-3 minutes)

Once created, you'll see the connection details. Copy these values:
- **Host** (Internal Database URL format: `...render.internal:5432`)
- **Database** (should be `crownbids-db`)
- **User** (default: `postgres`)
- **Password** (auto-generated)

### Step 1.3: Deploy Backend API

1. Click "New +" → "Web Service"
2. Choose "Connect a repository"
3. Select your repository: `skymilks/Claude`
4. Name: `crownbids-api`
5. Environment: `Node`
6. Build Command:
   ```bash
   cd backend && npm install && npm run seed
   ```
7. Start Command:
   ```bash
   cd backend && npm start
   ```

### Step 1.4: Configure Environment Variables

After creating the service, go to **Environment** section and add:

```env
NODE_ENV=production
PORT=3001
DB_HOST=[Use internal database URL from step 1.2]
DB_PORT=5432
DB_NAME=crownbids-db
DB_USER=postgres
DB_PASSWORD=[Copy from step 1.2]
FRONTEND_URL=https://crownbids.vercel.app
```

> **Note:** Replace `FRONTEND_URL` with your actual frontend URL (see Part 2)

### Step 1.5: Deploy

1. Click "Deploy"
2. Watch the build process in the logs
3. Wait for ✅ "Service is live"

Your API is now live at: `https://crownbids-api.onrender.com`

**Test it:**
```bash
curl https://crownbids-api.onrender.com/health
```

---

## PART 2: Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

#### Step 2A.1: Prepare Frontend

1. Update `config.js`:
   ```javascript
   api: {
     backendUrl: 'https://crownbids-api.onrender.com/api'
   }
   ```

2. Commit changes:
   ```bash
   git add config.js
   git commit -m "Update backend URL for production"
   git push
   ```

#### Step 2A.2: Deploy to Vercel

1. Go to https://vercel.com
2. Click "Import Project"
3. Select GitHub repository
4. Choose root directory as "Frontend"
5. Click "Deploy"

Your frontend is now live at: `https://crownbids.vercel.app`

### Option B: Deploy to Netlify

1. Go to https://netlify.com
2. Click "New site from Git"
3. Connect GitHub repository
4. Set Build Directory: `.` (root)
5. Click "Deploy"

Your frontend is now live at: `https://crownbids.netlify.app`

### Option C: Deploy to GitHub Pages

1. In repository settings:
   - Enable GitHub Pages
   - Source: main branch
   - Folder: / (root)

2. Your site will be live at: `https://skymilks.github.io/Claude`

---

## PART 3: Set Up Custom Domain (Optional)

### Option 1: Using Render's Free DNS

1. Go to Render dashboard → your API service
2. Click "Custom Domains"
3. Add your domain: `api.crownbids.com`
4. Follow DNS setup instructions

### Option 2: Using Vercel's Nameservers

1. In Vercel dashboard → Project Settings → Domains
2. Add custom domain: `crownbids.com`
3. Update your domain registrar to use Vercel's nameservers

---

## PART 4: Testing Production Deployment

### Test Backend API

```bash
# Test health endpoint
curl https://crownbids-api.onrender.com/health

# Get contracts
curl https://crownbids-api.onrender.com/api/contracts?limit=5

# Analyze a URL
curl -X POST https://crownbids-api.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example-security-company.com"}'
```

### Test Frontend

1. Open https://crownbids.vercel.app
2. Test entering a company website
3. Verify it matches with contracts
4. Check console for errors (F12)

### Test CORS

Frontend should successfully communicate with backend:
- Open browser DevTools (F12)
- Network tab
- Perform a URL analysis
- Verify requests go to `crownbids-api.onrender.com`
- No CORS errors should appear

---

## PART 5: Set Up Email Notifications (Optional)

### Step 5.1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for free account
3. Verify your email
4. Go to Settings → API Keys
5. Create new API key
6. Copy the key

### Step 5.2: Add to Backend

1. Update Render environment variables:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@crownbids.com
   ```

2. Commit notification service code:
   ```bash
   git add backend/src/services/emailService.js
   git commit -m "Add email notification service"
   git push
   ```

3. Redeploy on Render (automatic on push)

---

## PART 6: Set Up Monitoring & Alerts

### Option 1: Sentry (Error Tracking)

1. Go to https://sentry.io
2. Create account
3. Create project for Node.js
4. Copy DSN
5. Add to backend `.env`:
   ```env
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

### Option 2: Uptime Monitoring

1. Go to https://uptimerobot.com
2. Add monitor for:
   - `https://crownbids-api.onrender.com/health`
   - `https://crownbids.vercel.app`
3. Get alerts if service goes down

### Option 3: Database Backups

Render automatically backs up PostgreSQL. To manually backup:

```bash
# From local machine
pg_dump --host=[DB_HOST] --username=postgres crownbids-db > backup.sql

# To restore:
psql --host=[DB_HOST] --username=postgres crownbids-db < backup.sql
```

---

## PART 7: Final Verification Checklist

### Backend

- [ ] API health check returns 200 OK
- [ ] `/api/contracts` endpoint returns data
- [ ] `/api/analyze` endpoint analyzes URLs correctly
- [ ] No errors in Render logs
- [ ] Database has contract data

### Frontend

- [ ] Website loads without errors
- [ ] URL analysis works end-to-end
- [ ] Contract search and filters work
- [ ] No console errors (F12)
- [ ] Responsive design on mobile

### Integration

- [ ] Frontend successfully calls backend API
- [ ] No CORS errors
- [ ] Authentication works (if implemented)
- [ ] Save/favorites works (if implemented)

### Performance

- [ ] API response time < 500ms
- [ ] Frontend load time < 3 seconds
- [ ] No database timeouts

---

## PART 8: Maintenance & Updates

### Regular Tasks

**Weekly:**
- [ ] Check error logs in Sentry
- [ ] Monitor uptime reports
- [ ] Spot-check contract data

**Monthly:**
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Test disaster recovery (backup/restore)

### Deploying Updates

```bash
# Make code changes
git add .
git commit -m "Update feature X"

# Push to GitHub
git push origin claude/build-working-product-017N3uAFcYArqkc3EZ6y1SuA

# For backend: Automatically redeploys on Render
# For frontend: Automatically redeploys on Vercel
```

### Database Migrations

To update database schema:

1. Update `backend/src/config/database.js`
2. Commit changes
3. Render will run `npm run seed` on redeploy
4. Database schema updates automatically

---

## PART 9: Cost Breakdown

### Free Tier (Recommended for MVP)

| Service | Cost | Details |
|---------|------|---------|
| Render API | Free | 750 hours/month |
| Render Database | Free | 90-day retention |
| Vercel Frontend | Free | Unlimited deployments |
| GitHub | Free | Unlimited public repos |
| **Total** | **$0** | Perfect for MVP |

### Production Tier (1000+ users/month)

| Service | Cost | Details |
|---------|------|---------|
| Render API | $7 | 750 hours/month |
| Render Database | $15 | 1GB storage |
| Vercel Frontend | Free | Unlimited |
| Custom Domain | $12 | Per year |
| SendGrid Email | Free | 100 emails/day |
| Sentry Monitoring | Free | 5k errors/month |
| **Total** | **~$34/month** | Scalable |

---

## PART 10: Troubleshooting

### Backend won't deploy

```bash
# Check build logs in Render:
1. Go to Render dashboard
2. Click service name
3. Check "Logs" tab for errors

# Common issues:
- Node version mismatch (need 18+)
- Missing environment variables
- Database connection string incorrect
```

### Frontend won't connect to backend

```bash
# Check CORS settings in backend:
1. Verify FRONTEND_URL in .env
2. Ensure it matches your actual frontend URL
3. Restart backend (redeploy)

# In browser console (F12):
- Should see API calls to backend
- No "CORS error" messages
```

### Database connection timeout

```bash
# Render puts free databases to sleep after 7 days
# Solution: Make a request every 7 days or upgrade to paid tier

# Test connection:
curl https://crownbids-api.onrender.com/health
```

### Contract data empty

```bash
# Run seed script manually:
1. Go to Render service
2. Click "Shell" tab
3. Run: npm run seed
4. Wait for completion
5. Verify: curl https://crownbids-api.onrender.com/api/contracts
```

---

## PART 11: Performance Optimization

### Frontend Optimizations

1. **Minify CSS/JS:**
   ```bash
   # Before deployment
   minify styles.css > styles.min.css
   minify app.js > app.min.js
   ```

2. **Enable Compression:**
   ```javascript
   // In backend server.js
   const compression = require('compression');
   app.use(compression());
   ```

3. **Add Caching Headers:**
   ```javascript
   app.use(express.static('public', {
     maxAge: '1d',
     etag: false
   }));
   ```

### Backend Optimizations

1. **Add Database Indexes:**
   ```sql
   CREATE INDEX idx_contracts_search ON contracts
   USING GIN(to_tsvector('english', title || ' ' || description));
   ```

2. **Enable Query Caching:**
   - Already implemented with 1-hour TTL
   - Monitor cache hit rate

3. **Use Connection Pooling:**
   - Already configured with max 20 connections

---

## PART 12: Security Checklist

- [ ] All environment variables in `.env` (not in code)
- [ ] HTTPS enabled (automatic with Render/Vercel)
- [ ] Rate limiting enabled (100 req/15 min)
- [ ] CORS properly configured
- [ ] Security headers enabled (Helmet middleware)
- [ ] No sensitive data in error messages
- [ ] Database password strong (auto-generated)
- [ ] Regular backups enabled
- [ ] SSL certificate valid
- [ ] No console logs in production

---

## Next Steps

After successful deployment:

1. **Add Authentication** (2-3 hours)
   - User registration/login
   - JWT tokens
   - Save contracts feature

2. **Add Payment Processing** (4-5 hours)
   - Stripe integration
   - Proposal writing service
   - Invoice generation

3. **Marketing & Launch** (ongoing)
   - Email campaigns
   - Social media
   - Blog posts
   - SEO optimization

---

## Support & Resources

**Documentation:**
- [Backend README](backend/README.md)
- [Frontend Setup](README.md)
- [Product Roadmap](PRODUCT_ROADMAP.md)

**External Help:**
- Render Support: https://render.com/support
- Vercel Docs: https://vercel.com/docs
- Database Issues: https://www.postgresql.org/docs/

**Deployment Status:**
Check status pages:
- https://status.render.com
- https://www.vercel-status.com

---

**Congratulations! Your application is now in production! 🎉**

Monitor it regularly and continue adding features to make it even better.
