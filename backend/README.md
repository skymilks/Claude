# CrownBids Backend API

Production-ready backend API for CrownBids - Canadian Government Contracts Platform.

## Features

- ✅ **Real Contract Data**: Integrates with buyandsell.gc.ca API
- ✅ **Smart URL Analysis**: Scrapes and analyzes company websites
- ✅ **Intelligent Matching**: AI-powered contract-to-company matching
- ✅ **PostgreSQL Database**: Structured storage with caching
- ✅ **RESTful API**: Clean, documented endpoints
- ✅ **Security**: Rate limiting, helmet, CORS protection
- ✅ **Production Ready**: Error handling, logging, health checks

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Caching**: Node-Cache (in-memory)
- **Web Scraping**: Cheerio + Axios
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb crownbids
```

**Option B: Use Render PostgreSQL** (Recommended for production)
- Sign up at https://render.com
- Create a new PostgreSQL database
- Copy the connection details

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crownbids
DB_USER=postgres
DB_PASSWORD=your_password
FRONTEND_URL=http://localhost:3000
```

### 4. Initialize Database

The database tables will be created automatically on first run.

### 5. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and uptime.

### Contracts

#### Get All Contracts
```
GET /api/contracts?category=security&limit=20
```

**Query Parameters:**
- `category` (optional): Filter by category (security, janitorial, landscaping, etc.)
- `minValue` (optional): Minimum contract value
- `maxValue` (optional): Maximum contract value
- `limit` (optional): Max results (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": 1,
      "title": "24/7 Security Guard Services",
      "department": "Public Services and Procurement Canada",
      "value": 850000,
      "category": "security",
      "keywords": ["security", "guard", "patrol"],
      "close_date": "2025-12-20T00:00:00.000Z",
      "source_url": "https://buyandsell.gc.ca/..."
    }
  ]
}
```

#### Get Single Contract
```
GET /api/contracts/:id
```

#### Sync Contracts
```
POST /api/contracts/sync
```
Manually trigger sync from government API.

### URL Analysis

#### Analyze Company URL
```
POST /api/analyze
Content-Type: application/json

{
  "url": "https://apexsecurity.com"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "url": "https://apexsecurity.com",
    "category": "security",
    "keywords": ["security", "guard", "patrol"],
    "confidence": "high"
  },
  "matches": {
    "count": 12,
    "contracts": [
      {
        "id": 1,
        "title": "24/7 Security Guard Services",
        "match_score": 95,
        ...
      }
    ]
  }
}
```

#### Get Categories
```
GET /api/analyze/categories
```

Returns list of available contract categories.

## Database Schema

### Contracts Table
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

### Users Table (for future auth)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  company_name VARCHAR(255),
  website_url VARCHAR(255),
  industry VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Deployment

### Deploy to Render.com (Recommended)

1. **Push code to GitHub**
```bash
git add .
git commit -m "Add backend API"
git push origin your-branch
```

2. **Create Render account**
- Go to https://render.com
- Sign up with GitHub

3. **Create PostgreSQL database**
- Dashboard → New → PostgreSQL
- Name: `crownbids-db`
- Free tier is fine for testing
- Copy the "Internal Database URL"

4. **Create Web Service**
- Dashboard → New → Web Service
- Connect your GitHub repo
- Settings:
  - **Name**: `crownbids-api`
  - **Environment**: `Node`
  - **Build Command**: `cd backend && npm install`
  - **Start Command**: `cd backend && npm start`
  - **Instance Type**: `Free`

5. **Add Environment Variables**
- Go to Environment section
- Add these variables:
  ```
  NODE_ENV=production
  DATABASE_URL=[paste your database URL]
  FRONTEND_URL=https://your-frontend-url.com
  ```

6. **Deploy**
- Click "Create Web Service"
- Wait for deployment (2-3 minutes)
- Your API will be live at `https://crownbids-api.onrender.com`

### Deploy to Railway.app (Alternative)

1. **Install Railway CLI**
```bash
npm install -g railway
```

2. **Login and Initialize**
```bash
railway login
railway init
```

3. **Add PostgreSQL**
```bash
railway add postgresql
```

4. **Deploy**
```bash
railway up
```

Railway will automatically detect your Node.js app and deploy it.

## Testing

### Manual Testing

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Test contracts endpoint:
```bash
curl http://localhost:3001/api/contracts?limit=5
```

Test URL analysis:
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://apexsecurity.com"}'
```

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.js         # Database connection
│   ├── routes/
│   │   ├── contracts.js        # Contract endpoints
│   │   └── analyze.js          # Analysis endpoints
│   ├── services/
│   │   ├── contractsService.js # Contract business logic
│   │   └── urlAnalysisService.js # URL analysis logic
│   ├── middleware/             # Custom middleware (future)
│   ├── models/                 # Database models (future)
│   └── server.js               # Express app entry point
├── .env.example                # Environment template
├── package.json
└── README.md
```

### Adding New Endpoints

1. Create route file in `src/routes/`
2. Add business logic in `src/services/`
3. Import and mount route in `src/server.js`

### Database Migrations

For production, consider using a migration tool like:
- [node-pg-migrate](https://github.com/salsita/node-pg-migrate)
- [Sequelize](https://sequelize.org/) (full ORM)
- [Knex.js](http://knexjs.org/) (query builder)

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 3001
lsof -i :3001

# Kill the process
kill -9 [PID]
```

### Database Connection Error
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists: `psql -l`

### API Returns Empty Contracts
- Run sync manually: `POST /api/contracts/sync`
- Check government API status
- Fallback mock data will be used if API fails

## Performance Optimization

### Current Caching Strategy
- Contracts: 1 hour in-memory cache
- URL Analysis: 30 days in-memory cache

### For Production (High Traffic)
Consider adding:
- **Redis** for distributed caching
- **CDN** for static responses
- **Load balancer** for multiple instances
- **Database indexes** on frequently queried fields

## Security Checklist

- [x] Rate limiting (100 requests / 15 min)
- [x] CORS configured
- [x] Helmet security headers
- [x] Environment variables for secrets
- [x] Input validation
- [ ] JWT authentication (coming soon)
- [ ] API key for /sync endpoint (recommended)
- [ ] SQL injection prevention (using parameterized queries)

## Next Steps

1. **Add Authentication**
   - JWT-based user auth
   - Protected endpoints

2. **Add Payment Integration**
   - Stripe for proposal service
   - Webhook handling

3. **Add Email Notifications**
   - SendGrid integration
   - Contract alerts

4. **Add Admin Dashboard**
   - Monitor API usage
   - Manage contracts

5. **Add Testing**
   - Jest for unit tests
   - Supertest for API tests

## Support

For issues or questions:
- Check logs: `tail -f logs/app.log` (if using PM2)
- Review API responses for error details
- Check database connection

## License

MIT
