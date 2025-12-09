// CrownBids - Lead Generation Funnel
// Main Application Logic

class CrownBids {
    constructor() {
        this.contracts = [];
        this.filteredContracts = [];
        this.apiService = new APIService();
        this.init();
    }

    async init() {
        // Load contracts
        this.showLoading();
        await this.loadContracts();
        this.hideLoading();

        // Setup search
        this.setupSearch();

        // Setup modal
        this.setupModal();

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

    // Setup hero search with real-time filtering
    setupSearch() {
        const searchInput = document.getElementById('heroSearchInput');

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }
    }

    // Handle search filtering
    handleSearch(query) {
        if (!query || query.trim() === '') {
            this.filteredContracts = [...this.contracts];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredContracts = this.contracts.filter(contract =>
                contract.title.toLowerCase().includes(lowerQuery) ||
                contract.description.toLowerCase().includes(lowerQuery) ||
                contract.department.toLowerCase().includes(lowerQuery)
            );
        }

        this.displayContracts(this.filteredContracts);
    }

    // Display contracts in grid
    displayContracts(contracts) {
        const grid = document.getElementById('contractsGrid');
        const emptyState = document.getElementById('emptyState');
        const resultsCount = document.getElementById('resultsCount');

        if (!grid) return;

        // Update results count
        if (resultsCount) {
            resultsCount.innerHTML = `Showing <strong>${contracts.length}</strong> active opportunities`;
        }

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

        // Determine complexity level
        const complexityLevel = contract.complexity > 60 ? 'High' :
                               contract.complexity > 30 ? 'Medium' : 'Low';

        // Format value
        const formattedValue = Utils.formatCurrency(contract.value);

        // Days until close
        const daysText = contract.daysUntilClose <= 3 ?
            `⚠️ ${contract.daysUntilClose} Days` :
            `${contract.daysUntilClose} Days`;

        card.innerHTML = `
            <div class="contract-header">
                <h3 class="contract-title">${Utils.sanitizeHTML(contract.title)}</h3>
                <div class="contract-badges">
                    <span class="badge badge-value">Value: ${formattedValue}</span>
                    <span class="badge badge-complexity">Complexity: ${complexityLevel} (${contract.complexity} Pages)</span>
                    <span class="badge badge-deadline">Closes: ${daysText}</span>
                </div>
            </div>
            <div class="contract-meta">
                <strong>${contract.department}</strong> • Contract #${contract.contractNumber}
            </div>
            <p class="contract-description">${Utils.sanitizeHTML(contract.description)}</p>
            <div class="contract-footer">
                <a href="${contract.url}" target="_blank" class="btn-secondary">View Source PDF</a>
                <button class="btn-primary" data-contract-id="${contract.id}">Auto-Draft Proposal</button>
            </div>
        `;

        // Add click handler for Auto-Draft button
        const autoDraftBtn = card.querySelector('.btn-primary');
        if (autoDraftBtn) {
            autoDraftBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAutoDraftModal(contract);
            });
        }

        return card;
    }

    // Show Auto-Draft modal
    showAutoDraftModal(contract) {
        const modal = document.getElementById('autoDraftModal');
        const titleEl = document.getElementById('modalContractTitle');
        const complexityEl = document.getElementById('modalComplexity');

        if (titleEl) {
            titleEl.textContent = contract.title;
        }

        if (complexityEl) {
            complexityEl.textContent = contract.complexity;
        }

        if (modal) {
            modal.classList.add('active');
        }

        // Track conversion event
        console.log('Auto-Draft modal opened for:', contract.title);
    }

    // Setup modal interactions
    setupModal() {
        const modal = document.getElementById('autoDraftModal');
        const closeBtn = document.getElementById('modalClose');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (modal) modal.classList.remove('active');
            });
        }

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
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
});
