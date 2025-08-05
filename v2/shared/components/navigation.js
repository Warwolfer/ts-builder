// TerraSphere V2 - Navigation Component
// Reusable navigation bar for all V2 pages

const NavigationComponent = {
  
  // Render the main navigation bar
  render(currentPage = '') {
    return `
      <nav id="mw-navigation" class="fixed-top">
        <div class="container">
          <a href="https://terrarp.com/build/" class="navbar-brand">
            <img src="https://terrarp.com/db/logo/logo-xs.png">
          </a>
          <div class="nav-center">
            <div class="nav-title">
              <span class="nav-title-main">TerraSphere Build Editor</span>
              <span class="nav-title-sub">Version 2.0</span>
            </div>
          </div>
          <div class="nav-right">
            <div class="nav-links">
              <div class="dropdown">
                <span class="dropdown-toggle">Tools ▼</span>
                <div class="dropdown-content">
                  <a href="https://terrarp.com/wiki/Masteries">Mastery Guide</a>
                  <a href="https://terrarp.com/wiki/Races">Playable Races</a>
                  <a href="https://terrarp.com/wiki/RPG_Mechanics">RPG Mechanics</a>
                  <a href="https://terrarp.com/wiki/Actions">Action List</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    `;
  },
  
  // Render breadcrumb navigation for multi-step process
  renderBreadcrumbs(steps, currentStep) {
    const breadcrumbSteps = [
      { id: 'mastery', name: 'Select Masteries', url: 'mastery-selector.html' },
      { id: 'expertise', name: 'Choose Expertise', url: 'expertise-selector.html' },
      { id: 'actions', name: 'Pick Actions', url: 'action-selector.html' },
      { id: 'build', name: 'Build Sheet', url: 'build-sheet.html' }
    ];
    
    let breadcrumbHTML = '<div class="breadcrumb-nav">';
    
    breadcrumbSteps.forEach((step, index) => {
      const isActive = step.id === currentStep;
      const isCompleted = index < breadcrumbSteps.findIndex(s => s.id === currentStep);
      const isDisabled = index > breadcrumbSteps.findIndex(s => s.id === currentStep);
      
      let className = 'breadcrumb-step';
      if (isActive) className += ' active';
      if (isCompleted) className += ' completed';
      if (isDisabled) className += ' disabled';
      
      breadcrumbHTML += `
        <div class="${className}">
          ${isDisabled ? 
            `<span class="step-content">
              <span class="step-number">${index + 1}</span>
              <span class="step-name">${step.name}</span>
             </span>` :
            `<a href="${step.url}" class="step-content">
              <span class="step-number">${index + 1}</span>
              <span class="step-name">${step.name}</span>
             </a>`
          }
          ${index < breadcrumbSteps.length - 1 ? '<span class="step-arrow">→</span>' : ''}
        </div>
      `;
    });
    
    breadcrumbHTML += '</div>';
    return breadcrumbHTML;
  },
  
  // Initialize navigation component
  init(containerId = 'navigation', options = {}) {
    const {
      currentPage = '',
      showBreadcrumbs = false,
      currentStep = ''
    } = options;
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('NavigationComponent: Container not found:', containerId);
      return;
    }
    
    let navigationHTML = this.render(currentPage);
    
    if (showBreadcrumbs && currentStep) {
      navigationHTML += this.renderBreadcrumbs([], currentStep);
    }
    
    container.innerHTML = navigationHTML;
    
    // Add event listeners for dropdowns
    this.setupEventListeners();
    
    // Add navigation styles if not present
    this.injectStyles();
  },
  
  // Setup event listeners for interactive elements
  setupEventListeners() {
    // Dropdown functionality
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      const content = dropdown.querySelector('.dropdown-content');
      
      if (toggle && content) {
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Close other dropdowns
          dropdowns.forEach(other => {
            if (other !== dropdown) {
              other.classList.remove('active');
            }
          });
          
          // Toggle current dropdown
          dropdown.classList.toggle('active');
        });
      }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    });
  },
  
  // Inject component styles
  injectStyles() {
    if (document.getElementById('navigation-component-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'navigation-component-styles';
    style.textContent = `
      /* Navigation Component Styles */
      .nav-center {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .nav-title {
        text-align: center;
        color: #47cbdd;
      }
      
      .nav-title-main {
        display: block;
        font-size: 18px;
        font-weight: bold;
      }
      
      .nav-title-sub {
        display: block;
        font-size: 12px;
        opacity: 0.8;
        margin-top: 2px;
      }
      
      .nav-right {
        display: flex;
        align-items: center;
      }
      
      .dropdown {
        position: relative;
        display: inline-block;
      }
      
      .dropdown-toggle {
        color: #47cbdd;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .dropdown-toggle:hover,
      .dropdown.active .dropdown-toggle {
        background-color: rgba(71, 203, 221, 0.1);
      }
      
      .dropdown-content {
        display: none;
        position: absolute;
        right: 0;
        top: 100%;
        background-color: #1e2131;
        min-width: 200px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        border-radius: 6px;
        z-index: 1000;
        border: 1px solid #47cbdd;
        margin-top: 5px;
      }
      
      .dropdown.active .dropdown-content {
        display: block;
        animation: dropdown-fade-in 0.2s ease-out;
      }
      
      .dropdown-content a {
        color: #ffffff;
        padding: 12px 16px;
        text-decoration: none;
        display: block;
        transition: background-color 0.2s;
      }
      
      .dropdown-content a:hover {
        background-color: rgba(71, 203, 221, 0.1);
        color: #47cbdd;
      }
      
      .dropdown-content a:first-child {
        border-radius: 6px 6px 0 0;
      }
      
      .dropdown-content a:last-child {
        border-radius: 0 0 6px 6px;
      }
      
      @keyframes dropdown-fade-in {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Breadcrumb Navigation */
      .breadcrumb-nav {
        background-color: rgba(30, 33, 49, 0.95);
        padding: 15px 20px;
        border-bottom: 1px solid rgba(71, 203, 221, 0.2);
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .breadcrumb-step {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .step-content {
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        color: #ffffff;
        transition: color 0.2s;
      }
      
      .breadcrumb-step.active .step-content {
        color: #47cbdd;
        font-weight: bold;
      }
      
      .breadcrumb-step.completed .step-content {
        color: #28a745;
      }
      
      .breadcrumb-step.disabled .step-content {
        color: #6c757d;
        cursor: not-allowed;
      }
      
      .breadcrumb-step:not(.disabled) .step-content:hover {
        color: #47cbdd;
      }
      
      .step-number {
        background-color: rgba(71, 203, 221, 0.2);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }
      
      .breadcrumb-step.active .step-number {
        background-color: #47cbdd;
        color: #1e2131;
      }
      
      .breadcrumb-step.completed .step-number {
        background-color: #28a745;
        color: #ffffff;
      }
      
      .step-arrow {
        color: rgba(71, 203, 221, 0.5);
        font-size: 16px;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .nav-title-main {
          font-size: 16px;
        }
        
        .nav-title-sub {
          font-size: 11px;
        }
        
        .breadcrumb-nav {
          padding: 10px 15px;
        }
        
        .step-name {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
};

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('navigation');
  if (navContainer) {
    // Try to detect current page from URL
    const currentPage = window.location.pathname.split('/').pop();
    NavigationComponent.init('navigation', { currentPage });
  }
});

// Make available globally
window.NavigationComponent = NavigationComponent;