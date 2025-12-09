// CrownBids - Canadian Government Contract Matching Platform
// Main Application Logic

class CrownBids {
    constructor() {
        this.contracts = [];
        this.filteredContracts = [];
        this.currentPage = 1;
        this.contractsPerPage = 10;
        this.departments = new Set();
        this.userProfile = null;

        this.init();
    }

    init() {
        this.loadSampleData();
        this.loadUserProfile();
        this.setupEventListeners();
        this.setupOnboardingListeners();
        this.populateDepartments();
        this.checkFirstVisit();
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

    loadSampleData() {
        // Sample contract data based on typical Canadian government contracts
        this.contracts = [
            {
                id: 1,
                title: "IT Infrastructure Modernization Services",
                department: "Public Services and Procurement Canada",
                description: "Comprehensive IT infrastructure upgrade including cloud migration, network modernization, and security enhancements for government departments.",
                value: 15500000,
                status: "active",
                publishDate: "2024-11-15",
                closeDate: "2025-01-30",
                contractNumber: "24-25-IT-1547",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 2,
                title: "Healthcare Equipment Procurement",
                department: "Health Canada",
                description: "Supply and installation of medical diagnostic equipment for regional healthcare facilities across Canada.",
                value: 8750000,
                status: "active",
                publishDate: "2024-11-20",
                closeDate: "2025-02-15",
                contractNumber: "24-25-HC-2891",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 3,
                title: "Environmental Assessment Services",
                department: "Environment and Climate Change Canada",
                description: "Conducting comprehensive environmental impact assessments for proposed infrastructure projects in sensitive ecological areas.",
                value: 3200000,
                status: "active",
                publishDate: "2024-11-10",
                closeDate: "2025-01-20",
                contractNumber: "24-25-EC-0945",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 4,
                title: "Cybersecurity Consulting and Implementation",
                department: "Canadian Centre for Cyber Security",
                description: "Advanced cybersecurity services including threat assessment, penetration testing, and implementation of security protocols.",
                value: 12000000,
                status: "active",
                publishDate: "2024-11-25",
                closeDate: "2025-02-28",
                contractNumber: "24-25-CS-3421",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 5,
                title: "Bridge Maintenance and Repair",
                department: "Infrastructure Canada",
                description: "Structural assessment, maintenance, and repair services for federal bridges and overpasses in Ontario and Quebec regions.",
                value: 22500000,
                status: "closed",
                publishDate: "2024-09-01",
                closeDate: "2024-11-01",
                contractNumber: "24-25-IC-1876",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 6,
                title: "Translation and Interpretation Services",
                department: "Translation Bureau",
                description: "Professional translation and interpretation services for English and French official languages, including Indigenous languages.",
                value: 4500000,
                status: "active",
                publishDate: "2024-11-18",
                closeDate: "2025-01-25",
                contractNumber: "24-25-TB-0432",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 7,
                title: "Arctic Research Vessel Operations",
                department: "Fisheries and Oceans Canada",
                description: "Operation and maintenance of research vessels for Arctic marine studies, including crew services and scientific equipment.",
                value: 18900000,
                status: "active",
                publishDate: "2024-11-05",
                closeDate: "2025-01-15",
                contractNumber: "24-25-FO-2154",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 8,
                title: "National Parks Facility Upgrades",
                department: "Parks Canada",
                description: "Renovation and expansion of visitor facilities, trails, and campgrounds in national parks across Western Canada.",
                value: 9800000,
                status: "active",
                publishDate: "2024-11-12",
                closeDate: "2025-02-10",
                contractNumber: "24-25-PC-3267",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 9,
                title: "Veterans Services Technology Platform",
                department: "Veterans Affairs Canada",
                description: "Development of integrated digital platform for veterans services including benefits management, healthcare coordination, and support resources.",
                value: 7300000,
                status: "closed",
                publishDate: "2024-08-15",
                closeDate: "2024-10-15",
                contractNumber: "24-25-VA-0891",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 10,
                title: "Border Security Technology Enhancement",
                department: "Canada Border Services Agency",
                description: "Implementation of advanced screening technology and automated systems at major border crossings and ports of entry.",
                value: 31000000,
                status: "active",
                publishDate: "2024-11-22",
                closeDate: "2025-03-01",
                contractNumber: "24-25-CB-4532",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 11,
                title: "Indigenous Community Infrastructure",
                department: "Indigenous Services Canada",
                description: "Water treatment facilities and infrastructure development for remote Indigenous communities in Northern territories.",
                value: 28500000,
                status: "active",
                publishDate: "2024-11-08",
                closeDate: "2025-01-31",
                contractNumber: "24-25-IS-1923",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 12,
                title: "Agricultural Research and Development",
                department: "Agriculture and Agri-Food Canada",
                description: "Research programs for sustainable farming practices, crop resilience, and agricultural technology innovation.",
                value: 5600000,
                status: "active",
                publishDate: "2024-11-14",
                closeDate: "2025-02-05",
                contractNumber: "24-25-AA-2678",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 13,
                title: "Climate Change Adaptation Planning",
                department: "Environment and Climate Change Canada",
                description: "Development of regional climate adaptation strategies and implementation planning for coastal communities.",
                value: 6900000,
                status: "closed",
                publishDate: "2024-07-20",
                closeDate: "2024-10-20",
                contractNumber: "24-25-EC-1534",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 14,
                title: "Coast Guard Vessel Refurbishment",
                department: "Canadian Coast Guard",
                description: "Major refurbishment and life extension program for mid-shore patrol vessels including engines, navigation systems, and safety equipment.",
                value: 42000000,
                status: "active",
                publishDate: "2024-11-28",
                closeDate: "2025-03-15",
                contractNumber: "24-25-CG-3891",
                url: "https://buyandsell.gc.ca"
            },
            {
                id: 15,
                title: "Digital Records Management System",
                department: "Library and Archives Canada",
                description: "Implementation of enterprise-wide digital records management and archival system with advanced search and preservation capabilities.",
                value: 11200000,
                status: "active",
                publishDate: "2024-11-17",
                closeDate: "2025-02-20",
                contractNumber: "24-25-LA-0745",
                url: "https://buyandsell.gc.ca"
            }
        ];

        this.filteredContracts = [...this.contracts];
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
