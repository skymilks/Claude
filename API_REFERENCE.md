# 📚 CrownBids API Reference

**Complete API documentation for CrownBids backend**

---

## Base URL

- **Local Development:** `http://localhost:3001`
- **Production:** `https://crownbids-api.onrender.com`

## Authentication

Currently, no authentication is required. Future versions will use JWT tokens.

## Response Format

All endpoints return JSON responses with a standard format:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

On error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Error description",
    "status": 400
  }
}
```

---

## Endpoints

### Health Check

**Check if the API is running and healthy.**

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T14:23:45.123Z",
  "uptime": 3600.5
}
```

**Use Case:** Monitoring and health checks

---

## Contracts Endpoints

### GET /api/contracts

**Get all active contracts with optional filters.**

```http
GET /api/contracts
GET /api/contracts?limit=10&category=security&minValue=100000
```

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `limit` | number | No | Max results (default: all) | `?limit=10` |
| `category` | string | No | Filter by category | `?category=security` |
| `minValue` | number | No | Minimum contract value | `?minValue=100000` |
| `maxValue` | number | No | Maximum contract value | `?maxValue=1000000` |
| `status` | string | No | Filter by status (active/closed) | `?status=active` |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 1,
        "external_id": "gov-sec-001",
        "title": "24/7 Security Guard Services for Federal Building",
        "description": "Professional security guard services including...",
        "department": "Public Services and Procurement Canada",
        "value": 850000,
        "currency": "CAD",
        "status": "active",
        "category": "security",
        "keywords": ["security", "guard", "patrol", "cctv"],
        "location": "Ottawa, Ontario",
        "close_date": "2025-01-08T00:00:00.000Z",
        "publish_date": "2024-11-24T00:00:00.000Z",
        "source": "buyandsell.gc.ca",
        "source_url": "https://buyandsell.gc.ca/",
        "created_at": "2024-12-09T14:00:00.000Z",
        "updated_at": "2024-12-09T14:00:00.000Z"
      }
    ],
    "count": 18,
    "cached": true,
    "cacheExpiresIn": 3599
  }
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Error fetching contracts",
    "status": 500
  }
}
```

**Examples:**

```bash
# Get first 5 contracts
curl "http://localhost:3001/api/contracts?limit=5"

# Get security contracts only
curl "http://localhost:3001/api/contracts?category=security"

# Get contracts between $500K and $1M
curl "http://localhost:3001/api/contracts?minValue=500000&maxValue=1000000"

# Get IT contracts worth more than $1M
curl "http://localhost:3001/api/contracts?category=it&minValue=1000000"
```

**Caching:** Results are cached for 1 hour. The response includes `cached: true` and `cacheExpiresIn` (seconds).

---

### GET /api/contracts/:id

**Get a specific contract by ID.**

```http
GET /api/contracts/1
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Contract ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "contract": {
      "id": 1,
      "external_id": "gov-sec-001",
      "title": "24/7 Security Guard Services for Federal Building",
      "description": "Provision of professional security guard services...",
      "department": "Public Services and Procurement Canada",
      "value": 850000,
      "currency": "CAD",
      "status": "active",
      "category": "security",
      "keywords": ["security", "guard", "patrol", "cctv", "monitoring"],
      "location": "Ottawa, Ontario",
      "close_date": "2025-01-08T00:00:00.000Z",
      "publish_date": "2024-11-24T00:00:00.000Z",
      "source": "buyandsell.gc.ca",
      "source_url": "https://buyandsell.gc.ca/",
      "created_at": "2024-12-09T14:00:00.000Z",
      "updated_at": "2024-12-09T14:00:00.000Z"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Contract not found",
    "status": 404
  }
}
```

**Examples:**

```bash
# Get contract with ID 1
curl "http://localhost:3001/api/contracts/1"

# Get contract with ID 5
curl "http://localhost:3001/api/contracts/5"
```

---

## Analysis Endpoints

### POST /api/analyze

**Analyze a company website and get matched contracts.**

```http
POST /api/analyze
Content-Type: application/json

