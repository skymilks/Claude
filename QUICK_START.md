# 🚀 CrownBids Quick Start Guide

**Get CrownBids running locally in 10 minutes**

---

## Prerequisites

Ensure you have installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

Verify installations:
```bash
node --version    # Should be v18+
npm --version     # Should be v9+
postgres --version # Should be 12+
git --version     # Any recent version
```

---

## 5-Minute Setup

### 1. Start PostgreSQL (1 min)

**macOS:**
```bash
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo service postgresql start
```

**Windows:**
- PostgreSQL should already be running if installed
- Check Start Menu → PostgreSQL

### 2. Create Database (1 min)

```bash
createdb crownbids
```

### 3. Set Up Backend (2 min)

```bash
cd backend
npm install
npm run seed
```

You should see:
```
✅ Database tables initialized successfully
✅ Inserted 18 contracts
📊 Contract Statistics:
   Total Active Contracts: 18
   Total Contract Value: $38.07M
```

### 4. Start Backend (1 min)

```bash
npm run dev
```

You should see:
```
🚀 CrownBids API server running on port 3001
📊 Environment: development
🔗 Health check: http://localhost:3001/health
✅ Database connected successfully
```

**Leave this running! Open a new terminal for the next step.**

### 5. Start Frontend (1 min)

```bash
# From root directory (not backend/)
python3 -m http.server 8000
```

Open your browser to **http://localhost:8000**

---

## Test It Works

### Test Backend API

```bash
# Health check
curl http://localhost:3001/health

# Get contracts
curl http://localhost:3001/api/contracts?limit=3

# Analyze a website
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com"}'
```

### Test Frontend

1. Open http://localhost:8000 in browser
2. Type in a company website (e.g., `https://www.apexsecurity.com`)
3. Click "Analyze & Match"
4. See matched contracts appear with scores

---

## File Structure

```
CrownBids/
├── backend/                    # Node.js API
│   ├── src/
│   │   ├── server.js          # Express app
│   │   ├── config/
│   │   │   └── database.js    # PostgreSQL setup
│   │   ├── routes/
│   │   │   ├── contracts.js   # GET contracts
│   │   │   └── analyze.js     # POST analysis
│   │   ├── services/
│   │   │   ├── contractsService.js    # Matching logic
│   │   │   └── urlAnalysisService.js  # Web scraping
│   │   └── scripts/
│   │       └── seed-database.js       # Populate contracts
│   ├── .env                   # Configuration
│   ├── package.json           # Dependencies
│   └── README.md              # Backend docs
│
├── index.html                 # Frontend UI
├── styles.css                 # Styling
├── app.js                     # Frontend logic
├── api-service.js             # API integration
├── config.js                  # Frontend config
└── utils.js                   # Helper functions
```

---

## Common Commands

### Backend Commands

```bash
cd backend

# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start

# Seed database with contracts
npm run seed

# Run tests (when available)
npm test
```

### Frontend Commands

```bash
# Start local web server (from root directory)
python3 -m http.server 8000

# Or with Node.js
npx http-server
```

### Database Commands

```bash
# Connect to database
psql crownbids

# View all contracts
SELECT * FROM contracts;

# Count contracts
SELECT COUNT(*) FROM contracts;

# Check users table
SELECT * FROM users;

# Exit
\q
```

---

## API Endpoints

### Contracts Endpoints

**Get all contracts:**
```bash
GET http://localhost:3001/api/contracts
GET http://localhost:3001/api/contracts?limit=10
GET http://localhost:3001/api/contracts?category=security
GET http://localhost:3001/api/contracts?minValue=500000&maxValue=1000000
```

**Get single contract:**
```bash
GET http://localhost:3001/api/contracts/1
```

### Analysis Endpoints

**Analyze URL and match contracts:**
```bash
POST http://localhost:3001/api/analyze
Content-Type: application/json

{
  "url": "https://www.example-company.com"
}
```

Response:
```json
{
  "success": true,
  "analysis": {
    "url": "https://www.example-company.com",
    "category": "security",
    "keywords": ["security", "guard", "surveillance"],
    "confidence": 0.85
  },
  "matches": {
    "contracts": [
      {
        "id": 1,
        "title": "24/7 Security Guard Services",
        "matchScore": 86,
        "department": "PSPC",
        "value": 850000
      }
    ]
  }
}
```

### Health Check

```bash
GET http://localhost:3001/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-12-09T...",
  "uptime": 120.5
}
```

---

## Database Schema

