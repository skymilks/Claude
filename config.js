// CrownBids - Configuration File
// Central configuration for API endpoints, features, and settings

const CONFIG = {
    // Application Info
    app: {
        name: 'CrownBids',
        version: '1.0.0',
        environment: 'development' // 'development' | 'production'
    },

    // API Endpoints
    api: {
        // Government of Canada Open Data Portal
        canadaOpenData: 'https://open.canada.ca/data/en/api/3/action',

        // Buyandsell.gc.ca (Government Electronic Tendering Service)
        getsAPI: 'https://buyandsell.gc.ca/procurement-data/tender-notice',

        // CORS Proxies (fallback for website crawling)
        corsProxies: [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?'
        ],

        // Future: Custom backend API
        backend: {
            base: '/api/v1',
            auth: '/auth',
            contracts: '/contracts',
            users: '/users',
            matches: '/matches'
        }
    },

    // Feature Flags
    features: {
        realTimeData: false,  // Enable real API calls
        authentication: false,  // Enable user auth
        premiumFeatures: false,  // Enable premium features
        analytics: false,  // Enable analytics tracking
        notifications: false  // Enable email/push notifications
    },

    // UI Settings
    ui: {
        contractsPerPage: 10,
        searchDebounceMs: 300,
        modalAnimationMs: 300,
        toastDurationMs: 3000
    },

    // Matching Algorithm Settings
    matching: {
        scoreThresholds: {
            high: 70,      // Excellent match
            medium: 40,    // Good match
            low: 1         // Potential match
        },
        weights: {
            titleMatch: 3,
            descriptionMatch: 2,
            departmentMatch: 1
        }
    },

    // LocalStorage Keys
    storage: {
        userProfile: 'crownbids_user_profile',
        preferences: 'crownbids_preferences',
        savedContracts: 'crownbids_saved_contracts'
    },

    // Validation Rules
    validation: {
        companyName: {
            minLength: 2,
            maxLength: 100
        },
        website: {
            pattern: /^https?:\/\/.+\..+$/
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
