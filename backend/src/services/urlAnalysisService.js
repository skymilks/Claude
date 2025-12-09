const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

// Cache URL analysis for 30 days
const cache = new NodeCache({ stdTTL: 30 * 24 * 60 * 60 });

/**
 * Service for analyzing company websites
 */
class URLAnalysisService {
  constructor() {
    this.categoryKeywords = {
      security: ['security', 'guard', 'safe', 'patrol', 'protect', 'surveillance', 'cctv', 'monitoring', 'access control', 'screening'],
      janitorial: ['clean', 'janitorial', 'wash', 'custodial', 'sanit', 'maid', 'housekeeping', 'maintenance', 'disinfect'],
      landscaping: ['scape', 'snow', 'lawn', 'grass', 'tree', 'garden', 'grounds', 'irrigation', 'turf', 'pruning'],
      construction: ['construction', 'build', 'renovat', 'electrical', 'plumbing', 'hvac', 'concrete', 'roofing'],
      it: ['software', 'technology', 'it services', 'cloud', 'cybersecurity', 'network', 'development', 'database'],
      consulting: ['consulting', 'advisory', 'management', 'strategy', 'research', 'training', 'planning']
    };
  }

  /**
   * Analyze a company URL and detect their business category
   */
  async analyzeURL(url) {
    // Normalize URL
    const normalizedURL = this.normalizeURL(url);

    // Check cache
    const cacheKey = `analysis_${normalizedURL}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('✅ Returning cached analysis for:', normalizedURL);
      return cached;
    }

    try {
      console.log('🔍 Analyzing URL:', normalizedURL);

      // Step 1: Quick check from URL itself
      const urlCategory = this.detectCategoryFromURL(normalizedURL);

      // Step 2: Fetch and analyze website content
      const websiteContent = await this.fetchWebsiteContent(normalizedURL);

      // Step 3: Combine URL and content analysis
      const contentCategory = this.detectCategoryFromContent(websiteContent);
      const keywords = this.extractKeywordsFromContent(websiteContent);

      // Final category (prefer content analysis over URL)
      const detectedCategory = contentCategory || urlCategory || 'other';

      const result = {
        url: normalizedURL,
        category: detectedCategory,
        keywords: keywords,
        confidence: this.calculateConfidence(detectedCategory, keywords),
        analyzedAt: new Date().toISOString()
      };

      // Cache the result
      cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('⚠️ URL analysis error:', error.message);

      // Fallback to simple URL-based detection
      const fallbackCategory = this.detectCategoryFromURL(normalizedURL);

      return {
        url: normalizedURL,
        category: fallbackCategory || 'other',
        keywords: this.categoryKeywords[fallbackCategory] || [],
        confidence: 'low',
        analyzedAt: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Normalize URL to a standard format
   */
  normalizeURL(url) {
    // Add https:// if not present
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }

    // Remove trailing slash
    url = url.replace(/\/$/, '');

    return url;
  }

  /**
   * Detect category from URL string alone (fast, no HTTP request)
   */
  detectCategoryFromURL(url) {
    const lowerURL = url.toLowerCase();

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerURL.includes(keyword)) {
          return category;
        }
      }
    }

    return null;
  }

  /**
   * Fetch website content (homepage + services page if found)
   */
  async fetchWebsiteContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CrownBidsBot/1.0; +https://crownbids.com)'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      // Extract text content
      const text = {
        title: $('title').text(),
        headings: $('h1, h2, h3').map((i, el) => $(el).text()).get().join(' '),
        meta: $('meta[name="description"]').attr('content') || '',
        body: $('body').text().substring(0, 5000) // First 5000 chars
      };

      // Look for services/about page links
      const servicesLinks = $('a[href*="services"], a[href*="about"], a[href*="what-we-do"]')
        .map((i, el) => $(el).attr('href'))
        .get()
        .slice(0, 3);

      return {
        mainPage: text,
        servicesLinks: servicesLinks
      };
    } catch (error) {
      console.error('Failed to fetch website:', error.message);
      throw error;
    }
  }

  /**
   * Detect category from website content
   */
  detectCategoryFromContent(content) {
    if (!content || !content.mainPage) return null;

    const allText = Object.values(content.mainPage).join(' ').toLowerCase();

    // Count keyword matches for each category
    const scores = {};

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      scores[category] = 0;

      keywords.forEach(keyword => {
        // Count occurrences of each keyword
        const regex = new RegExp(keyword, 'gi');
        const matches = allText.match(regex);
        if (matches) {
          scores[category] += matches.length;
        }
      });
    }

    // Find category with highest score
    let maxScore = 0;
    let detectedCategory = null;

    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore && score >= 3) { // Minimum 3 keyword mentions
        maxScore = score;
        detectedCategory = category;
      }
    }

    return detectedCategory;
  }

  /**
   * Extract relevant keywords from website content
   */
  extractKeywordsFromContent(content) {
    if (!content || !content.mainPage) return [];

    const allText = Object.values(content.mainPage).join(' ').toLowerCase();
    const foundKeywords = new Set();

    // Check all category keywords
    Object.values(this.categoryKeywords).flat().forEach(keyword => {
      if (allText.includes(keyword)) {
        foundKeywords.add(keyword);
      }
    });

    return Array.from(foundKeywords).slice(0, 10); // Max 10 keywords
  }

  /**
   * Calculate confidence level of the analysis
   */
  calculateConfidence(category, keywords) {
    if (!category || category === 'other') return 'low';
    if (keywords.length >= 5) return 'high';
    if (keywords.length >= 3) return 'medium';
    return 'low';
  }

  /**
   * Get category suggestions based on keywords
   */
  getCategorySuggestions(keywords) {
    const scores = {};

    keywords.forEach(keyword => {
      for (const [category, categoryKeywords] of Object.entries(this.categoryKeywords)) {
        if (categoryKeywords.includes(keyword)) {
          scores[category] = (scores[category] || 0) + 1;
        }
      }
    });

    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }
}

module.exports = new URLAnalysisService();
