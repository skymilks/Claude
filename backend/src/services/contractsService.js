const axios = require('axios');
const NodeCache = require('node-cache');
const { pool } = require('../config/database');

// Cache contracts for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Service for fetching and managing government contracts
 */
class ContractsService {
  constructor() {
    this.buyandsellApiBase = 'https://buyandsell.gc.ca/cds/public/api';
  }

  /**
   * Fetch contracts from buyandsell.gc.ca API
   */
  async fetchFromGovernmentAPI(limit = 50) {
    try {
      console.log('📡 Fetching contracts from buyandsell.gc.ca...');

      // Try the public API endpoint
      const response = await axios.get(`${this.buyandsellApiBase}/tenders`, {
        params: {
          status: 'active',
          limit: limit,
          offset: 0
        },
        timeout: 10000
      });

      if (response.data && response.data.tenders) {
        return this.transformGovernmentData(response.data.tenders);
      }

      return [];
    } catch (error) {
      console.error('⚠️ Failed to fetch from government API:', error.message);

      // If API fails, return mock data for now
      console.log('📦 Using fallback mock data...');
      return this.getFallbackMockData();
    }
  }

  /**
   * Transform government API data to our schema
   */
  transformGovernmentData(tenders) {
    return tenders.map((tender, index) => {
      // Detect category from title and description
      const category = this.detectCategory(tender.title, tender.description);
      const keywords = this.extractKeywords(tender.title, tender.description, category);

      return {
        external_id: tender.id || `gov-${Date.now()}-${index}`,
        title: tender.title,
        description: tender.description || '',
        department: tender.procurement_entity || 'Government of Canada',
        value: this.extractValue(tender.value),
        currency: 'CAD',
        status: tender.status === 'active' ? 'active' : 'closed',
        category: category,
        keywords: keywords,
        location: tender.location || 'Canada',
        close_date: tender.closing_date ? new Date(tender.closing_date) : null,
        publish_date: tender.publish_date ? new Date(tender.publish_date) : new Date(),
        source: 'buyandsell.gc.ca',
        source_url: tender.url || `https://buyandsell.gc.ca/procurement-data/tender-notice/${tender.id}`
      };
    });
  }

  /**
   * Detect contract category from text
   */
  detectCategory(title, description) {
    const text = `${title} ${description}`.toLowerCase();

    // Security keywords
    if (text.match(/security|guard|patrol|surveillance|cctv|access control|armed/i)) {
      return 'security';
    }

    // Janitorial keywords
    if (text.match(/janitorial|cleaning|custodial|sanitation|waste|housekeeping/i)) {
      return 'janitorial';
    }

    // Landscaping keywords
    if (text.match(/landscaping|grounds|lawn|snow removal|tree|garden|irrigation/i)) {
      return 'landscaping';
    }

    // Construction keywords
    if (text.match(/construction|building|renovation|electrical|plumbing|hvac/i)) {
      return 'construction';
    }

    // IT keywords
    if (text.match(/software|it services|technology|cloud|cybersecurity|network/i)) {
      return 'it';
    }

    // Consulting keywords
    if (text.match(/consulting|advisory|management|strategy|research/i)) {
      return 'consulting';
    }

    return 'other';
  }

  /**
   * Extract keywords from text based on category
   */
  extractKeywords(title, description, category) {
    const text = `${title} ${description}`.toLowerCase();
    const keywords = [];

    const categoryKeywords = {
      security: ['security', 'guard', 'patrol', 'surveillance', 'cctv', 'monitoring', 'access control', 'armed', 'unarmed', 'screening'],
      janitorial: ['cleaning', 'janitorial', 'custodial', 'sanitation', 'waste', 'housekeeping', 'maintenance', 'disinfection', 'carpet', 'windows'],
      landscaping: ['landscaping', 'grounds', 'lawn', 'snow removal', 'tree', 'garden', 'irrigation', 'maintenance', 'turf', 'pruning'],
      construction: ['construction', 'building', 'renovation', 'electrical', 'plumbing', 'hvac', 'concrete', 'roofing', 'painting'],
      it: ['software', 'it services', 'technology', 'cloud', 'cybersecurity', 'network', 'database', 'development', 'support'],
      consulting: ['consulting', 'advisory', 'management', 'strategy', 'research', 'analysis', 'planning', 'training']
    };

    const relevantKeywords = categoryKeywords[category] || [];

    relevantKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return keywords.length > 0 ? keywords : ['general'];
  }

  /**
   * Extract monetary value from various formats
   */
  extractValue(valueString) {
    if (!valueString) return null;

    // Remove currency symbols and commas
    const cleaned = valueString.toString().replace(/[$,CAD\s]/g, '');
    const value = parseFloat(cleaned);

    return isNaN(value) ? null : value;
  }

