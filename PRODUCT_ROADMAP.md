# CrownBids Production Roadmap

## Current State
- ✅ Client-side demo with mock data
- ✅ URL keyword matching (client-side only)
- ✅ Match score calculation
- ✅ Modern UI with scanning animation
- ✅ 15 mock contracts across 3 categories

## Vision: Working Product
Transform CrownBids into a fully functional SaaS platform that:
1. Fetches **real** Canadian government contracts daily
2. **Actually analyzes** company websites (not just URL keywords)
3. Provides **personalized** contract recommendations
4. Converts users to **paid proposal writing services**
5. Scales to **thousands of users**

---

## Phase 1: Real Data Integration (Week 1-2)

### Data Sources (Canadian Government Contracts)

**Primary Sources:**
1. **buyandsell.gc.ca** - Government of Canada's official tender site
   - API: https://buyandsell.gc.ca/cds/public/api
   - Format: JSON/XML
   - Coverage: Federal contracts $10k+

2. **MERX** - Canadian public tenders platform
   - Website: https://merx.com
   - Coverage: Federal, provincial, municipal
   - Note: May require subscription for full access

3. **Provincial/Municipal Sites:**
   - Ontario: https://www.doingbusiness.mgs.gov.on.ca/
   - BC: https://www.bcbid.gov.bc.ca/
   - Quebec: https://www.seao.ca/

**Technical Implementation:**
- Build a Node.js scraper/API service
- Run daily cron jobs to fetch new contracts
- Store in database (PostgreSQL or MongoDB)
- Cache results for fast frontend queries

**Deliverables:**
- [ ] API integration with buyandsell.gc.ca
- [ ] Database schema for contracts
- [ ] Daily sync job (cron)
- [ ] Admin dashboard to view synced contracts

---

## Phase 2: Backend Infrastructure (Week 2-3)

### Technology Stack Recommendation

**Backend:**
- **Node.js + Express** (familiar, fast to build)
- **Python + FastAPI** (better for ML/NLP later)

**Database:**
- **PostgreSQL** - Structured contract data
- **Redis** - Caching for match scores

**Hosting Options:**
1. **Easy Start: Render.com or Railway.app**
   - Free tier available
   - Auto-deploy from GitHub
   - PostgreSQL included

2. **Scalable: AWS or Google Cloud**
   - More complex setup
   - Better for long-term scaling

**API Endpoints Needed:**
```
GET  /api/contracts              - List all active contracts
GET  /api/contracts/:id          - Get single contract
POST /api/analyze                - Analyze company URL
POST /api/leads                  - Submit lead for proposal service
POST /api/checkout               - Create payment session
```

**Deliverables:**
- [ ] Node.js/Express API server
- [ ] PostgreSQL database setup
- [ ] Deploy to Render/Railway
- [ ] Environment variables (.env) for API keys

---

## Phase 3: Intelligent URL Analysis (Week 3-4)

### Current: Keyword matching from URL only
### Target: Actually fetch and analyze website content

**Approach 1: Web Scraping (Simpler)**
- Use Puppeteer or Cheerio to fetch website HTML
- Extract text from homepage + services page
- Keyword matching with expanded dictionary
- Pros: No external dependencies
- Cons: Less accurate, easily fooled

**Approach 2: AI/NLP Analysis (Better)**
- Use OpenAI API or Claude API to analyze website content
- Prompt: "What services does this company provide? Categories: Security, Janitorial, Landscaping, Construction, IT, etc."
- Pros: Much more accurate, understands context
- Cons: Costs ~$0.01 per analysis

**Recommended: Hybrid Approach**
1. Scrape website content (homepage + services/about pages)
2. Extract key phrases (services offered, certifications, experience)
3. Use Claude API for smart categorization
4. Cache results for 30 days per domain

**Deliverables:**
- [ ] Web scraping service (Puppeteer)
- [ ] Integration with Claude API for analysis
- [ ] Enhanced matching algorithm
- [ ] Caching layer (Redis)

---

## Phase 4: User Accounts & Personalization (Week 4-5)

**Why Users Need Accounts:**
- Save favorite contracts
- Email notifications for new matches
- Track proposal requests
- Build user profile over time

**Authentication Options:**
1. **Simple: Email + Password**
   - Use bcrypt for password hashing
   - JWT tokens for sessions

2. **Better: OAuth (Google/LinkedIn)**
   - Faster signup (1 click)
   - Higher trust
   - Use Passport.js or Auth0

**Database Schema:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  company_name VARCHAR(255),
  website_url VARCHAR(255),
  industry VARCHAR(100),
  created_at TIMESTAMP
);

