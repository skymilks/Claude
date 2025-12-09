# Marketing Agent - The Heart of Sales Funnel & Customer Growth

## Overview

The **Marketing Agent** is a specialized service focused on customer growth, sales funnel optimization, and making the application "sticky" (habit-forming). It's the strategic engine that drives acquisition, activation, retention, and expansion decisions.

### Core Philosophy

**"Make decisions about how the sales funnel works and how to make users come back."**

The Marketing Agent answers these critical questions:
- 📊 How many users are in each funnel stage?
- 🎯 Where are users dropping off?
- 🎯 What makes users stick?
- 💡 What features drive engagement?
- 🚀 How do we accelerate growth?

---

## Architecture

### Service Structure

The Marketing Agent is implemented as a Node.js service (`marketingService.js`) with the following responsibilities:

1. **Funnel Tracking** - Monitor customer journey through awareness → decision → retention → advocacy
2. **Stickiness Scoring** - Measure engagement and habit formation
3. **Growth Analysis** - Identify opportunities to accelerate growth
4. **Strategy Generation** - Provide actionable marketing strategies

### API Endpoints

All endpoints are exposed at `/api/marketing/*`:

#### 1. Funnel Metrics
```
GET /api/marketing/funnel?timeRange=30d
```

Returns comprehensive funnel analysis:
- User counts per stage
- Conversion rates between stages
- Bottlenecks and drop-off points
- Funnel health score

**Response:**
```json
{
  "success": true,
  "timeRange": "30d",
  "data": {
    "stages": {
      "awareness": {
        "users": 5000,
        "actions": 12500,
        "avgTimeSpent": 180,
        "bounceRate": 0.35,
        "completionRate": 0.85
      },
      "consideration": {
        "users": 2100,
        "actions": 6300,
        "avgTimeSpent": 420,
        "bounceRate": 0.25,
        "completionRate": 0.90
      }
      // ... more stages
    },
    "conversionRates": {
      "awareness_to_consideration": {
        "rate": "42.00%",
        "users": 2100,
        "drop": 2900
      }
      // ... more conversions
    },
    "bottlenecks": [
      {
        "transition": "awareness_to_consideration",
        "conversionRate": "42.00%",
        "severity": "high",
        "recommendation": "Improve onboarding experience and value proposition clarity"
      }
    ],
    "funnelHealth": {
      "status": "needs_attention",
      "avgConversionRate": "58.50%",
      "bottleneckCount": 2,
      "score": "58.50"
    }
  }
}
```

---

#### 2. Stickiness Score
```
GET /api/marketing/stickiness?userId=optional_user_id
```

Measures how "sticky" the application is - i.e., how engaging and habit-forming.