  /**
   * Fallback mock data if API is unavailable
   */
  getFallbackMockData() {
    return [
      {
        external_id: 'mock-sec-001',
        title: '24/7 Security Guard Services for Federal Building',
        description: 'Provision of professional security guard services including access control, patrol duties, CCTV monitoring, and incident response for a federal government facility.',
        department: 'Public Services and Procurement Canada',
        value: 850000,
        currency: 'CAD',
        status: 'active',
        category: 'security',
        keywords: ['security', 'guard', 'patrol', 'cctv', 'monitoring', 'access control'],
        location: 'Ottawa, Ontario',
        close_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        publish_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        source: 'mock',
        source_url: 'https://buyandsell.gc.ca/'
      },
      {
        external_id: 'mock-jan-001',
        title: 'Comprehensive Janitorial Services for Office Complex',
        description: 'Daily cleaning and maintenance services for a 50,000 sq ft government office complex including floor care, washroom sanitation, waste removal, and window cleaning.',
        department: 'Department of National Defence',
        value: 420000,
        currency: 'CAD',
        status: 'active',
        category: 'janitorial',
        keywords: ['janitorial', 'cleaning', 'custodial', 'sanitation', 'waste', 'maintenance'],
        location: 'Toronto, Ontario',
        close_date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        publish_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        source: 'mock',
        source_url: 'https://buyandsell.gc.ca/'
      },
      {
        external_id: 'mock-land-001',
        title: 'Year-Round Grounds Maintenance and Landscaping',
        description: 'Professional landscaping and grounds maintenance including lawn care, snow removal, tree maintenance, irrigation system management, and seasonal plantings.',
        department: 'Parks Canada',
        value: 680000,
        currency: 'CAD',
        status: 'active',
        category: 'landscaping',
        keywords: ['landscaping', 'grounds', 'lawn', 'maintenance', 'snow', 'irrigation'],
        location: 'Vancouver, British Columbia',
        close_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        publish_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        source: 'mock',
        source_url: 'https://buyandsell.gc.ca/'
      }
    ];
  }

  /**
   * Get all active contracts from database or API
   */
  async getAllContracts(filters = {}) {
    const cacheKey = `contracts_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log('✅ Returning cached contracts');
      return cached;
    }

    try {
      // Build query
      let query = 'SELECT * FROM contracts WHERE status = $1';
      const params = ['active'];
      let paramCount = 1;

      if (filters.category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(filters.category);
      }

      if (filters.minValue) {
        paramCount++;
        query += ` AND value >= $${paramCount}`;
        params.push(filters.minValue);
      }

      if (filters.maxValue) {
        paramCount++;
        query += ` AND value <= $${paramCount}`;
        params.push(filters.maxValue);
      }

      query += ' ORDER BY close_date ASC';

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await pool.query(query, params);

      // If no contracts in database, fetch from API and store
      if (result.rows.length === 0) {
        console.log('📥 No contracts in database, fetching from API...');
        const contracts = await this.fetchFromGovernmentAPI();
        await this.saveContracts(contracts);

        // Query again
        const newResult = await pool.query(query, params);
        cache.set(cacheKey, newResult.rows);
        return newResult.rows;
      }

      cache.set(cacheKey, result.rows);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching contracts:', error);

      // Return mock data as fallback
      return this.getFallbackMockData();
    }
  }

  /**
   * Save contracts to database
   */
  async saveContracts(contracts) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const contract of contracts) {
        await client.query(`
          INSERT INTO contracts (
            external_id, title, description, department, value, currency,
            status, category, keywords, location, close_date, publish_date,
            source, source_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (external_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            value = EXCLUDED.value,
            status = EXCLUDED.status,
            updated_at = NOW()
        `, [
          contract.external_id,
          contract.title,
          contract.description,
          contract.department,
          contract.value,
          contract.currency,
          contract.status,
          contract.category,
          contract.keywords,
          contract.location,
          contract.close_date,
          contract.publish_date,
          contract.source,
          contract.source_url
        ]);
      }

      await client.query('COMMIT');
      console.log(`✅ Saved ${contracts.length} contracts to database`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error saving contracts:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a single contract by ID
   */
  async getContractById(id) {
    try {
      const result = await pool.query('SELECT * FROM contracts WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching contract:', error);
      return null;
    }
  }

  /**
   * Calculate match score between a contract and user's business
   */
  calculateMatchScore(contract, detectedCategory, websiteKeywords) {
    let score = 0;

    // Category match (base 75%)
    if (contract.category === detectedCategory) {
      score = 75;
    }

    // Keyword bonuses
    websiteKeywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();

      // +3 points for keywords in contract keywords
      if (contract.keywords && contract.keywords.some(k => k.toLowerCase().includes(lowerKeyword))) {
        score += 3;
      }

      // +2 points for keywords in title
      if (contract.title.toLowerCase().includes(lowerKeyword)) {
        score += 2;
      }

      // +1 point for keywords in description
      if (contract.description && contract.description.toLowerCase().includes(lowerKeyword)) {
        score += 1;
      }
    });

    // Cap at 98%
    return Math.min(score, 98);
  }
}

module.exports = new ContractsService();