{
  "url": "https://www.example-company.com"
}
```

**Request Body:**

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|------------|
| `url` | string | Yes | Company website URL | Must be valid URL |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "url": "https://www.apexsecurity.com",
      "title": "Apex Security Corp",
      "category": "security",
      "confidence": 0.92,
      "keywords": ["security", "guard", "patrol", "surveillance", "armed", "monitoring"],
      "description_summary": "Professional security services including armed guards, surveillance systems, and access control."
    },
    "matches": {
      "contracts": [
        {
          "id": 1,
          "title": "24/7 Security Guard Services for Federal Building",
          "department": "Public Services and Procurement Canada",
          "value": 850000,
          "category": "security",
          "matchScore": 86,
          "location": "Ottawa, Ontario",
          "close_date": "2025-01-08T00:00:00.000Z",
          "reasons": [
            "Category match (security): +75%",
            "Keyword match (guard): +3%",
            "Keyword match (security): +3%",
            "Title match (surveillance): +2%",
            "Description match (monitoring): +1%",
            "Description match (access control): +1%"
          ]
        },
        {
          "id": 2,
          "title": "Security System Installation and Maintenance",
          "department": "Department of National Defence",
          "value": 1200000,
          "category": "security",
          "matchScore": 78,
          "location": "Halifax, Nova Scotia",
          "close_date": "2025-01-23T00:00:00.000Z",
          "reasons": [
            "Category match (security): +75%",
            "Keyword match (surveillance): +2%",
            "Keyword match (monitoring): +1%"
          ]
        }
      ],
      "topMatches": 2,
      "totalMatches": 5,
      "sortedBy": "matchScore"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Invalid URL:
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Invalid URL format",
    "status": 400
  }
}
```

**500 Internal Server Error** - Analysis failed:
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Failed to analyze URL",
    "status": 500
  }
}
```

**Examples:**

```bash
# Analyze a security company
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apexsecurity.com"}'

# Analyze a construction company
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.buildingcorp.ca"}'

# Analyze an IT services company
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.cloudtech-solutions.io"}'
```

**Matching Algorithm:**

1. Website content is analyzed to detect business category
2. Keywords are extracted from website text
3. All active contracts are searched
4. Match score calculated:
   - Base 75% for category match
   - +3% for keywords in contract keywords
   - +2% for keywords in contract title
   - +1% for keywords in contract description
   - Maximum capped at 98%
5. Results sorted by match score (highest first)

**Caching:** Results are cached for 30 days per URL.

---

### POST /api/analyze/batch

**Analyze multiple websites at once (coming soon).**

```http
POST /api/analyze/batch
Content-Type: application/json

{
  "urls": [
    "https://www.company1.com",
    "https://www.company2.com"
  ]
}
```

**Note:** This endpoint will be added in Phase 2.

---

## Categories

**Available contract categories:**

1. **security** - Security services, guards, surveillance, access control
2. **janitorial** - Cleaning, sanitation, waste management, maintenance
3. **landscaping** - Lawn care, snow removal, grounds maintenance, tree services
4. **construction** - Building, renovation, electrical, plumbing, HVAC, roofing
5. **it** - Software, cloud services, cybersecurity, network, development
6. **consulting** - Strategy, advisory, research, training, management
7. **other** - Any other category

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit:** 100 requests per 15 minutes per IP address
- **Headers:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 99`
  - `X-RateLimit-Reset: 1702145045`

**Error Response (429 Too Many Requests):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Too many requests, please try again later",
    "status": 429
  }
}
```

---

## Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Contract not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database connection failed |

### Common Errors

**Invalid URL:**
```json
{
  "error": {
    "message": "Invalid URL format. Please provide a valid URL starting with http:// or https://",
    "status": 400
  }
}
```

**Database Connection:**
```json
{
  "error": {
    "message": "Database connection failed",
    "status": 500
  }
}
```

**Contract Not Found:**
```json
{
  "error": {
    "message": "Contract with ID 999 not found",
    "status": 404
  }
}
```

---

## Request/Response Examples

### Using cURL

```bash
# Get all contracts
curl http://localhost:3001/api/contracts

