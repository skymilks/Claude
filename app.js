// CrownBids - Canadian Government Contract Matching Platform
// Main Application Logic

class CrownBids {
    constructor() {
        this.contracts = [];
        this.filteredContracts = [];
        this.currentPage = 1;
        this.contractsPerPage = CONFIG.ui.contractsPerPage;
        this.departments = new Set();
        this.userProfile = null;
        this.apiService = new APIService();

        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadContracts();
        this.loadUserProfile();
        this.setupEventListeners();
        this.setupOnboardingListeners();
        this.populateDepartments();
        this.checkFirstVisit();
        this.hideLoading();
        this.displayContracts();
        this.updateStats();
    }

    // User Profile Management
    loadUserProfile() {
        this.userProfile = Utils.getFromStorage(CONFIG.storage.userProfile);
        if (this.userProfile) {
            this.displayUserProfile();
        }
    }

    saveUserProfile(profileData) {
        this.userProfile = profileData;
        Utils.setToStorage(CONFIG.storage.userProfile, profileData);
        this.displayUserProfile();
    }

    displayUserProfile() {
        if (this.userProfile && this.userProfile.companyName) {
            document.getElementById('userProfile').style.display = 'block';
            document.getElementById('companyNameDisplay').textContent = this.userProfile.companyName;
            document.getElementById('matchedStat').style.display = 'block';

            // Show match sort option
            const matchSortOption = document.getElementById('matchSortOption');
            if (matchSortOption) {
                matchSortOption.style.display = 'block';
            }
        }
    }

    // Onboarding
    checkFirstVisit() {
        if (!this.userProfile) {
            setTimeout(() => this.showOnboarding(), 500);
        }
    }

    showOnboarding() {
        const modal = document.getElementById('onboardingModal');
        modal.classList.add('active');

        // If editing profile, populate fields
        if (this.userProfile) {
            document.getElementById('companyName').value = this.userProfile.companyName || '';
            document.getElementById('companyWebsite').value = this.userProfile.website || '';
            document.getElementById('companyDescription').value = this.userProfile.description || '';
        }
    }

    hideOnboarding() {
        const modal = document.getElementById('onboardingModal');
        modal.classList.remove('active');
    }

    setupOnboardingListeners() {
        document.getElementById('skipOnboarding').addEventListener('click', () => {
            this.hideOnboarding();
        });

        document.getElementById('completeOnboarding').addEventListener('click', () => {
            this.completeOnboarding();
        });

        document.getElementById('editProfile').addEventListener('click', () => {
            this.showOnboarding();
        });
    }

    async completeOnboarding() {
        const companyName = document.getElementById('companyName').value.trim();
        const website = document.getElementById('companyWebsite').value.trim();
        const description = document.getElementById('companyDescription').value.trim();

        // Validate required fields
        if (!companyName) {
            Utils.showToast('Please enter your company name', 'error');
            return;
        }

        if (!website) {
            Utils.showToast('Please enter your company website URL', 'error');
            return;
        }

        // Validate URL format
        if (!Utils.isValidURL(website)) {
            Utils.showToast('Please enter a valid website URL (e.g., https://yourcompany.com)', 'error');
            return;
        }

        // Show loading state
        this.showAnalyzingState();

        try {
            // Crawl and analyze the website
            const websiteData = await this.crawlWebsite(website);

            // Extract keywords from all sources
            const websiteKeywords = this.extractKeywords(websiteData.text);
            const descriptionKeywords = this.extractKeywords(description);
            const urlKeywords = this.extractKeywordsFromURL(website);

            // Combine all keywords (prioritize website content)
            const allKeywords = [...new Set([...websiteKeywords, ...descriptionKeywords, ...urlKeywords])];

            // Store the full extracted content
            const fullDescription = description || websiteData.text.substring(0, 500);

            const profileData = {
                companyName,
                website,
                description: fullDescription,
                keywords: allKeywords,
                websiteAnalysis: {
                    title: websiteData.title,
                    keywordsFound: websiteKeywords.length,
                    analyzedAt: new Date().toISOString()
                },
                minValue: 0,
                maxValue: Infinity,
                showMatchedOnly: false
            };

            this.saveUserProfile(profileData);
            this.hideOnboarding();

            // Show success message with what was found
            this.showAnalysisResults(allKeywords.length, websiteKeywords.length);

            // Refresh display with matching
            this.displayContracts();
            this.updateStats();

        } catch (error) {
            console.error('Error analyzing website:', error);

            // Fallback to basic keyword extraction
            const descriptionKeywords = this.extractKeywords(description);
            const urlKeywords = this.extractKeywordsFromURL(website);
            const allKeywords = [...new Set([...descriptionKeywords, ...urlKeywords])];

            const profileData = {
                companyName,
                website,
                description,
                keywords: allKeywords,
                minValue: 0,
                maxValue: Infinity,
                showMatchedOnly: false
            };

            this.saveUserProfile(profileData);
            this.hideOnboarding();

            // Show message that we used manual input
            if (description) {
                Utils.showToast(`Profile created! We extracted ${allKeywords.length} keywords from your input.`, 'success', 4000);
            } else {
                Utils.showToast('Profile created! Please edit your profile to add more details for better matching.', 'success', 4000);
            }

            // Refresh display with matching
            this.displayContracts();
            this.updateStats();
        }
    }

