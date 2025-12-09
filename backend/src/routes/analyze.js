const express = require('express');
const router = express.Router();
const urlAnalysisService = require('../services/urlAnalysisService');
const contractsService = require('../services/contractsService');

/**
 * POST /api/analyze
 * Analyze a company URL and return matching contracts
 */
router.post('/', async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    // Step 1: Analyze the URL
    const analysis = await urlAnalysisService.analyzeURL(url);

    // Step 2: Get contracts matching the detected category
    let contracts = [];

    if (analysis.category && analysis.category !== 'other') {
      contracts = await contractsService.getAllContracts({
        category: analysis.category,
        limit: 15
      });

      // Calculate match scores for each contract
      contracts = contracts.map(contract => ({
        ...contract,
        match_score: contractsService.calculateMatchScore(
          contract,
          analysis.category,
          analysis.keywords
        )
      }));

      // Sort by match score (highest first)
      contracts.sort((a, b) => b.match_score - a.match_score);
    } else {
      // If no specific category detected, return all contracts
      contracts = await contractsService.getAllContracts({ limit: 15 });

      // Add default match score
      contracts = contracts.map(contract => ({
        ...contract,
        match_score: 75 // Base score
      }));
    }

    res.json({
      success: true,
      analysis: {
        url: analysis.url,
        category: analysis.category,
        keywords: analysis.keywords,
        confidence: analysis.confidence
      },
      matches: {
        count: contracts.length,
        contracts: contracts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analyze/categories
 * Get available contract categories
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: [
      { id: 'security', name: 'Security Services', icon: '🔒' },
      { id: 'janitorial', name: 'Janitorial & Cleaning', icon: '🧹' },
      { id: 'landscaping', name: 'Landscaping & Grounds', icon: '🌳' },
      { id: 'construction', name: 'Construction', icon: '🏗️' },
      { id: 'it', name: 'IT Services', icon: '💻' },
      { id: 'consulting', name: 'Consulting', icon: '📊' }
    ]
  });
});

module.exports = router;