# Get with limit
curl "http://localhost:3001/api/contracts?limit=5"

# Get specific contract
curl http://localhost:3001/api/contracts/1

# Analyze website
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Using JavaScript Fetch

```javascript
// Get all contracts
fetch('http://localhost:3001/api/contracts')
  .then(res => res.json())
  .then(data => console.log(data.data.contracts));

// Get specific contract
fetch('http://localhost:3001/api/contracts/1')
  .then(res => res.json())
  .then(data => console.log(data.data.contract));

// Analyze website
fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://www.example.com'
  })
})
  .then(res => res.json())
  .then(data => console.log(data.data.matches));
```

### Using Python Requests

```python
import requests
import json

# Get all contracts
response = requests.get('http://localhost:3001/api/contracts')
contracts = response.json()['data']['contracts']

# Get specific contract
response = requests.get('http://localhost:3001/api/contracts/1')
contract = response.json()['data']['contract']

# Analyze website
response = requests.post(
  'http://localhost:3001/api/analyze',
  json={'url': 'https://www.example.com'}
)
matches = response.json()['data']['matches']['contracts']
```

### Using Postman

1. Import the requests:
   - Method: `GET` → URL: `http://localhost:3001/api/contracts`
   - Method: `GET` → URL: `http://localhost:3001/api/contracts/1`
   - Method: `POST` → URL: `http://localhost:3001/api/analyze`
     - Body (raw JSON): `{"url": "https://example.com"}`

2. Click "Send"

---

## Pagination (Future)

Pagination will be implemented in Phase 2:

```http
GET /api/contracts?page=1&limit=10
```

Response will include:
```json
{
  "data": {
    "contracts": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 18,
      "totalPages": 2
    }
  }
}
```

---

## Filtering (Advanced)

**Advanced filters will be added in Phase 2:**

```http
GET /api/contracts?search=security&department=PSPC&minValue=500000&maxValue=1000000
```

---

## Webhooks (Future)

**Webhook support coming in Phase 3:**

```http
POST /api/webhooks/register
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/contracts",
  "events": ["contract.created", "contract.updated"]
}
```

---

## API Versioning

Currently at **v1.0.0**

Future versions will use URL paths:
- `/api/v1/contracts`
- `/api/v2/contracts`

---

## Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1702145045
```

---

## CORS

API is configured for CORS with:

```
Allow-Origin: http://localhost:8000  (development)
Allow-Origin: https://crownbids.vercel.app  (production)
Allow-Methods: GET, POST, OPTIONS
Allow-Headers: Content-Type
```

---

## Best Practices

1. **Cache responses** - Results are cached for optimal performance
2. **Use pagination** - When implemented, limit results to 10-20 items
3. **Handle errors** - Always check response status
4. **Use filtering** - Reduce results with category and value filters
5. **Batch requests** - Use batch endpoint when analyzing multiple URLs
6. **Respect rate limits** - Stay under 100 requests/15 minutes

---

## Support

**Having issues?**

1. Check the error message - it usually explains the problem
2. Verify your URL format (must start with `http://` or `https://`)
3. Check rate limit headers (`X-RateLimit-Remaining`)
4. Ensure backend is running (`curl http://localhost:3001/health`)
5. Check logs for detailed error information

---

## Changelog

### v1.0.0 (Current)
- ✅ GET /api/contracts
- ✅ GET /api/contracts/:id
- ✅ POST /api/analyze
- ✅ GET /health

### v1.1.0 (Planned)
- 🔄 Pagination support
- 🔄 Advanced filtering
- 🔄 Search functionality
- 🔄 POST /api/analyze/batch

### v2.0.0 (Planned)
- 🔄 Authentication & JWT tokens
- 🔄 User endpoints
- 🔄 Saved contracts
- 🔄 Webhooks

---

## License

This API is part of the CrownBids project and is available under the MIT License.

---

**Questions? Check [QUICK_START.md](QUICK_START.md) for usage examples or [backend/README.md](backend/README.md) for detailed backend documentation.**
