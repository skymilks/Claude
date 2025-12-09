const express = require('express');
const router = express.Router();
const contractsService = require('../services/contractsService');

/**
 * GET /api/contracts
 * Get all active contracts with optional filters
 */
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      minValue: req.query.minValue ? parseFloat(req.query.minValue) : null,
      maxValue: req.query.maxValue ? parseFloat(req.query.maxValue) : null,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === undefined) {
        delete filters[key];
      }
    });

    const contracts = await contractsService.getAllContracts(filters);

    res.json({
      success: true,
      count: contracts.length,
      data: contracts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contracts/:id
 * Get a single contract by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const contract = await contractsService.getContractById(contractId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contracts/sync
 * Manually trigger contract sync from government API
 */
router.post('/sync', async (req, res, next) => {
  try {
    const contracts = await contractsService.fetchFromGovernmentAPI();
    await contractsService.saveContracts(contracts);

    res.json({
      success: true,
      message: `Synced ${contracts.length} contracts`,
      count: contracts.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