    showAnalyzingState() {
        // Add loading overlay to onboarding
        const modal = document.querySelector('.onboarding-steps');
        const loadingHTML = `
            <div class="analyzing-overlay">
                <div class="analyzing-content">
                    <div class="spinner"></div>
                    <h3>Analyzing your website...</h3>
                    <p>We're crawling your website to understand your business</p>
                </div>
            </div>
        `;
        modal.insertAdjacentHTML('beforeend', loadingHTML);
    }

    hideAnalyzingState() {
        const overlay = document.querySelector('.analyzing-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showAnalysisResults(totalKeywords, websiteKeywords) {
        this.hideAnalyzingState();
        Utils.showToast(
            `Website analyzed successfully! Found ${websiteKeywords} keywords from your website. Total ${totalKeywords} keywords extracted for matching.`,
            'success',
            5000
        );
    }

    async crawlWebsite(url) {
        // Try multiple methods to fetch the website

        // Method 1: Direct fetch (will work for CORS-enabled sites)
        try {
            const response = await fetch(url);
            if (response.ok) {
                const html = await response.text();
                return this.parseHTML(html);
            }
        } catch (e) {
            console.log('Direct fetch failed, trying CORS proxy...');
        }

        // Method 2: Use CORS proxy
        const corsProxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`
        ];

        for (const proxyUrl of corsProxies) {
            try {
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const html = await response.text();
                    return this.parseHTML(html);
                }
            } catch (e) {
                console.log(`Proxy ${proxyUrl} failed, trying next...`);
            }
        }

        // If all methods fail, throw error
        throw new Error('Unable to fetch website content');
    }

    parseHTML(html) {
        // Create a temporary DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove script and style elements
        const scripts = doc.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());

        // Get title
        const title = doc.querySelector('title')?.textContent || '';

        // Get meta description
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

        // Get text from important sections
        const mainContent = doc.querySelector('main') || doc.querySelector('body');
        let text = mainContent ? mainContent.textContent : doc.body.textContent;

        // Clean up the text
        text = text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim();

        // Combine title, meta description, and main text
        const fullText = `${title} ${metaDesc} ${text}`.substring(0, 5000); // Limit to first 5000 chars

        return {
            title,
            metaDescription: metaDesc,
            text: fullText
        };
    }

    extractKeywordsFromURL(url) {
        try {
            const urlObj = new URL(url);
            // Extract domain name parts
            const domain = urlObj.hostname.replace('www.', '');
            const parts = domain.split('.');

            // Get main domain name (excluding TLD)
            const domainName = parts[0];

            // Split camelCase or hyphenated words
            const words = domainName
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/[-_]/g, ' ')
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3);

            return words;
        } catch (e) {
            return [];
        }
    }

    extractKeywords(text) {
        return Utils.extractKeywords(text);
    }

    // Intelligent Matching Algorithm
    calculateMatchScore(contract) {
        if (!this.userProfile || !this.userProfile.keywords || this.userProfile.keywords.length === 0) {
            return { score: 0, matchedKeywords: [] };
        }

        const contractText = `${contract.title} ${contract.description} ${contract.department}`.toLowerCase();
        const matchedKeywords = [];
        let score = 0;

        // Check each user keyword against contract
        this.userProfile.keywords.forEach(keyword => {
            if (contractText.includes(keyword)) {
                matchedKeywords.push(keyword);
                // Weight keywords found in title higher
                if (contract.title.toLowerCase().includes(keyword)) {
                    score += 3;
                } else if (contract.description.toLowerCase().includes(keyword)) {
                    score += 2;
                } else {
                    score += 1;
                }
            }
        });

        // Check contract value preferences
        if (this.userProfile.minValue && contract.value < this.userProfile.minValue) {
            score *= 0.5; // Reduce score if below minimum
        }
        if (this.userProfile.maxValue && contract.value > this.userProfile.maxValue) {
            score *= 0.7; // Reduce score if above maximum
        }

        // Normalize score to 0-100
        const normalizedScore = Math.min(100, (score / this.userProfile.keywords.length) * 20);

        return {
            score: Math.round(normalizedScore),
            matchedKeywords
        };
    }

    getMatchLevel(score) {
        if (score >= 70) return { level: 'high', label: 'Excellent Match' };
        if (score >= 40) return { level: 'medium', label: 'Good Match' };
        if (score > 0) return { level: 'low', label: 'Potential Match' };
        return { level: 'none', label: 'No Match' };
    }

    setupEventListeners() {
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        document.getElementById('departmentFilter').addEventListener('change', () => this.handleFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.handleFilters());
        document.getElementById('sortFilter').addEventListener('change', () => this.handleSort());
    }

    // Loading indicators
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // Load contracts from API
    async loadContracts(forceRefresh = false) {
        try {
            this.contracts = await this.apiService.getContracts(forceRefresh);
            this.filteredContracts = [...this.contracts];

            // Log cache info for debugging
            if (CONFIG.app.environment === 'development') {
                console.log('Contracts loaded:', this.contracts.length);
                console.log('Cache info:', this.apiService.getCacheInfo());
            }
        } catch (error) {
            console.error('Error loading contracts:', error);
            Utils.showToast('Failed to load contracts. Please try again.', 'error');
            // Use empty array as fallback
            this.contracts = [];
            this.filteredContracts = [];
        }
    }

    populateDepartments() {
        this.contracts.forEach(contract => {
            this.departments.add(contract.department);
        });

        const departmentSelect = document.getElementById('departmentFilter');
        Array.from(this.departments).sort().forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentSelect.appendChild(option);
        });
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        if (searchTerm === '') {
            this.filteredContracts = [...this.contracts];
        } else {
            this.filteredContracts = this.contracts.filter(contract =>
                contract.title.toLowerCase().includes(searchTerm) ||
                contract.description.toLowerCase().includes(searchTerm) ||
                contract.department.toLowerCase().includes(searchTerm) ||
                contract.contractNumber.toLowerCase().includes(searchTerm)
            );
        }

        this.handleFilters();
    }

    handleFilters() {
        const departmentFilter = document.getElementById('departmentFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        this.filteredContracts = this.contracts.filter(contract => {
            const matchesSearch = searchTerm === '' ||
                contract.title.toLowerCase().includes(searchTerm) ||
                contract.description.toLowerCase().includes(searchTerm) ||
                contract.department.toLowerCase().includes(searchTerm) ||
                contract.contractNumber.toLowerCase().includes(searchTerm);

            const matchesDepartment = departmentFilter === '' || contract.department === departmentFilter;
            const matchesStatus = statusFilter === '' || contract.status === statusFilter;

            // If user wants only matched contracts
            let matchesProfile = true;
            if (this.userProfile && this.userProfile.showMatchedOnly) {
                const matchResult = this.calculateMatchScore(contract);
                matchesProfile = matchResult.score > 0;
            }

            return matchesSearch && matchesDepartment && matchesStatus && matchesProfile;
        });

        this.handleSort();
    }

    handleSort() {
        const sortBy = document.getElementById('sortFilter').value;

        // Add match scores to contracts if user profile exists
        if (this.userProfile && this.userProfile.keywords && this.userProfile.keywords.length > 0) {
            this.filteredContracts.forEach(contract => {
                contract.matchData = this.calculateMatchScore(contract);
            });
        }

        switch(sortBy) {
            case 'date-desc':
                this.filteredContracts.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
                break;
            case 'date-asc':
                this.filteredContracts.sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));
                break;
            case 'value-desc':
                this.filteredContracts.sort((a, b) => b.value - a.value);
                break;
            case 'value-asc':
                this.filteredContracts.sort((a, b) => a.value - b.value);
                break;
            case 'match-desc':
                this.filteredContracts.sort((a, b) => (b.matchData?.score || 0) - (a.matchData?.score || 0));
                break;
        }

        this.currentPage = 1;
        this.displayContracts();
        this.updateStats();
    }

    displayContracts() {
        const contractsList = document.getElementById('contractsList');
        contractsList.innerHTML = '';

        if (this.filteredContracts.length === 0) {
            contractsList.innerHTML = `
                <div class="empty-state">
                    <h2>No contracts found</h2>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }

        const startIndex = (this.currentPage - 1) * this.contractsPerPage;
        const endIndex = startIndex + this.contractsPerPage;
        const contractsToDisplay = this.filteredContracts.slice(startIndex, endIndex);

        contractsToDisplay.forEach(contract => {
            const contractCard = this.createContractCard(contract);
            contractsList.appendChild(contractCard);
        });

        this.displayPagination();
    }