CREATE TABLE saved_contracts (
  user_id INT REFERENCES users(id),
  contract_id INT,
  saved_at TIMESTAMP
);

CREATE TABLE proposal_requests (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  contract_id INT,
  status VARCHAR(50), -- pending, in_progress, completed
  payment_status VARCHAR(50),
  created_at TIMESTAMP
);
```

**Deliverables:**
- [ ] User registration + login pages
- [ ] JWT authentication middleware
- [ ] "Save Contract" functionality
- [ ] User dashboard page

---

## Phase 5: Payment & Conversion (Week 5-6)

**Stripe Integration:**
- Product: "Proposal Writing Service - Pilot"
- Price: $1,500 CAD
- Flow: User clicks "Get Help Writing This" → Stripe Checkout → Payment → Lead to your team

**Implementation:**
```javascript
// Backend
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/checkout', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'cad',
        product_data: {
          name: 'Proposal Writing Service - Pilot',
        },
        unit_amount: 150000, // $1,500 CAD in cents
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: 'https://crownbids.com/success',
    cancel_url: 'https://crownbids.com/canceled',
  });

  res.json({ url: session.url });
});
```

**Email Notifications:**
- Use SendGrid or Mailgun
- Send to user: "Payment confirmed, we'll contact you within 24h"
- Send to your team: "New proposal request for [Contract Name]"

**Deliverables:**
- [ ] Stripe account setup
- [ ] Payment integration
- [ ] Success/cancel pages
- [ ] Email notification system

---

## Phase 6: Production Deployment (Week 6-7)

**Domain & Hosting:**
- Register domain: crownbids.com or crownbids.ca
- Frontend: Vercel, Netlify, or Cloudflare Pages
- Backend: Render.com, Railway.app, or AWS
- Database: Render PostgreSQL or AWS RDS

**Performance Optimization:**
- Enable Redis caching
- CDN for static assets
- Compress images
- Lazy load contract cards

**Security:**
- HTTPS/SSL (automatic with most hosts)
- Rate limiting on API endpoints
- Input sanitization
- CORS configuration

**Analytics:**
- Google Analytics for traffic
- Mixpanel or Amplitude for user behavior
- Stripe Dashboard for revenue

**Deliverables:**
- [ ] Custom domain setup
- [ ] Production deployment
- [ ] SSL certificate
- [ ] Analytics integration
- [ ] Error monitoring (Sentry)

---

## Cost Breakdown (Monthly)

### Minimum Viable Product:
- **Hosting (Render.com):** $7/month (starter plan)
- **Database:** Free tier (10GB)
- **Domain:** $15/year (~$1.25/month)
- **Claude API:** ~$20/month (200 analyses)
- **Email (SendGrid):** Free tier (100 emails/day)
- **Total: ~$30/month**

### Growth Stage (1000+ users):
- **Hosting:** $25-50/month
- **Database:** $15/month
- **Claude API:** $100/month
- **Email:** $15/month
- **CDN:** $10/month
- **Total: ~$165-190/month**

---

## Revenue Model

**Proposal Writing Service:**
- Price: $1,500 per proposal (pilot pricing)
- Target: 5 clients/month = $7,500/month
- Break-even: 1 client covers all infrastructure costs

**Potential Upsells:**
- Premium subscription: $50/month (unlimited alerts, priority matching)
- Contract training/consulting: $500/session
- White-label for agencies: $500/month

---

## Next Steps: What Should We Build First?

**Option A: Data-First Approach**
Start by integrating real contract data, even without fancy URL analysis. Users can browse real contracts immediately.

**Option B: Feature-First Approach**
Keep mock data but build the full user flow: accounts, payments, email notifications. Validate business model before investing in data.

**Option C: MVP Hybrid**
- Real contract data (buyandsell.gc.ca API)
- Simple backend (Node.js + PostgreSQL)
- Keep client-side URL matching for now
- Add Stripe payment for proposal service
- Deploy to production domain

**My Recommendation: Option C (MVP Hybrid)**
This gets you to market fastest with real value:
1. Users see real contracts (not mocks)
2. URL analysis still works (good enough for v1)
3. Payment system allows revenue
4. Can iterate based on real user feedback

---

## Questions to Answer:

1. **What's your timeline?** (Launch in 1 month? 3 months?)
2. **Technical comfort level?** (I can build the backend, or guide you through it)
3. **Budget?** ($30/month is fine? Or unlimited?)
4. **Primary goal?** (Get first paying customer ASAP? Or build perfect product first?)
5. **Do you have a team?** (Will you write proposals yourself, or outsource?)

Let me know your priorities, and I'll start building!
