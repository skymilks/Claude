const NodeCache = require('node-cache');
const { pool } = require('../config/database');

// Cache marketing metrics for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Marketing Agent Service
 *
 * The heart of sales funnel optimization and customer growth.
 * Focuses on:
 * - Customer journey tracking through the sales funnel
 * - Engagement metrics and stickiness scoring
 * - Conversion rate optimization
 * - Retention and growth strategies
 * - Feature adoption tracking
 */
class MarketingService {
  constructor() {
    // Define the sales funnel stages
    this.funnelStages = ['awareness', 'consideration', 'decision', 'retention', 'advocacy'];

    // Stickiness factors that keep users engaged
    this.stickinessFactors = {
      daily_usage: { weight: 0.25, name: 'Daily Active Users' },
      contract_matches: { weight: 0.20, name: 'Contract Match Quality' },
      feature_adoption: { weight: 0.15, name: 'Feature Adoption Rate' },
      time_on_app: { weight: 0.15, name: 'Average Time in App' },
      repeat_visits: { weight: 0.15, name: 'Repeat Visit Rate' },
      referral_rate: { weight: 0.10, name: 'Referral Rate' }
    };

    // Growth levers we can optimize
    this.growthLevers = {
      viral_loop: 'Referral & Sharing Features',
      onboarding: 'First-Time User Experience',
      notifications: 'Timely Engagement Alerts',
      personalization: 'Tailored Match Recommendations',
      gamification: 'Milestones & Achievements',
      social_proof: 'Success Stories & Reviews',
      premium_features: 'Monetization Opportunities'
    };
  }