**Stickiness Factors:**
- **Daily Active Users** (25% weight) - Users returning daily
- **Contract Match Quality** (20% weight) - How good are recommendations
- **Feature Adoption** (15% weight) - Are users using all features?
- **Time on App** (15% weight) - How long do users spend?
- **Repeat Visits** (15% weight) - Do users come back?
- **Referral Rate** (10% weight) - Are users recommending to others?

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": null,
    "calculatedAt": "2024-12-09T...",
    "factors": {
      "daily_usage": {
        "name": "Daily Active Users",
        "value": 65.5,
        "weight": 0.25,
        "contribution": 16.375
      },
      "contract_matches": {
        "name": "Contract Match Quality",
        "value": 78.2,
        "weight": 0.20,
        "contribution": 15.64
      },
      // ... more factors
    },
    "overallScore": "72.45",
    "rating": "good",
    "recommendations": [
      {
        "factor": "time_on_app",
        "factorName": "Average Time in App",
        "currentScore": 42.1,
        "recommendation": "⏱️ Reduce load times and improve navigation UX",
        "priority": "high"
      },
      // ... more recommendations
    ]
  }
}
```

---

#### 3. Growth Opportunities
```
GET /api/marketing/growth
```

Analyzes growth levers and their potential for accelerating customer acquisition and expansion.

**Growth Levers:**
1. **Viral Loop** - Referral & sharing features (85 potential, 8 difficulty)
2. **Onboarding** - First-time user experience (75 potential, 6 difficulty)
3. **Notifications** - Timely engagement alerts (60 potential, 5 difficulty)
4. **Personalization** - Tailored recommendations (70 potential, 7 difficulty)
5. **Gamification** - Achievements & milestones (50 potential, 7 difficulty)
6. **Social Proof** - Reviews & testimonials (65 potential, 3 difficulty)
7. **Premium Features** - Monetization (40 potential, 8 difficulty)

**Response:**
```json
{
  "success": true,
  "data": {
    "generatedAt": "2024-12-09T...",
    "levers": {
      "viral_loop": {
        "name": "Referral & Sharing Features",
        "potential": 85,
        "difficulty": 8,
        "timeline": 8,
        "impactScore": "10.63",
        "recommendation": "Build referral program with incentives. Create 'invite friends' features with reward tracking."
      },
      "onboarding": {
        "name": "First-Time User Experience",
        "potential": 75,
        "difficulty": 6,
        "timeline": 4,
        "impactScore": "12.50",
        "recommendation": "Implement interactive onboarding flow. Show value proposition immediately. Reduce steps to first action."
      },
      // ... more levers
    },
    "topOpportunities": [
      {
        "lever": "onboarding",
        "name": "First-Time User Experience",
        "potential": 75,
        "difficulty": 6,
        "timeline": 4,
        "impactScore": "12.50",
        "recommendation": "..."
      },
      // ... more opportunities ranked by impact
    ]
  }
}
```

---

#### 4. Marketing Strategy
```
GET /api/marketing/strategy
```

Generates comprehensive marketing strategy with 5 phases: Acquisition → Activation → Retention → Expansion → Referral

**Response:**
```json
{
  "success": true,
  "data": {
    "generatedAt": "2024-12-09T...",
    "phases": {
      "acquisition": {
        "focus": "Drive awareness and user acquisition",
        "goals": [
          "Increase website traffic by 50%",
          "Improve conversion from visitor to signups by 30%",
          "Launch paid advertising campaigns"
        ],
        "tactics": [
          "SEO optimization for government contract keywords",
          "LinkedIn outreach to SMB owners",
          "Webinar series on government bidding",
          "Content marketing: guide to winning contracts"
        ],
        "metrics": ["CAC", "Landing page conversion rate", "Cost per signup"]
      },
      "activation": {
        "focus": "First-time user experience and value realization",
        "goals": [
          "Improve onboarding completion rate to 80%",
          "Get 70% of users to analyze their first contract",
          "Reduce time to first match to < 2 minutes"
        ],
        "tactics": [
          "Personalized onboarding based on company type",
          "Email sequence highlighting key features",
          "In-app walkthroughs for critical features",
          "Proactive customer support during first week"
        ],
        "metrics": ["Onboarding completion rate", "First action rate", "Feature adoption"]
      },
      "retention": {
        "focus": "Build habits and reduce churn",
        "goals": [
          "Achieve 40% monthly active user rate",
          "Increase average session duration to 10+ minutes",
          "Reduce monthly churn to < 5%"
        ],
        "tactics": [
          "Daily email digest of new contract matches",
          "Weekly 'opportunities you might have missed' email",
          "In-app achievement system and streaks",
          "Community features: share wins, get advice"
        ],
        "metrics": ["DAU/MAU ratio", "Session duration", "Churn rate"]
      },
      "expansion": {
        "focus": "Increase revenue and lifetime value",
        "goals": [
          "Launch premium tier with 20% adoption",
          "Increase average revenue per user by 30%",
          "Build enterprise partnerships"
        ],
        "tactics": [
          "Premium features: advanced filters, saved searches",
          "Team collaboration features",
          "API access for integrations",
          "White-label solution for partners"
        ],
        "metrics": ["ARPU", "Premium adoption rate", "Revenue per customer"]
      },
      "referral": {
        "focus": "Viral growth through word-of-mouth",
        "goals": [
          "30% of new signups from referrals",
          "Achieve 0.5 coefficient (each user brings 0.5 new users)",
          "Build brand advocates"
        ],
        "tactics": [
          "Referral rewards: cash incentives, feature unlocks",
          "Case studies and testimonials",
          "User conference / community events",
          "Ambassador program for top users"
        ],
        "metrics": ["Referral rate", "Viral coefficient", "NPS score"]
      }
    }
  }
}
```

---

#### 5. Marketing Dashboard
```
GET /api/marketing/dashboard
```

Comprehensive dashboard combining all metrics and insights for strategic decision-making.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-12-09T...",
    "funnel": { /* funnel metrics */ },
    "stickiness": { /* stickiness score */ },
    "growth": { /* growth opportunities */ },
    "strategy": { /* marketing strategy */ },
    "summary": {
      "funnelHealth": "needs_attention",
      "stickinessRating": "good",
      "topOpportunity": "onboarding"
    }
  }
}
```