    createContractCard(contract) {
        const card = document.createElement('div');
        card.className = 'contract-card';

        const statusClass = contract.status === 'active' ? 'status-active' : 'status-closed';
        const formattedValue = this.formatCurrency(contract.value);
        const formattedPublishDate = this.formatDate(contract.publishDate);
        const formattedCloseDate = this.formatDate(contract.closeDate);

        // Generate match score badge if user has profile
        let matchBadge = '';
        if (this.userProfile && contract.matchData && contract.matchData.score > 0) {
            const matchLevel = this.getMatchLevel(contract.matchData.score);
            matchBadge = `<span class="match-score match-${matchLevel.level}">${contract.matchData.score}% ${matchLevel.label}</span>`;
        }

        card.innerHTML = `
            <div class="contract-header">
                <div class="contract-title">${contract.title}</div>
                <div>
                    <span class="contract-status ${statusClass}">${contract.status.toUpperCase()}</span>
                    ${matchBadge}
                </div>
            </div>
            <div class="contract-meta">
                <div class="meta-item">
                    <span class="meta-label">Contract #:</span>
                    <span>${contract.contractNumber}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Department:</span>
                    <span>${contract.department}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Published:</span>
                    <span>${formattedPublishDate}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Closes:</span>
                    <span>${formattedCloseDate}</span>
                </div>
            </div>
            <div class="contract-description">
                ${contract.description}
            </div>
            <div class="contract-footer">
                <div class="contract-value">${formattedValue}</div>
                <a href="${contract.url}" target="_blank" class="view-details">View Details</a>
            </div>
        `;

        return card;
    }