### contracts table
```sql
CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  department VARCHAR(255),
  value DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'CAD',
  status VARCHAR(50),
  category VARCHAR(100),
  keywords TEXT[],
  location VARCHAR(255),
  close_date TIMESTAMP,
  publish_date TIMESTAMP,
  source VARCHAR(100),
  source_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### users table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  company_name VARCHAR(255),
  website_url VARCHAR(255),
  industry VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

### saved_contracts table
```sql
CREATE TABLE saved_contracts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contract_id)
);
```

---

## Configuration

### Frontend Configuration (`config.js`)

```javascript
const CONFIG = {
  app: {
    name: 'CrownBids',
    version: '1.0.0',
    environment: 'development'  // or 'production'
  },
  api: {
    // Local development
    backendUrl: 'http://localhost:3001/api',

    // Production
    // backendUrl: 'https://crownbids-api.onrender.com/api'
  },
  features: {
    realTimeData: false,      // Enable backend API
    authentication: false,    // Enable user auth
    premiumFeatures: false,   // Enable premium features
    analytics: false,         // Enable analytics
    notifications: false      // Enable notifications
  }
};
```

### Backend Configuration (`.env`)

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crownbids
DB_USER=postgres
DB_PASSWORD=

# API Keys (optional)
# CLAUDE_API_KEY=your_key
# STRIPE_SECRET_KEY=your_key
# SENDGRID_API_KEY=your_key
```

---

## Troubleshooting

### PostgreSQL won't start

```bash
# Check if running
pg_isready

# macOS - restart brew
brew services restart postgresql

# Linux - restart service
sudo service postgresql restart
```

### "Database does not exist" error

```bash
# Create the database
createdb crownbids

# Or create inside psql
psql
postgres=# CREATE DATABASE crownbids;
postgres=# \q
```

### Backend won't start on port 3001

```bash
# Check what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change the port in .env
PORT=3002
```

### Frontend can't reach backend

1. Ensure backend is running: `npm run dev`
2. Check `config.js` has correct API URL
3. Open DevTools (F12) → Console
4. Check for CORS errors
5. Verify backend `.env` has `FRONTEND_URL=http://localhost:8000`

### "npm: command not found"

```bash
# You need Node.js installed
# Download from https://nodejs.org/

# Verify after install
npm --version
```

---

## Development Workflow

### Making Changes to Backend

1. Edit files in `backend/src/`
2. Backend auto-reloads (nodemon)
3. Check console for errors
4. Test endpoints with curl or Postman

### Making Changes to Frontend

1. Edit files in root directory (`.js`, `.css`, `.html`)
2. Refresh browser (Ctrl+R or Cmd+R)
3. Check console for errors (F12)
4. Hard refresh if CSS not updating (Ctrl+Shift+R)

### Adding New Contracts

Edit `backend/scripts/seed-database.js`:

```javascript
// Add to contracts array
{
  external_id: 'gov-custom-001',
  title: 'Your Contract Title',
  description: 'Detailed description...',
  department: 'Department Name',
  value: 500000,
  currency: 'CAD',
  status: 'active',
  category: 'security',
  keywords: ['security', 'guard'],
  location: 'Toronto, Ontario',
  close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  publish_date: new Date(),
  source: 'custom',
  source_url: 'https://example.com'
}
```

Then re-seed:
```bash
npm run seed
```

---

## Performance Tips

### Speed Up Development

1. Use `npm run dev` instead of `npm start` (faster reloads)
2. Keep browser DevTools closed (speeds up rendering)
3. Use code linter for faster debugging

### Optimize Backend

1. Database indexes (already created)
2. Query caching (1-hour TTL, already implemented)
3. Connection pooling (max 20, already configured)

### Optimize Frontend

1. Minimize large images
2. Lazy load contracts
3. Debounce search input (300ms, already done)

---

## What's Next?

After you're comfortable with the setup:

1. **Read the Backend README** - `backend/README.md`
2. **Deploy to Production** - `PRODUCTION_DEPLOYMENT.md`
3. **Add Authentication** - Coming soon
4. **Add Payments** - Coming soon

---

## Resources

**Official Documentation:**
- [Node.js Docs](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [MDN Web Docs](https://developer.mozilla.org/)

**In-Project Documentation:**
- [Backend README](backend/README.md)
- [Production Deployment](PRODUCTION_DEPLOYMENT.md)
- [Product Roadmap](PRODUCT_ROADMAP.md)
- [Launch Checklist](LAUNCH_CHECKLIST.md)

**Community Help:**
- Stack Overflow (tag your questions with Node.js, PostgreSQL, etc.)
- GitHub Issues (in this repo)

---

## Quick Reference Cheat Sheet

| Task | Command |
|------|---------|
| Start backend | `cd backend && npm run dev` |
| Start frontend | `python3 -m http.server 8000` |
| Seed database | `cd backend && npm run seed` |
| Connect to DB | `psql crownbids` |
| Test API | `curl http://localhost:3001/api/contracts` |
| View logs | Check terminal output |
| Stop server | `Ctrl+C` |
| Check health | `curl http://localhost:3001/health` |

---

**You're all set! Happy coding! 🚀**

For detailed deployment instructions, see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