---

#### 6. Track Customer Journey
```
POST /api/marketing/journey
```

Track customer actions through the funnel for analysis and insights.

**Request Body:**
```json
{
  "userId": "user_123",
  "action": "analyzed",
  "metadata": {
    "source": "web",
    "device": "desktop",
    "contractCount": 15,
    "timeSpent": 320
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_123",
    "action": "analyzed",
    "stage": "consideration",
    "metadata": { ... },
    "timestamp": "2024-12-09T...",
    "source": "web",
    "device": "desktop"
  }
}
```

---

#### 7. Reference Data Endpoints

**Get Funnel Stages:**
```
GET /api/marketing/funnel/stages
```

**Get Growth Levers:**
```
GET /api/marketing/levers
```

**Get Stickiness Factors:**
```
GET /api/marketing/stickiness/factors
```

---

## Funnel Stages

The Marketing Agent tracks customers through 5 stages:

### 1. **Awareness** 🎯
User discovers the application
- Actions: visit, landed, page_view, searched, demo
- Goal: Get users interested in the solution

### 2. **Consideration** 🔍
User evaluates if the solution fits their needs
- Actions: analyzed, viewed_results, browsed, scrolled, compared
- Goal: Show value and build confidence

### 3. **Decision** ✅
User takes action
- Actions: submitted, applied, contacted, downloaded, shared
- Goal: Remove friction, make it easy to sign up

### 4. **Retention** 🔄
User keeps coming back and using the app
- Actions: logged_in, repeated, subscribed, upgraded
- Goal: Build habits and reduce churn

### 5. **Advocacy** 📢
User recommends to others
- Actions: referred, recommended, reviewed, invited, testimonial
- Goal: Enable word-of-mouth growth

---

## Database Schema

The Marketing Agent uses three tables:

### `customer_journeys`
Tracks each user action through the funnel.
```sql
CREATE TABLE customer_journeys (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  stage VARCHAR(50),
  metadata JSONB,
  source VARCHAR(100),
  device VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `marketing_metrics`
Stores calculated metrics for historical analysis.
```sql
CREATE TABLE marketing_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(255) NOT NULL,
  metric_type VARCHAR(100),
  value DECIMAL(10, 2),
  dimensions JSONB,
  time_range VARCHAR(50),
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `user_segments`
Segments users for targeted marketing.
```sql
CREATE TABLE user_segments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  segment_name VARCHAR(255) NOT NULL,
  segment_value VARCHAR(255),
  stickiness_score DECIMAL(5, 2),
  engagement_level VARCHAR(50),
  lifecycle_stage VARCHAR(50),
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Usage Examples

### Example 1: Check Funnel Health
```javascript
// GET /api/marketing/funnel?timeRange=30d
const response = await fetch('/api/marketing/funnel?timeRange=30d');
const data = await response.json();

console.log(`Funnel Health: ${data.data.funnelHealth.status}`);
console.log(`Average Conversion: ${data.data.funnelHealth.avgConversionRate}`);

// Identify bottlenecks
data.data.bottlenecks.forEach(bottleneck => {
  console.log(`⚠️ ${bottleneck.transition}: ${bottleneck.conversionRate}`);
  console.log(`   → ${bottleneck.recommendation}`);
});
```

### Example 2: Check App Stickiness
```javascript
// GET /api/marketing/stickiness
const response = await fetch('/api/marketing/stickiness');
const data = await response.json();

console.log(`Stickiness Score: ${data.data.overallScore}/100 (${data.data.rating})`);

// Get improvement areas
data.data.recommendations.forEach(rec => {
  console.log(`${rec.recommendation} (Priority: ${rec.priority})`);
});
```

### Example 3: Identify Growth Opportunities
```javascript
// GET /api/marketing/growth
const response = await fetch('/api/marketing/growth');
const data = await response.json();

// Get top 3 opportunities by impact
data.data.topOpportunities.forEach((opp, i) => {
  console.log(`${i + 1}. ${opp.name} (Impact: ${opp.impactScore})`);
  console.log(`   Potential: ${opp.potential}, Difficulty: ${opp.difficulty}`);
  console.log(`   Timeline: ${opp.timeline} weeks`);
  console.log(`   → ${opp.recommendation}`);
});
```

### Example 4: Track User Journey
```javascript
// POST /api/marketing/journey
const userAction = {
  userId: 'user_123',
  action: 'analyzed',
  metadata: {
    source: 'web',
    device: 'desktop',
    contractsViewed: 15,
    timeSpent: 420
  }
};

