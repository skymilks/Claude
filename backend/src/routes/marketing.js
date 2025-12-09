const express = require('express');
const router = express.Router();
const marketingService = require('../services/marketingService');

/**
 * Marketing Agent Routes
 *
 * These endpoints expose the marketing agent's capabilities:
 * - Funnel metrics and optimization
 * - Stickiness scoring and recommendations
 * - Growth opportunities analysis
 * - Customer journey tracking
 * - Marketing strategy generation
 */

/**
 * GET /marketing/funnel
 * Get comprehensive funnel metrics and conversion rates
 *
 * Query params:
 * - timeRange: '7d' | '30d' | '90d' (default: '30d')
 */
router.get('/funnel', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const metrics = await marketingService.calculateFunnelMetrics(timeRange);

    res.json({
      success: true,
      timeRange: timeRange,
      data: metrics
    });
  } catch (error) {
    console.error('Funnel metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /marketing/stickiness
 * Calculate how "sticky" the application is - engagement and habit formation
 *
 * Query params:
 * - userId: Optional specific user ID
 */
router.get('/stickiness', async (req, res) => {
  try {
    const { userId } = req.query;
    const stickiness = await marketingService.calculateStickinessScore(userId);

    res.json({
      success: true,
      data: stickiness
    });
  } catch (error) {
    console.error('Stickiness score error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /marketing/growth
 * Analyze growth opportunities and recommend strategies
 */
router.get('/growth', async (req, res) => {
  try {
    const opportunities = await marketingService.analyzeGrowthOpportunities();

    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    console.error('Growth analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /marketing/strategy
 * Generate comprehensive marketing strategy with phases and tactics
 */
router.get('/strategy', async (req, res) => {
  try {
    const strategy = await marketingService.generateMarketingStrategy();

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    console.error('Strategy generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /marketing/dashboard
 * Comprehensive marketing dashboard combining all metrics and insights
 */
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await marketingService.getMarketingDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /marketing/journey
 * Track customer journey action for funnel analysis
 *
 * Body:
 * {
 *   userId: string (required),
 *   action: string (required) - e.g., "visit", "analyzed", "submitted"
 *   metadata: object (optional) - additional context
 * }
 */
router.post('/journey', async (req, res) => {
  try {
    const { userId, action, metadata } = req.body;

    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        error: 'userId and action are required'
      });
    }

    const journey = await marketingService.trackCustomerJourney(userId, action, metadata);

    res.json({
      success: true,
      data: journey
    });
  } catch (error) {
    console.error('Journey tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /marketing/funnel/stages
 * Get available funnel stages
 */
router.get('/funnel/stages', (req, res) => {
  try {
    const stages = marketingService.funnelStages;

    res.json({
      success: true,
      data: {
        stages: stages,
        count: stages.length
      }
    });
  } catch (error) {
    console.error('Funnel stages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /marketing/levers
 * Get all growth levers and their descriptions
 */
router.get('/levers', (req, res) => {
  try {
    const levers = marketingService.growthLevers;

    res.json({
      success: true,
      data: {
        levers: levers,
        count: Object.keys(levers).length
      }
    });
  } catch (error) {
    console.error('Growth levers error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /marketing/stickiness/factors
 * Get stickiness factors and their weights
 */
router.get('/stickiness/factors', (req, res) => {
  try {
    const factors = marketingService.stickinessFactors;

    res.json({
      success: true,
      data: {
        factors: factors,
        count: Object.keys(factors).length
      }
    });
  } catch (error) {
    console.error('Stickiness factors error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
