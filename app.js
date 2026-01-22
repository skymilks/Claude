// CrownBids - Smart Contract Matching Tool
// Utility-First Approach

class CrownBids {
    constructor() {
        this.contracts = [];
        this.filteredContracts = [];
        this.apiService = new APIService();
        this.userCategory = null;
        this.init();
    }

    async init() {
        // Load contracts
        this.showLoading();
        await this.loadContracts();
        this.hideLoading();

        // Setup URL input
        this.setupURLInput();

        // Display all contracts initially
        this.displayContracts(this.contracts);
    }

    // Load contracts from API
    async loadContracts() {
        try {
            this.contracts = await this.apiService.getContracts();
            this.filteredContracts = [...this.contracts];

            console.log(`Loaded ${this.contracts.length} contracts`);
        } catch (error) {
            console.error('Error loading contracts:', error);
            this.contracts = [];
            this.filteredContracts = [];
        }
    }

    // Setup URL input handler
    setupURLInput() {
        const input = document.getElementById('companyWebsiteInput');
        const button = document.getElementById('analyzeButton');

        if (button) {
            button.addEventListener('click', () => {
                const url = input ? input.value.trim() : '';
                if (url) {
                    this.analyzeURL(url);
                } else {
                    Utils.showToast('Please enter your company website URL', 'error');
                }
            });
        }

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const url = input.value.trim();
                    if (url) {
                        this.analyzeURL(url);
                    }
                }
            });
        }
    }

    // Analyze URL and show scanning animation
    async analyzeURL(url) {
        // Validate URL
        if (!Utils.isValidURL(url)) {
            Utils.showToast('Please enter a valid URL (e.g., https://yourcompany.com)', 'error');
            return;
        }

        // Show scanning overlay
        this.showScanning();

        // Simulate scanning animation while the real analysis happens
        const analysisPromise = this.apiService.analyzeCompanyURL(url);
        const animationPromise = this.simulateAnalysis(url);

        // Wait for both to complete (animation ensures minimum 3-second display)
        await animationPromise;
        const result = await analysisPromise;

        // Store user's category
        this.userCategory = result.category;

        // Use contracts from backend (already filtered and scored)
        if (result.contracts && result.contracts.length > 0) {
            this.filteredContracts = result.contracts;
            console.log(`✅ Showing ${result.contracts.length} matches for category: ${result.category}`);
        } else {
            // No matches found
            this.filteredContracts = [];
            Utils.showToast('No matching contracts found. Showing all available contracts.', 'info');
            this.filteredContracts = this.contracts;
        }

        // Hide scanning and display results
        this.hideScanning();
        this.displayContracts(this.filteredContracts);

        // Update results count
        this.updateResultsCount();
    }

    // Detect business category from URL
    detectCategory(url) {
        const lowerURL = url.toLowerCase();

        // Security keywords
        if (lowerURL.includes('secure') || lowerURL.includes('guard') ||
            lowerURL.includes('safe') || lowerURL.includes('security') ||
            lowerURL.includes('patrol') || lowerURL.includes('protect')) {
            return 'security';
        }

        // Janitorial keywords
        if (lowerURL.includes('clean') || lowerURL.includes('janitorial') ||
            lowerURL.includes('wash') || lowerURL.includes('custodial') ||
            lowerURL.includes('sanit') || lowerURL.includes('maid')) {
            return 'janitorial';
        }

        // Landscaping keywords
        if (lowerURL.includes('scape') || lowerURL.includes('snow') ||
            lowerURL.includes('lawn') || lowerURL.includes('grass') ||
            lowerURL.includes('tree') || lowerURL.includes('garden')) {
            return 'landscaping';
        }

        return null; // No match
    }

    // Calculate match score for a contract
    calculateMatchScore(contract, url) {
        let score = 75; // Base score for category match

        const lowerURL = url.toLowerCase();
        const lowerTitle = contract.title.toLowerCase();
        const lowerDesc = contract.description.toLowerCase();

        // Bonus points for keyword matches in URL
        contract.keywords.forEach(keyword => {
            if (lowerURL.includes(keyword)) score += 3;
            if (lowerTitle.includes(keyword)) score += 2;
            if (lowerDesc.includes(keyword)) score += 1;
        });

        // Cap at 98 (never 100%)
        return Math.min(score, 98);
    }

    // Simulate scanning animation with progress
    async simulateAnalysis(url) {
        const statusEl = document.getElementById('scanningStatus');
        const progressEl = document.getElementById('scanningProgress');

        const steps = [
            { text: 'Scanning website...', progress: 0, duration: 200 },
            { text: 'Analyzing services...', progress: 25, duration: 700 },
            { text: 'Scanning 5,000+ contracts...', progress: 50, duration: 1000 },
            { text: 'Calculating compatibility...', progress: 75, duration: 800 },
            { text: 'Finalizing matches...', progress: 100, duration: 300 }
        ];

        for (const step of steps) {
            if (statusEl) statusEl.textContent = step.text;
            if (progressEl) progressEl.style.width = `${step.progress}%`;
            await this.delay(step.duration);
        }
    }

    // Helper: Delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Show scanning overlay
    showScanning() {
        const overlay = document.getElementById('scanningOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    // Hide scanning overlay
    hideScanning() {
        const overlay = document.getElementById('scanningOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // Update results count
    updateResultsCount() {
        const countEl = document.getElementById('resultsCount');
        const matchedCountText = document.getElementById('matchedCountText');
        const matchedCount = document.getElementById('matchedCount');

        if (countEl) {
            if (this.userCategory && this.filteredContracts.length > 0) {
                if (matchedCountText) matchedCountText.style.display = 'inline';
                if (matchedCount) matchedCount.textContent = this.filteredContracts.length;
            } else {
                if (matchedCountText) matchedCountText.style.display = 'none';
            }

            const total = this.contracts.length;
            countEl.innerHTML = `Showing <strong>${this.filteredContracts.length}</strong> active opportunities${this.userCategory ? ` • <span id="matchedCountText">Found <strong id="matchedCount">${this.filteredContracts.length}</strong> matches for your business</span>` : ''}`;
        }
    }

    // Display contracts in grid
    displayContracts(contracts) {
        const grid = document.getElementById('contractsGrid');
        const emptyState = document.getElementById('emptyState');
        const resultsCount = document.getElementById('resultsCount');

        if (!grid) return;

        if (contracts.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        // Clear grid
        grid.innerHTML = '';

        // Add contract cards
        contracts.forEach(contract => {
            const card = this.createContractCard(contract);
            grid.appendChild(card);
        });
    }

    // Create contract card element
    createContractCard(contract) {
        const card = document.createElement('div');
        card.className = 'contract-card';

        // Match score badge (only if analyzed)
        let matchBadgeHTML = '';
        if (contract.matchScore) {
            const matchClass = contract.matchScore >= 90 ? 'high' : 'medium';
            matchBadgeHTML = `
                <div class="match-score-badge ${matchClass}">
                    <div>
                        ${contract.matchScore}%
                        <span class="match-score-label">Match</span>
                    </div>
                </div>
            `;
        }

        // Format value
        const formattedValue = Utils.formatCurrency(contract.value);

        // Service category tag
        const categoryMap = {
            'security': 'Security',
            'janitorial': 'Janitorial',
            'landscaping': 'Landscaping'
        };
        const categoryLabel = categoryMap[contract.category] || 'General';

        // Days until close
        const daysText = contract.daysUntilClose <= 3 ?
            `⚠️ ${contract.daysUntilClose} Days` :
            `${contract.daysUntilClose} Days`;

        card.innerHTML = `
            <div class="contract-header">
                <div class="contract-title-wrapper">
                    <h3 class="contract-title">${Utils.sanitizeHTML(contract.title)}</h3>
                    <div class="contract-badges">
                        <span class="badge badge-value">Service: ${categoryLabel}</span>
                        <span class="badge badge-deadline">Closes: ${daysText}</span>
                    </div>
                </div>
                ${matchBadgeHTML}
            </div>
            <div class="contract-meta">
                <strong>${contract.department}</strong> • Contract #${contract.contractNumber} • ${formattedValue}
            </div>
            <p class="contract-description">${Utils.sanitizeHTML(contract.description)}</p>
            <div class="contract-footer">
                <a href="${contract.url}" target="_blank" class="btn-view-details">View Contract Details</a>
                <a href="#book-pilot" class="help-link">Get Help Writing This →</a>
            </div>
        `;

        return card;
    }

    // Loading indicators
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'block';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CrownBids();

    // Setup tutorial functionality
    setupTutorial();
});

// Tutorial functionality
function setupTutorial() {
    const tutorialLink = document.getElementById('tutorialLink');
    const tutorialSection = document.getElementById('tutorial');
    const closeButton = document.querySelector('.btn-close-tutorial');
    const tabButtons = document.querySelectorAll('.tutorial-tab-btn');

    if (!tutorialLink || !tutorialSection) return;

    // Show tutorial
    tutorialLink.addEventListener('click', (e) => {
        e.preventDefault();
        tutorialSection.style.display = 'block';
        window.scrollTo(0, 0);
    });

    // Close tutorial
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            tutorialSection.style.display = 'none';
        });
    }

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all buttons and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tutorial-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabContent = document.getElementById(tabName);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}