const response = await fetch('/api/marketing/journey', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userAction)
});

const data = await response.json();
console.log(`Tracked: ${userAction.userId} → ${data.data.stage}`);
```

### Example 5: Get Full Marketing Dashboard
```javascript
// GET /api/marketing/dashboard
const response = await fetch('/api/marketing/dashboard');
const dashboard = await response.json();

console.log(`=== Marketing Dashboard ===`);
console.log(`Funnel Health: ${dashboard.data.summary.funnelHealth}`);
console.log(`Stickiness: ${dashboard.data.summary.stickinessRating}`);
console.log(`Top Priority: ${dashboard.data.summary.topOpportunity}`);
```

---

## Key Metrics to Monitor

### Funnel Metrics
- **Awareness to Consideration**: Target 40%+ conversion
- **Consideration to Decision**: Target 50%+ conversion
- **Decision to Retention**: Target 70%+ conversion
- **Retention to Advocacy**: Target 25%+ conversion

### Stickiness Metrics
- **DAU/MAU**: Daily to Monthly Active Users (target 40%+)
- **Session Duration**: Average time in app (target 10+ minutes)
- **Repeat Visit Rate**: Users returning in 7 days (target 60%+)
- **Feature Adoption**: % using key features (target 80%+)

### Growth Metrics
- **CAC**: Cost to acquire customer
- **LTV**: Lifetime value per customer
- **LTV:CAC Ratio**: Target 3:1 or higher
- **Viral Coefficient**: Each user brings ___ new users
- **NPS**: Net Promoter Score (target 50+)
- **Churn Rate**: Monthly attrition (target < 5%)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- ✅ Create MarketingService
- ✅ Create marketing routes
- ✅ Set up database schema
- Track basic customer journeys
- Test endpoints

### Phase 2: Data Collection (Week 3-4)
- Integrate journey tracking into frontend
- Start collecting user behavior data
- Implement analytics events
- Begin dashboard population

### Phase 3: Optimization (Week 5-6)
- Analyze funnel bottlenecks
- Test onboarding improvements
- A/B test growth levers
- Refine stickiness recommendations

### Phase 4: Expansion (Week 7+)
- Launch premium tier
- Implement referral program
- Build community features
- Integrate with email marketing

---

## Integration Points

### Frontend Integration
Add event tracking to frontend:
```javascript
// When user analyzes a contract
await fetch('/api/marketing/journey', {
  method: 'POST',
  body: JSON.stringify({
    userId: currentUser.id,
    action: 'analyzed',
    metadata: { contractId, timeSpent }
  })
});
```

### Email Marketing Integration
Use growth recommendations to inform email campaigns:
- Daily digest of new matches (retention)
- Onboarding email sequence (activation)
- Referral invitations (advocacy)

### Product Analytics Integration
Sync marketing metrics with product analytics for deeper insights.

---

## Questions the Marketing Agent Answers

1. **📊 Where are users dropping off?**
   - Check funnel metrics and bottlenecks

2. **🎯 What makes users sticky?**
   - Check stickiness score and factors

3. **💡 How do we grow?**
   - Check growth opportunities and top levers

4. **📈 What's our marketing strategy?**
   - Check strategy phases and tactics

5. **👥 Which users are at risk of churning?**
   - Check user segments and engagement levels

6. **🚀 What should we focus on next?**
   - Check growth opportunities by impact score

---

## The Big Picture

The Marketing Agent is the **strategic center** of CrownBids. It answers "how do we make this sticky and grow" by:

1. **Understanding the funnel** - Where do users drop off?
2. **Measuring stickiness** - What keeps users engaged?
3. **Identifying growth opportunities** - Where's the biggest ROI?
4. **Providing strategy** - What should we prioritize?

By keeping the Marketing Agent at the heart of product decisions, we ensure that every feature, every change, and every decision is evaluated through the lens of customer growth and retention.

---

## Support

For questions about the Marketing Agent:
- Review the API documentation in this file
- Check example responses and usage patterns
- Monitor the `/api/marketing/dashboard` for key insights
- Refer to funnel metrics and stickiness scores to guide decisions
