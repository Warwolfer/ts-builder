// TerraSphere V2 - Mastery Display Component
// Reusable component for displaying masteries with ranks and visual styling

const MasteryDisplayComponent = {
  
  // Render mastery grid for selection
  renderMasteryGrid(masteries, selectedMasteries = [], options = {}) {
    const {
      selectable = false,
      showRanks = false,
      masteryRanks = [],
      showIcons = true,
      columns = 'auto',
      onMasteryClick = null
    } = options;
    
    let gridHTML = '<div class="mastery-grid">';
    
    // Group masteries by category
    const categories = this.groupMasteriesByCategory(masteries);
    
    Object.entries(categories).forEach(([category, categoryMasteries]) => {
      gridHTML += `<div class="mastery-category">`;
      gridHTML += `<h3 class="category-title">${this.formatCategoryName(category)}</h3>`;
      gridHTML += `<div class="mastery-cards">`;
      
      categoryMasteries.forEach((mastery, index) => {
        const isSelected = selectedMasteries.includes(mastery.lookup);
        const masteryIndex = selectedMasteries.indexOf(mastery.lookup);
        const rank = masteryIndex >= 0 ? masteryRanks[masteryIndex] : 0;
        
        gridHTML += this.renderMasteryCard(mastery, {
          selected: isSelected,
          selectable,
          showRank: showRanks,
          rank: rank,
          showIcon: showIcons,
          clickable: selectable
        });
      });
      
      gridHTML += `</div></div>`;
    });
    
    gridHTML += '</div>';
    return gridHTML;
  },
  
  // Render individual mastery card
  renderMasteryCard(mastery, options = {}) {
    const {
      selected = false,
      selectable = false,
      showRank = false,
      rank = 0,
      showIcon = true,
      clickable = false,
      size = 'normal' // small, normal, large
    } = options;
    
    let cardClasses = `mastery-card mastery-${size}`;
    if (selected) cardClasses += ' selected';
    if (selectable) cardClasses += ' selectable';
    if (clickable) cardClasses += ' clickable';
    if (mastery.role) cardClasses += ` mastery-role-${mastery.role}`;
    
    const roleColors = {
      'offense': '#dc3545',
      'defense': '#fd7e14', 
      'support': '#007bff',
      'alter': '#6f42c1'
    };
    
    const borderColor = roleColors[mastery.role] || '#47cbdd';
    
    return `
      <div class="${cardClasses}" 
           data-mastery="${mastery.lookup}"
           style="border-color: ${selected ? borderColor : 'transparent'}">
        ${showIcon ? `
          <div class="mastery-icon-container">
            <img src="${mastery.image}" 
                 alt="${mastery.name}" 
                 class="mastery-icon"
                 loading="lazy">
            ${showRank && rank > 0 ? `
              <div class="rank-badge rank-${this.getRankLetter(rank)}">${this.getRankLetter(rank)}</div>
            ` : ''}
          </div>
        ` : ''}
        <div class="mastery-info">
          <div class="mastery-name">${mastery.alt || mastery.name}</div>
          ${mastery.role ? `<div class="mastery-role">${this.formatRole(mastery.role)}</div>` : ''}
          ${mastery.secondaryRole ? `<div class="mastery-secondary-role">+${this.formatRole(mastery.secondaryRole)}</div>` : ''}
        </div>
        ${selected ? '<div class="selection-indicator">✓</div>' : ''}
      </div>
    `;
  },
  
  // Render mastery list (compact view)
  renderMasteryList(masteries, masteryRanks = [], options = {}) {
    const {
      showRanks = true,
      showIcons = true,
      showRoles = true,
      horizontal = false
    } = options;
    
    const listClass = horizontal ? 'mastery-list horizontal' : 'mastery-list vertical';
    
    let listHTML = `<div class="${listClass}">`;
    
    masteries.forEach((mastery, index) => {
      const rank = masteryRanks[index] || 0;
      
      listHTML += `
        <div class="mastery-list-item">
          ${showIcons ? `
            <div class="mastery-list-icon">
              <img src="${mastery.image}" alt="${mastery.name}" class="mastery-icon-small">
            </div>
          ` : ''}
          <div class="mastery-list-info">
            <div class="mastery-list-name">${mastery.alt || mastery.name}</div>
            ${showRoles && mastery.role ? `
              <div class="mastery-list-role">${this.formatRole(mastery.role)}</div>
            ` : ''}
          </div>
          ${showRanks && rank > 0 ? `
            <div class="mastery-list-rank">
              <span class="rank-badge rank-${this.getRankLetter(rank)}">${this.getRankLetter(rank)}</span>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    listHTML += '</div>';
    return listHTML;
  },
  
  // Group masteries by category/role
  groupMasteriesByCategory(masteries) {
    const categories = {};
    
    masteries.forEach(mastery => {
      const category = mastery.role || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(mastery);
    });
    
    // Sort categories in preferred order
    const sortedCategories = {};
    ['offense', 'defense', 'support', 'alter'].forEach(cat => {
      if (categories[cat]) {
        sortedCategories[cat] = categories[cat];
      }
    });
    
    // Add any remaining categories
    Object.keys(categories).forEach(cat => {
      if (!sortedCategories[cat]) {
        sortedCategories[cat] = categories[cat];
      }
    });
    
    return sortedCategories;
  },
  
  // Helper methods
  getRankLetter(rank) {
    const rankLabels = ['E', 'D', 'C', 'B', 'A', 'S'];
    return rankLabels[rank] || 'E';
  },
  
  formatRole(role) {
    return role.charAt(0).toUpperCase() + role.slice(1);
  },
  
  formatCategoryName(category) {
    const names = {
      'offense': 'Offensive Masteries',
      'defense': 'Defensive Masteries', 
      'support': 'Support Masteries',
      'alter': 'Alter Masteries'
    };
    return names[category] || category;
  },
  
  // Initialize component with event listeners
  init(containerId, masteries, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('MasteryDisplayComponent: Container not found:', containerId);
      return;
    }
    
    const {
      selectedMasteries = [],
      masteryRanks = [],
      onMasterySelect = null,
      selectable = false,
      mode = 'grid' // grid, list
    } = options;
    
    // Render based on mode
    let html = '';
    if (mode === 'grid') {
      html = this.renderMasteryGrid(masteries, selectedMasteries, {
        selectable,
        showRanks: masteryRanks.length > 0,
        masteryRanks,
        onMasteryClick: onMasterySelect
      });
    } else {
      html = this.renderMasteryList(masteries, masteryRanks, options);
    }
    
    container.innerHTML = html;
    
    // Setup event listeners if selectable
    if (selectable && onMasterySelect) {
      this.setupEventListeners(container, onMasterySelect);
    }
    
    // Inject styles
    this.injectStyles();
  },
  
  // Setup event listeners for mastery selection
  setupEventListeners(container, onMasterySelect) {
    const masteryCards = container.querySelectorAll('.mastery-card.clickable');
    
    masteryCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const masteryId = card.dataset.mastery;
        const isSelected = card.classList.contains('selected');
        
        if (onMasterySelect) {
          onMasterySelect(masteryId, !isSelected, card);
        }
      });
      
      // Add hover effects
      card.addEventListener('mouseenter', () => {
        card.classList.add('hover');
      });
      
      card.addEventListener('mouseleave', () => {
        card.classList.remove('hover');
      });
    });
  },
  
  // Inject component styles
  injectStyles() {
    if (document.getElementById('mastery-display-component-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mastery-display-component-styles';
    style.textContent = `
      /* Mastery Display Component Styles */
      .mastery-grid {
        display: flex;
        flex-direction: column;
        gap: 30px;
        padding: 20px;
      }
      
      .mastery-category {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .category-title {
        color: #47cbdd;
        font-size: 18px;
        font-weight: bold;
        margin: 0;
        padding-bottom: 10px;
        border-bottom: 2px solid rgba(71, 203, 221, 0.3);
      }
      
      .mastery-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .mastery-card {
        background-color: #1e2131;
        border: 2px solid transparent;
        border-radius: 8px;
        padding: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .mastery-card.clickable {
        cursor: pointer;
      }
      
      .mastery-card.clickable:hover,
      .mastery-card.hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(71, 203, 221, 0.2);
      }
      
      .mastery-card.selected {
        border-width: 2px;
        background-color: rgba(71, 203, 221, 0.1);
      }
      
      .mastery-icon-container {
        position: relative;
        margin-bottom: 10px;
      }
      
      .mastery-icon {
        width: 48px;
        height: 48px;
        border-radius: 6px;
      }
      
      .mastery-icon-small {
        width: 32px;
        height: 32px;
        border-radius: 4px;
      }
      
      .rank-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #47cbdd;
        color: #1e2131;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid #1e2131;
      }
      
      .rank-S { background-color: #ffd700; }
      .rank-A { background-color: #fd7e14; }
      .rank-B { background-color: #e83e8c; }
      .rank-C { background-color: #28a745; }
      .rank-D { background-color: #007bff; }
      .rank-E { background-color: #6c757d; }
      
      .mastery-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      
      .mastery-name {
        color: #ffffff;
        font-weight: bold;
        font-size: 14px;
      }
      
      .mastery-role {
        color: #47cbdd;
        font-size: 12px;
        opacity: 0.8;
      }
      
      .mastery-secondary-role {
        color: #a9357b;
        font-size: 11px;
        opacity: 0.7;
      }
      
      .selection-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: #28a745;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }
      
      /* List view styles */
      .mastery-list {
        display: flex;
        gap: 10px;
        padding: 15px;
      }
      
      .mastery-list.vertical {
        flex-direction: column;
      }
      
      .mastery-list.horizontal {
        flex-direction: row;
        flex-wrap: wrap;
      }
      
      .mastery-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background-color: #1e2131;
        border-radius: 6px;
        border: 1px solid rgba(71, 203, 221, 0.2);
      }
      
      .mastery-list-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .mastery-list-name {
        color: #ffffff;
        font-weight: bold;
        font-size: 14px;
      }
      
      .mastery-list-role {
        color: #47cbdd;
        font-size: 12px;
        opacity: 0.8;
      }
      
      .mastery-list-rank {
        display: flex;
        align-items: center;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .mastery-cards {
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        
        .mastery-card {
          padding: 10px;
        }
        
        .mastery-icon {
          width: 40px;
          height: 40px;
        }
        
        .mastery-name {
          font-size: 13px;
        }
      }
      
      /* Role-specific styling */
      .mastery-role-offense { --role-color: #dc3545; }
      .mastery-role-defense { --role-color: #fd7e14; }
      .mastery-role-support { --role-color: #007bff; }
      .mastery-role-alter { --role-color: #6f42c1; }
      
      .mastery-card.selected {
        border-color: var(--role-color, #47cbdd);
      }
    `;
    
    document.head.appendChild(style);
  }
};

// Make available globally
window.MasteryDisplayComponent = MasteryDisplayComponent;