// CrownBids - API Service Layer
// Handles all external API calls for government contract data

class APIService {
    constructor() {
        this.cache = {
            contracts: null,
            timestamp: null,
            ttl: 1000 * 60 * 60 // 1 hour cache
        };
    }

    // Main method to get contracts
    async getContracts(forceRefresh = false) {
        // Check cache first
        if (!forceRefresh && this.isCacheValid()) {
            console.log('Using cached contract data');
            return this.cache.contracts;
        }

        console.log('Fetching fresh contract data...');

        try {
            // Try to fetch real data from government sources
            const contracts = await this.fetchRealContracts();

            // Cache the results
            this.cache.contracts = contracts;
            this.cache.timestamp = Date.now();

            return contracts;
        } catch (error) {
            console.warn('Failed to fetch real data, using sample data:', error);

            // Fallback to sample data if real API fails
            return this.getSampleContracts();
        }
    }

    // Check if cache is still valid
    isCacheValid() {
        if (!this.cache.contracts || !this.cache.timestamp) {
            return false;
        }
        return (Date.now() - this.cache.timestamp) < this.cache.ttl;
    }

    // Fetch real contracts from backend API
    async fetchRealContracts() {
        // Check if real-time data is enabled
        if (!CONFIG.features.realTimeData) {
            console.log('Real-time data disabled, using mock data');
            return this.getEnhancedSampleData();
        }

        try {
            const apiUrl = `${CONFIG.api.backendUrl}/contracts?limit=50`;
            console.log('Fetching contracts from backend:', apiUrl);

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                console.log(`✅ Loaded ${result.count} contracts from backend`);
                return this.transformBackendContracts(result.data);
            } else {
                throw new Error('Invalid response format from backend');
            }
        } catch (error) {
            console.error('Failed to fetch from backend API:', error);
            console.log('Falling back to sample data');
            return this.getEnhancedSampleData();
        }
    }

    // Transform backend contract format to frontend format
    transformBackendContracts(contracts) {
        return contracts.map(contract => {
            // Calculate days until close
            const closeDate = new Date(contract.close_date);
            const daysUntilClose = Math.ceil((closeDate - new Date()) / (1000 * 60 * 60 * 24));

            // Calculate complexity from value
            const complexity = Math.floor(contract.value / 100000) + Math.floor(Math.random() * 20) + 20;

            return {
                id: contract.id,
                title: contract.title,
                department: contract.department,
                description: contract.description || '',
                value: parseFloat(contract.value),
                status: contract.status,
                publishDate: contract.publish_date ? contract.publish_date.split('T')[0] : null,
                closeDate: contract.close_date ? contract.close_date.split('T')[0] : null,
                contractNumber: contract.external_id,
                url: contract.source_url || 'https://buyandsell.gc.ca',
                category: contract.category,
                keywords: contract.keywords || [],
                location: contract.location,
                complexity: Math.min(complexity, 150),
                daysUntilClose: daysUntilClose,
                matchScore: contract.match_score || null
            };
        });
    }

    // Analyze company URL and get matching contracts
    async analyzeCompanyURL(url) {
        // Check if real-time data is enabled
        if (!CONFIG.features.realTimeData) {
            console.log('Real-time data disabled, using client-side analysis');
            return this.clientSideAnalysis(url);
        }

        try {
            const apiUrl = `${CONFIG.api.backendUrl}/analyze`;
            console.log('Analyzing URL via backend:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log(`✅ URL analyzed: ${result.analysis.category}, ${result.matches.count} matches found`);
                return {
                    category: result.analysis.category,
                    keywords: result.analysis.keywords,
                    confidence: result.analysis.confidence,
                    contracts: this.transformBackendContracts(result.matches.contracts)
                };
            } else {
                throw new Error('Invalid response from backend');
            }
        } catch (error) {
            console.error('Failed to analyze URL via backend:', error);
            console.log('Falling back to client-side analysis');
            return this.clientSideAnalysis(url);
        }
    }

    // Client-side URL analysis (fallback)
    clientSideAnalysis(url) {
        const lowerURL = url.toLowerCase();
        let category = null;
        let keywords = [];

        // Detect category from URL
        if (lowerURL.includes('security') || lowerURL.includes('guard')) {
            category = 'security';
            keywords = ['security', 'guard', 'patrol', 'cctv', 'monitoring'];
        } else if (lowerURL.includes('clean') || lowerURL.includes('janitorial')) {
            category = 'janitorial';
            keywords = ['cleaning', 'janitorial', 'custodial', 'sanitation'];
        } else if (lowerURL.includes('landscape') || lowerURL.includes('lawn') || lowerURL.includes('snow')) {
            category = 'landscaping';
            keywords = ['landscaping', 'grounds', 'lawn', 'snow', 'maintenance'];
        }

        // Get all contracts
        const allContracts = this.getSampleContracts();

        // Filter by category if detected
        const filteredContracts = category
            ? allContracts.filter(c => c.category === category)
            : allContracts;

        // Add match scores
        const contractsWithScores = filteredContracts.map(contract => ({
            ...contract,
            matchScore: category && contract.category === category ? 85 : 50
        }));

        return {
            category: category || 'other',
            keywords: keywords,
            confidence: category ? 'medium' : 'low',
            contracts: contractsWithScores
        };
    }

    // Get enhanced sample data (more realistic than static sample)
    getEnhancedSampleData() {
        const baseContracts = this.getSampleContracts();

        // Add some variation to dates and values to make it feel more real
        return baseContracts.map(contract => {
            const daysOffset = Math.floor(Math.random() * 10);
            const publishDate = new Date();
            publishDate.setDate(publishDate.getDate() - daysOffset);

            const closeDate = new Date(publishDate);
            closeDate.setDate(closeDate.getDate() + 30 + Math.floor(Math.random() * 60));

            // Random value variation (+/- 20%)
            const valueVariation = 0.8 + (Math.random() * 0.4);
            const adjustedValue = Math.round(contract.value * valueVariation);

            // Calculate complexity (page count) based on value
            const complexity = Math.floor(contract.value / 100000) + Math.floor(Math.random() * 20) + 20;
            const daysUntilClose = Math.ceil((closeDate - new Date()) / (1000 * 60 * 60 * 24));

            return {
                ...contract,
                publishDate: publishDate.toISOString().split('T')[0],
                closeDate: closeDate.toISOString().split('T')[0],
                value: adjustedValue,
                complexity: Math.min(complexity, 150), // Cap at 150 pages
                daysUntilClose: daysUntilClose,
                status: closeDate > new Date() ? 'active' : 'closed'
            };
        });
    }

    // Sample contracts (fallback data)
    getSampleContracts() {
        return [
            // SECURITY CONTRACTS (5)
            {
                id: 1,
                title: "24/7 Security Guard Services for Federal Building",
                department: "Public Services and Procurement Canada",
                description: "Provision of professional security guard services including patrol, access control, CCTV monitoring, and incident response for government facility in downtown Ottawa.",
                value: 850000,
                status: "active",
                publishDate: "2024-11-15",
                closeDate: "2025-01-30",
                contractNumber: "24-25-SEC-1547",
                url: "https://buyandsell.gc.ca",
                category: "security",
                keywords: ["security", "guard", "patrol", "cctv", "monitoring", "access control"]
            },
            {
                id: 2,
                title: "Armed Security Personnel for Border Facility",
                department: "Canada Border Services Agency",
                description: "Armed security services for international border crossing facility. Requires high-level security clearance and tactical response training.",
                value: 1200000,
                status: "active",
                publishDate: "2024-11-20",
                closeDate: "2025-02-15",
                contractNumber: "24-25-SEC-2891",
                url: "https://buyandsell.gc.ca",
                category: "security",
                keywords: ["security", "armed", "guard", "tactical", "border", "patrol"]
            },
            {
                id: 3,
                title: "CCTV Installation and Monitoring Services",
                department: "Infrastructure Canada",
                description: "Installation of comprehensive CCTV surveillance system and 24/7 monitoring services for government transportation hub.",
                value: 650000,
                status: "active",
                publishDate: "2024-11-10",
                closeDate: "2025-01-20",
                contractNumber: "24-25-SEC-0945",
                url: "https://buyandsell.gc.ca",
                category: "security",
                keywords: ["security", "cctv", "surveillance", "monitoring", "camera", "installation"]
            },
            {
                id: 4,
                title: "Mobile Patrol and Alarm Response Services",
                department: "Public Safety Canada",
                description: "Mobile security patrol services with rapid alarm response for multiple government sites across the Greater Toronto Area.",
                value: 520000,
                status: "active",
                publishDate: "2024-11-25",
                closeDate: "2025-02-28",
                contractNumber: "24-25-SEC-3421",
                url: "https://buyandsell.gc.ca",
                category: "security",
                keywords: ["security", "patrol", "mobile", "alarm", "response", "guard"]
            },
            {
                id: 5,
                title: "Event Security for Canada Day Celebrations",
                department: "Canadian Heritage",
                description: "Comprehensive security services for national Canada Day events including crowd control, VIP protection, and emergency response coordination.",
                value: 380000,
                status: "active",
                publishDate: "2024-09-01",
                closeDate: "2024-12-15",
                contractNumber: "24-25-SEC-1876",
                url: "https://buyandsell.gc.ca",
                category: "security",
                keywords: ["security", "event", "crowd control", "vip", "protection", "guard"]
            },

            // JANITORIAL CONTRACTS (5)
            {
                id: 6,
                title: "Comprehensive Janitorial Services for Office Complex",
                department: "Public Services and Procurement Canada",
                description: "Daily cleaning and janitorial services for 50,000 sq ft government office building including floors, washrooms, common areas, and waste management.",
                value: 420000,
                status: "active",
                publishDate: "2024-11-18",
                closeDate: "2025-01-25",
                contractNumber: "24-25-JAN-0432",
                url: "https://buyandsell.gc.ca",
                category: "janitorial",
                keywords: ["janitorial", "cleaning", "custodial", "sanitation", "waste", "maintenance"]
            },
            {
                id: 7,
                title: "Medical Facility Cleaning and Sanitation",
                department: "Health Canada",
                description: "Specialized medical-grade cleaning and sanitation services for health clinic including biohazard waste disposal and infection control protocols.",
                value: 580000,
                status: "active",
                publishDate: "2024-11-05",
                closeDate: "2025-01-15",
                contractNumber: "24-25-JAN-2154",
                url: "https://buyandsell.gc.ca",
                category: "janitorial",
                keywords: ["cleaning", "janitorial", "medical", "sanitation", "biohazard", "waste"]
            },
            {
                id: 8,
                title: "School Custodial and Maintenance Services",
                department: "Indigenous Services Canada",
                description: "Custodial services for Indigenous community school including daily cleaning, floor care, window washing, and minor maintenance repairs.",
                value: 290000,
                status: "active",
                publishDate: "2024-11-12",
                closeDate: "2025-02-10",
                contractNumber: "24-25-JAN-3267",
                url: "https://buyandsell.gc.ca",
                category: "janitorial",
                keywords: ["custodial", "cleaning", "janitorial", "school", "maintenance", "floor care"]
            },
            {
                id: 9,
                title: "Waste Management and Recycling Services",
                department: "Environment and Climate Change Canada",
                description: "Comprehensive waste collection, sorting, recycling, and disposal services for government research facility with focus on environmental compliance.",
                value: 340000,
                status: "active",
                publishDate: "2024-08-15",
                closeDate: "2024-12-20",
                contractNumber: "24-25-JAN-0891",
                url: "https://buyandsell.gc.ca",
                category: "janitorial",
                keywords: ["waste", "recycling", "cleaning", "disposal", "janitorial", "environmental"]
            },
            {
                id: 10,
                title: "High-Rise Window Cleaning Services",
                department: "Public Works and Government Services",
                description: "Professional window cleaning services for 20-story government office tower including exterior glass, skylights, and interior windows.",
                value: 180000,
                status: "active",
                publishDate: "2024-11-22",
                closeDate: "2025-03-01",
                contractNumber: "24-25-JAN-4532",
                url: "https://buyandsell.gc.ca",
                category: "janitorial",
                keywords: ["window", "cleaning", "janitorial", "glass", "exterior", "maintenance"]
            },

            // LANDSCAPING CONTRACTS (5)
            {
                id: 11,
                title: "Year-Round Grounds Maintenance and Landscaping",
                department: "Parks Canada",
                description: "Comprehensive grounds maintenance including lawn care, tree trimming, flower bed maintenance, irrigation, and seasonal snow removal for national historic site.",
                value: 680000,
                status: "active",
                publishDate: "2024-11-08",
                closeDate: "2025-01-31",
                contractNumber: "24-25-LND-1923",
                url: "https://buyandsell.gc.ca",
                category: "landscaping",
                keywords: ["landscaping", "grounds", "lawn", "maintenance", "snow", "irrigation"]
            },
            {
                id: 12,
                title: "Snow Removal and Ice Control Services",
                department: "Infrastructure Canada",
                description: "24/7 snow plowing, de-icing, and ice control services for government parking lots, roadways, and sidewalks across Ottawa region during winter months.",
                value: 520000,
                status: "active",
                publishDate: "2024-11-14",
                closeDate: "2025-02-05",
                contractNumber: "24-25-LND-2678",
                url: "https://buyandsell.gc.ca",
                category: "landscaping",
                keywords: ["snow", "removal", "ice", "plowing", "winter", "landscaping"]
            },
            {
                id: 13,
                title: "Tree Care and Arborist Services",
                department: "Environment and Climate Change Canada",
                description: "Professional tree assessment, pruning, disease treatment, and removal services for forested areas surrounding government research campus.",
                value: 390000,
                status: "active",
                publishDate: "2024-07-20",
                closeDate: "2024-12-18",
                contractNumber: "24-25-LND-1534",
                url: "https://buyandsell.gc.ca",
                category: "landscaping",
                keywords: ["tree", "arborist", "landscaping", "pruning", "grounds", "maintenance"]
            },
            {
                id: 14,
                title: "Sports Field Maintenance and Line Painting",
                department: "Canadian Armed Forces",
                description: "Maintenance of athletic fields including grass cutting, aeration, fertilization, line painting, and equipment storage for military base recreational facilities.",
                value: 280000,
                status: "active",
                publishDate: "2024-11-28",
                closeDate: "2025-03-15",
                contractNumber: "24-25-LND-3891",
                url: "https://buyandsell.gc.ca",
                category: "landscaping",
                keywords: ["landscaping", "grass", "field", "maintenance", "lawn", "sports"]
            },
            {
                id: 15,
                title: "Landscape Design and Installation Project",
                department: "Public Services and Procurement Canada",
                description: "Complete landscape redesign and installation for government building entrance including native plants, irrigation system, decorative stone, and accessibility features.",
                value: 450000,
                status: "active",
                publishDate: "2024-11-17",
                closeDate: "2025-02-20",
                contractNumber: "24-25-LND-0745",
                url: "https://buyandsell.gc.ca",
                category: "landscaping",
                keywords: ["landscaping", "design", "installation", "irrigation", "grounds", "plants"]
            }
        ];
    }

    // Clear cache (useful for manual refresh)
    clearCache() {
        this.cache = {
            contracts: null,
            timestamp: null,
            ttl: this.cache.ttl
        };
    }

    // Get cache info (for debugging)
    getCacheInfo() {
        return {
            hasCache: !!this.cache.contracts,
            cacheAge: this.cache.timestamp ? Date.now() - this.cache.timestamp : null,
            cacheValid: this.isCacheValid(),
            contractCount: this.cache.contracts ? this.cache.contracts.length : 0
        };
    }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
    window.APIService = APIService;
}