    displayPagination() {
        const paginationDiv = document.getElementById('pagination');
        paginationDiv.innerHTML = '';

        const totalPages = Math.ceil(this.filteredContracts.length / this.contractsPerPage);

        if (totalPages <= 1) return;

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.textContent = '← Previous';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayContracts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        paginationDiv.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                const pageBtn = document.createElement('button');
                pageBtn.className = 'page-btn' + (i === this.currentPage ? ' active' : '');
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => {
                    this.currentPage = i;
                    this.displayContracts();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
                paginationDiv.appendChild(pageBtn);
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '10px';
                paginationDiv.appendChild(ellipsis);
            }
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.textContent = 'Next →';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayContracts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        paginationDiv.appendChild(nextBtn);
    }

    updateStats() {
        const totalContracts = this.filteredContracts.length;
        const activeContracts = this.filteredContracts.filter(c => c.status === 'active').length;
        const totalValue = this.filteredContracts.reduce((sum, c) => sum + c.value, 0);

        document.getElementById('totalContracts').textContent = totalContracts;
        document.getElementById('activeContracts').textContent = activeContracts;
        document.getElementById('totalValue').textContent = this.formatCurrency(totalValue);

        // Update matched contracts count if user has profile
        if (this.userProfile) {
            const matchedContracts = this.filteredContracts.filter(c => {
                const matchData = this.calculateMatchScore(c);
                return matchData.score > 0;
            }).length;
            document.getElementById('matchedContracts').textContent = matchedContracts;
        }
    }

    formatCurrency(value) {
        return Utils.formatCurrency(value);
    }

    formatDate(dateString) {
        return Utils.formatDate(dateString);
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CrownBids();
});