  /**
   * Track customer journey through the funnel
   */
  async trackCustomerJourney(userId, action, metadata = {}) {
    try {
      const journey = {
        user_id: userId,
        action: action,
        stage: this.detectFunnelStage(action),
        metadata: metadata,
        timestamp: new Date(),
        source: metadata.source || 'web',
        device: metadata.device || 'unknown'
      };

      // Save to database
      if (pool) {
        await pool.query(
          `INSERT INTO customer_journeys (user_id, action, stage, metadata, timestamp, source, device)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [journey.user_id, journey.action, journey.stage, JSON.stringify(journey.metadata), journey.timestamp, journey.source, journey.device]
        );
      }

      console.log(`📍 Journey tracked: ${userId} - ${action} (${journey.stage})`);
      return journey;
    } catch (error) {
      console.error('⚠️ Failed to track customer journey:', error.message);
      throw error;
    }
  }

  /**
   * Detect which funnel stage an action belongs to
   */
  detectFunnelStage(action) {
    const actionLower = action.toLowerCase();

    // Awareness stage - discovery and initial engagement
    if (actionLower.match(/visit|landed|page_view|searched|demo/)) {
      return 'awareness';
    }

    // Consideration stage - exploring features
    if (actionLower.match(/analyzed|viewed_results|browsed|scrolled|compared/)) {
      return 'consideration';
    }

    // Decision stage - taking action
    if (actionLower.match(/submitted|applied|contacted|downloaded|shared/)) {
      return 'decision';
    }

    // Retention stage - ongoing engagement
    if (actionLower.match(/logged_in|repeated|subscribed|upgraded/)) {
      return 'retention';
    }

    // Advocacy stage - promoting to others
    if (actionLower.match(/referred|recommended|reviewed|invited|testimonial/)) {
      return 'advocacy';
    }

    return 'awareness'; // Default stage
  }

  /**
   * Calculate funnel metrics and conversion rates
   */
  async calculateFunnelMetrics(timeRange = '30d') {
    try {
      const cacheKey = `funnel_metrics_${timeRange}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const metrics = {
        timeRange: timeRange,
        stages: {}
      };

      // Calculate metrics for each funnel stage
      for (const stage of this.funnelStages) {
        metrics.stages[stage] = await this.getStagMetrics(stage, timeRange);
      }

      // Calculate conversion rates between stages
      metrics.conversionRates = this.calculateConversionRates(metrics.stages);

      // Identify bottlenecks
      metrics.bottlenecks = this.identifyBottlenecks(metrics.conversionRates);

      // Overall funnel health
      metrics.funnelHealth = this.calculateFunnelHealth(metrics);

      cache.set(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('⚠️ Failed to calculate funnel metrics:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get metrics for a specific funnel stage
   */
  async getStagMetrics(stage, timeRange) {
    // Mock metrics for now (would query database in production)
    const metrics = {
      stage: stage,
      users: Math.floor(Math.random() * 10000),
      actions: Math.floor(Math.random() * 50000),
      avgTimeSpent: Math.floor(Math.random() * 3600), // in seconds
      bounceRate: Math.random() * 0.5,
      completionRate: 0.5 + Math.random() * 0.5
    };

    return metrics;
  }

  /**
   * Calculate conversion rates between funnel stages
   */
  calculateConversionRates(stages) {
    const rates = {};
    const stageKeys = Object.keys(stages);

    for (let i = 0; i < stageKeys.length - 1; i++) {
      const currentStage = stageKeys[i];
      const nextStage = stageKeys[i + 1];
      const currentUsers = stages[currentStage].users || 1;
      const nextUsers = stages[nextStage].users || 0;

      rates[`${currentStage}_to_${nextStage}`] = {
        rate: (nextUsers / currentUsers * 100).toFixed(2) + '%',
        users: nextUsers,
        previousUsers: currentUsers,
        drop: currentUsers - nextUsers
      };
    }

    return rates;
  }

  /**
   * Identify bottlenecks in the funnel
   */
  identifyBottlenecks(conversionRates) {
    const bottlenecks = [];

    for (const [transition, rate] of Object.entries(conversionRates)) {
      const conversionPercent = parseFloat(rate.rate);

      // Flag anything below 40% as a bottleneck
      if (conversionPercent < 40) {
        bottlenecks.push({
          transition: transition,
          conversionRate: rate.rate,
          severity: conversionPercent < 20 ? 'critical' : 'high',
          recommendation: this.getBottleneckRecommendation(transition)
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Get recommendations to fix funnel bottlenecks
   */
  getBottleneckRecommendation(transition) {
    const recommendations = {
      'awareness_to_consideration': 'Improve onboarding experience and value proposition clarity',
      'consideration_to_decision': 'Reduce friction in decision-making process - simplify CTA',
      'decision_to_retention': 'Enhance post-signup experience and feature discovery',
      'retention_to_advocacy': 'Create referral incentives and social sharing features'
    };

    return recommendations[transition] || 'Optimize user experience for this stage';
  }

  /**
   * Calculate overall funnel health
   */
  calculateFunnelHealth(metrics) {
    const conversionRates = Object.values(metrics.conversionRates).map(r => parseFloat(r.rate));
    const avgConversion = conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length || 0;
    const bottleneckCount = metrics.bottlenecks.length;

    let health = 'healthy';
    if (bottleneckCount > 2) {
      health = 'critical';
    } else if (bottleneckCount > 0 || avgConversion < 30) {
      health = 'needs_attention';
    }

    return {
      status: health,
      avgConversionRate: avgConversion.toFixed(2) + '%',
      bottleneckCount: bottleneckCount,
      score: (avgConversion / 100 * 100).toFixed(2)
    };
  }

  /**
   * Calculate "stickiness" score - how engaging and habit-forming the app is
   */
  async calculateStickinessScore(userId = null) {
    try {
      const cacheKey = `stickiness_${userId || 'global'}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const stickinessData = {
        userId: userId,
        calculatedAt: new Date().toISOString(),
        factors: {},
        overallScore: 0,
        rating: 'unknown'
      };

      // Calculate each stickiness factor
      for (const [factor, config] of Object.entries(this.stickinessFactors)) {
        const value = await this.calculateStickinessFactor(factor, userId);
        stickinessData.factors[factor] = {
          name: config.name,
          value: value,
          weight: config.weight,
          contribution: value * config.weight
        };
      }

      // Calculate weighted overall score
      stickinessData.overallScore = Object.values(stickinessData.factors)
        .reduce((sum, f) => sum + f.contribution, 0)
        .toFixed(2);

      // Assign rating
      const score = parseFloat(stickinessData.overallScore);
      if (score >= 80) {
        stickinessData.rating = 'excellent';
      } else if (score >= 60) {
        stickinessData.rating = 'good';
      } else if (score >= 40) {
        stickinessData.rating = 'fair';
      } else {
        stickinessData.rating = 'poor';
      }

      stickinessData.recommendations = this.generateStickinessRecommendations(stickinessData);

      cache.set(cacheKey, stickinessData);
      return stickinessData;
    } catch (error) {
      console.error('⚠️ Failed to calculate stickiness score:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Calculate individual stickiness factor
   */
  async calculateStickinessFactor(factor, userId) {
    // Mock calculations (would query real data in production)
    const mockData = {
      daily_usage: Math.random() * 100,
      contract_matches: Math.min(100, Math.random() * 120),
      feature_adoption: Math.random() * 100,
      time_on_app: Math.min(100, (Math.random() * 3600) / 36), // Normalized to 0-100
      repeat_visits: Math.random() * 100,
      referral_rate: Math.random() * 100
    };

    return parseFloat((mockData[factor] || 0).toFixed(2));
  }

  /**
   * Generate recommendations to improve stickiness
   */
  generateStickinessRecommendations(stickinessData) {
    const recommendations = [];
    const lowestFactors = Object.entries(stickinessData.factors)
      .sort((a, b) => a[1].value - b[1].value)
      .slice(0, 3);

    const actionMap = {
      daily_usage: '📱 Implement push notifications for daily contract updates',
      contract_matches: '🎯 Improve matching algorithm with user preferences',
      feature_adoption: '🚀 Add in-app tutorials and feature highlights',
      time_on_app: '⏱️ Reduce load times and improve navigation UX',
      repeat_visits: '🔄 Create reasons to return: saved searches, alerts',
      referral_rate: '👥 Launch referral program with incentives'
    };

    lowestFactors.forEach(([factor, data]) => {
      recommendations.push({
        factor: factor,
        factorName: data.name,
        currentScore: data.value,
        recommendation: actionMap[factor] || 'Improve user engagement',
        priority: 'high'
      });
    });

    return recommendations;
  }

  /**
   * Analyze and recommend growth strategies
   */
  async analyzeGrowthOpportunities(currentMetrics = {}) {
    try {
      const cacheKey = 'growth_opportunities';
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const opportunities = {
        generatedAt: new Date().toISOString(),
        levers: {}
      };

      // Analyze each growth lever
      for (const [lever, description] of Object.entries(this.growthLevers)) {
        opportunities.levers[lever] = {
          name: description,
          potential: this.estimateGrowthPotential(lever),
          difficulty: this.estimateImplementationDifficulty(lever),
          timeline: this.estimateImplementationTimeline(lever),
          impactScore: 0,
          recommendation: this.getGrowthRecommendation(lever)
        };

        // Calculate impact score (potential / difficulty)
        const potential = opportunities.levers[lever].potential;
        const difficulty = opportunities.levers[lever].difficulty;
        opportunities.levers[lever].impactScore = (potential / (difficulty || 1)).toFixed(2);
      }

      // Sort by impact score
      opportunities.topOpportunities = Object.entries(opportunities.levers)
        .sort((a, b) => b[1].impactScore - a[1].impactScore)
        .slice(0, 3)
        .map(([lever, data]) => ({ lever, ...data }));

      cache.set(cacheKey, opportunities);
      return opportunities;
    } catch (error) {
      console.error('⚠️ Failed to analyze growth opportunities:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Estimate growth potential of a lever
   */
  estimateGrowthPotential(lever) {
    const potentials = {
      viral_loop: 85,
      onboarding: 75,
      notifications: 60,
      personalization: 70,
      gamification: 50,
      social_proof: 65,
      premium_features: 40
    };

    return potentials[lever] || 50;
  }

  /**
   * Estimate implementation difficulty
   */
  estimateImplementationDifficulty(lever) {
    const difficulties = {
      viral_loop: 8,
      onboarding: 6,
      notifications: 5,
      personalization: 7,
      gamification: 7,
      social_proof: 3,
      premium_features: 8
    };

    return difficulties[lever] || 5;
  }

  /**
   * Estimate implementation timeline (in weeks)
   */
  estimateImplementationTimeline(lever) {
    const timelines = {
      viral_loop: 8,
      onboarding: 4,
      notifications: 2,
      personalization: 6,
      gamification: 6,
      social_proof: 1,
      premium_features: 8
    };

    return timelines[lever] || 4;
  }

  /**
   * Get detailed recommendation for a growth lever
   */
  getGrowthRecommendation(lever) {
    const recommendations = {
      viral_loop: 'Build referral program with incentives. Create "invite friends" features with reward tracking.',
      onboarding: 'Implement interactive onboarding flow. Show value proposition immediately. Reduce steps to first action.',
      notifications: 'Send timely alerts for: new contract matches, price changes, opportunity reminders.',
      personalization: 'Store user preferences. Recommend contracts based on past views and searches.',
      gamification: 'Add achievement badges, levels, leaderboards. Celebrate milestones with streak tracking.',
      social_proof: 'Display user testimonials, success stories, and win announcements on homepage.',
      premium_features: 'Offer premium tier with advanced filters, saved searches, and priority support.'
    };

    return recommendations[lever] || 'Optimize this growth lever for maximum impact';
  }

  /**
   * Get actionable marketing strategy
   */
  async generateMarketingStrategy() {
    try {
      const strategy = {
        generatedAt: new Date().toISOString(),
        phases: {}
      };

      // Phase 1: Acquisition - Get users in the door
      strategy.phases.acquisition = {
        focus: 'Drive awareness and user acquisition',
        goals: [
          'Increase website traffic by 50%',
          'Improve conversion from visitor to signups by 30%',
          'Launch paid advertising campaigns'
        ],
        tactics: [
          'SEO optimization for government contract keywords',
          'LinkedIn outreach to SMB owners',
          'Webinar series on government bidding',
          'Content marketing: guide to winning contracts'
        ],
        metrics: ['CAC', 'Landing page conversion rate', 'Cost per signup']
      };

      // Phase 2: Activation - Get them to experience value
      strategy.phases.activation = {
        focus: 'First-time user experience and value realization',
        goals: [
          'Improve onboarding completion rate to 80%',
          'Get 70% of users to analyze their first contract',
          'Reduce time to first match to < 2 minutes'
        ],
        tactics: [
          'Personalized onboarding based on company type',
          'Email sequence highlighting key features',
          'In-app walkthroughs for critical features',
          'Proactive customer support during first week'
        ],
        metrics: ['Onboarding completion rate', 'First action rate', 'Feature adoption']
      };

      // Phase 3: Retention - Keep them coming back
      strategy.phases.retention = {
        focus: 'Build habits and reduce churn',
        goals: [
          'Achieve 40% monthly active user rate',
          'Increase average session duration to 10+ minutes',
          'Reduce monthly churn to < 5%'
        ],
        tactics: [
          'Daily email digest of new contract matches',
          'Weekly "opportunities you might have missed" email',
          'In-app achievement system and streaks',
          'Community features: share wins, get advice'
        ],
        metrics: ['DAU/MAU ratio', 'Session duration', 'Churn rate']
      };

      // Phase 4: Expansion/Revenue - Grow user value
      strategy.phases.expansion = {
        focus: 'Increase revenue and lifetime value',
        goals: [
          'Launch premium tier with 20% adoption',
          'Increase average revenue per user by 30%',
          'Build enterprise partnerships'
        ],
        tactics: [
          'Premium features: advanced filters, saved searches',
          'Team collaboration features',
          'API access for integrations',
          'White-label solution for partners'
        ],
        metrics: ['ARPU', 'Premium adoption rate', 'Revenue per customer']
      };

      // Phase 5: Referral - Turn users into promoters
      strategy.phases.referral = {
        focus: 'Viral growth through word-of-mouth',
        goals: [
          '30% of new signups from referrals',
          'Achieve 0.5 coefficient (each user brings 0.5 new users)',
          'Build brand advocates'
        ],
        tactics: [
          'Referral rewards: cash incentives, feature unlocks',
          'Case studies and testimonials',
          'User conference / community events',
          'Ambassador program for top users'
        ],
        metrics: ['Referral rate', 'Viral coefficient', 'NPS score']
      };

      return strategy;
    } catch (error) {
      console.error('⚠️ Failed to generate marketing strategy:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get comprehensive marketing dashboard data
   */
  async getMarketingDashboard() {
    try {
      const funnelMetrics = await this.calculateFunnelMetrics('30d');
      const stickinessScore = await this.calculateStickinessScore();
      const growthOpportunities = await this.analyzeGrowthOpportunities();
      const strategy = await this.generateMarketingStrategy();

      return {
        timestamp: new Date().toISOString(),
        funnel: funnelMetrics,
        stickiness: stickinessScore,
        growth: growthOpportunities,
        strategy: strategy,
        summary: {
          funnelHealth: funnelMetrics.funnelHealth?.status || 'unknown',
          stickinessRating: stickinessScore.rating || 'unknown',
          topOpportunity: growthOpportunities.topOpportunities?.[0]?.lever || 'n/a'
        }
      };
    } catch (error) {
      console.error('⚠️ Failed to generate marketing dashboard:', error.message);
      return { error: error.message };
    }
  }
}

module.exports = new MarketingService();
