// TerraSphere V2 - Button Component
// Reusable button component with consistent styling and loading states

const ButtonComponent = {
  // Render a button with specified options
  render(options = {}) {
    const {
      text = "Button",
      type = "primary", // primary, secondary, success, warning, danger, ghost
      size = "normal", // small, normal, large
      disabled = false,
      loading = false,
      icon = null,
      iconPosition = "left", // left, right
      onClick = null,
      id = null,
      className = "",
      attributes = {},
    } = options;

    let buttonClasses = `ts-button ts-button-${type} ts-button-${size}`;
    if (disabled) buttonClasses += " disabled";
    if (loading) buttonClasses += " loading";
    if (className) buttonClasses += ` ${className}`;

    const buttonId = id ? `id="${id}"` : "";
    const buttonDisabled = disabled || loading ? "disabled" : "";

    // Build attributes string
    let attributesString = "";
    Object.entries(attributes).forEach(([key, value]) => {
      attributesString += ` ${key}="${value}"`;
    });

    // Build button content
    let buttonContent = "";

    if (loading) {
      buttonContent += '<span class="spinner-inline"></span>';
    } else if (icon && iconPosition === "left") {
      buttonContent += `<span class="button-icon button-icon-left">${icon}</span>`;
    }

    buttonContent += `<span class="button-text">${text}</span>`;

    if (icon && iconPosition === "right" && !loading) {
      buttonContent += `<span class="button-icon button-icon-right">${icon}</span>`;
    }

    return `
      <button class="${buttonClasses}" 
              ${buttonId} 
              ${buttonDisabled}
              ${attributesString}>
        ${buttonContent}
      </button>
    `;
  },

  // Render button group
  renderGroup(buttons, options = {}) {
    const {
      layout = "horizontal", // horizontal, vertical
      spacing = "normal", // tight, normal, loose
      align = "left", // left, center, right
      className = "",
    } = options;

    let groupClasses = `ts-button-group ts-button-group-${layout} ts-button-group-${spacing} ts-button-group-${align}`;
    if (className) groupClasses += ` ${className}`;

    let groupHTML = `<div class="${groupClasses}">`;

    buttons.forEach((buttonOptions) => {
      groupHTML += this.render(buttonOptions);
    });

    groupHTML += "</div>";
    return groupHTML;
  },

  // Render navigation buttons (Previous/Next pattern)
  renderNavigation(options = {}) {
    const {
      previousText = "Previous",
      nextText = "Next",
      previousUrl = null,
      nextUrl = null,
      previousDisabled = false,
      nextDisabled = false,
      onPrevious = null,
      onNext = null,
      showProgress = false,
      currentStep = 1,
      totalSteps = 4,
    } = options;

    const buttons = [];

    // Previous button
    if (previousUrl || onPrevious) {
      buttons.push({
        text: previousText,
        type: "secondary",
        icon: "←",
        iconPosition: "left",
        disabled: previousDisabled,
        onClick: onPrevious,
        attributes: previousUrl ? { "data-url": previousUrl } : {},
      });
    }

    // Progress indicator
    if (showProgress) {
      buttons.push({
        text: `Step ${currentStep} of ${totalSteps}`,
        type: "ghost",
        disabled: true,
        className: "progress-indicator",
      });
    }

    // Next button
    buttons.push({
      text: nextText,
      type: "primary",
      icon: "→",
      iconPosition: "right",
      disabled: nextDisabled,
      onClick: onNext,
      attributes: nextUrl ? { "data-url": nextUrl } : {},
    });

    return this.renderGroup(buttons, {
      layout: "horizontal",
      align: "center",
      spacing: "normal",
      className: "navigation-buttons",
    });
  },

  // Create button element programmatically
  create(options = {}) {
    const buttonHTML = this.render(options);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = buttonHTML;
    const button = tempDiv.firstElementChild;

    // Add click event listener if provided
    if (options.onClick) {
      button.addEventListener("click", options.onClick);
    }

    return button;
  },

  // Update button state (loading, disabled, text)
  updateState(button, updates = {}) {
    if (typeof button === "string") {
      button = document.getElementById(button);
    }

    if (!button) return;

    const {
      loading = null,
      disabled = null,
      text = null,
      icon = null,
    } = updates;

    // Handle loading state
    if (loading !== null) {
      if (loading) {
        button.classList.add("loading");
        button.disabled = true;

        // Add spinner if not present
        if (!button.querySelector(".spinner-inline")) {
          const spinner = document.createElement("span");
          spinner.className = "spinner-inline";
          button.insertBefore(spinner, button.firstChild);
        }
      } else {
        button.classList.remove("loading");

        // Remove spinner
        const spinner = button.querySelector(".spinner-inline");
        if (spinner) {
          spinner.remove();
        }

        // Restore disabled state
        if (disabled === null) {
          button.disabled = button.classList.contains("disabled");
        }
      }
    }

    // Handle disabled state
    if (disabled !== null) {
      button.disabled = disabled;
      if (disabled) {
        button.classList.add("disabled");
      } else {
        button.classList.remove("disabled");
      }
    }

    // Update text
    if (text !== null) {
      const textElement = button.querySelector(".button-text");
      if (textElement) {
        textElement.textContent = text;
      }
    }

    // Update icon
    if (icon !== null) {
      const iconElement = button.querySelector(".button-icon");
      if (iconElement) {
        iconElement.innerHTML = icon;
      }
    }
  },

  // Initialize buttons with automatic event handling
  init(containerSelector = "body") {
    const container =
      typeof containerSelector === "string"
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!container) return;

    // Handle navigation buttons with data-url attributes
    const navButtons = container.querySelectorAll(".ts-button[data-url]");
    navButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const url = button.getAttribute("data-url");
        if (url) {
          // Show loading state briefly
          this.updateState(button, { loading: true });

          setTimeout(() => {
            window.location.href = url;
          }, 200);
        }
      });
    });

    // Inject styles
    this.injectStyles();
  },

  // Inject component styles
  injectStyles() {
    if (document.getElementById("button-component-styles")) return;

    const style = document.createElement("style");
    style.id = "button-component-styles";
    style.textContent = `
      /* Button Component Styles */
      .ts-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        white-space: nowrap;
        min-height: 44px;
        box-sizing: border-box;
      }
      
      /* Button sizes */
      .ts-button-small {
        padding: 8px 16px;
        font-size: 12px;
        min-height: 36px;
      }
      
      .ts-button-large {
        padding: 16px 32px;
        font-size: 16px;
        min-height: 52px;
      }
      
      /* Button types */
      .ts-button-primary {
        background-color: #47cbdd;
        color: #1e2131;
      }
      
      .ts-button-primary:hover:not(.disabled):not(.loading) {
        background-color: #3aa8b8;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(71, 203, 221, 0.3);
      }
      
      .ts-button-secondary {
        background-color: #2a2d3a;
        color: #ffffff;
        border: 2px solid #47cbdd;
      }
      
      .ts-button-secondary:hover:not(.disabled):not(.loading) {
        background-color: #47cbdd;
        color: #1e2131;
        transform: translateY(-1px);
      }
      
      .ts-button-success {
        background-color: #28a745;
        color: #ffffff;
      }
      
      .ts-button-success:hover:not(.disabled):not(.loading) {
        background-color: #218838;
        transform: translateY(-1px);
      }
      
      .ts-button-warning {
        background-color: #ffc107;
        color: #1e2131;
      }
      
      .ts-button-warning:hover:not(.disabled):not(.loading) {
        background-color: #e0a800;
        transform: translateY(-1px);
      }
      
      .ts-button-danger {
        background-color: #dc3545;
        color: #ffffff;
      }
      
      .ts-button-danger:hover:not(.disabled):not(.loading) {
        background-color: #c82333;
        transform: translateY(-1px);
      }
      
      .ts-button-ghost {
        background-color: transparent;
        color: #47cbdd;
        border: 2px solid transparent;
      }
      
      .ts-button-ghost:hover:not(.disabled):not(.loading) {
        background-color: rgba(71, 203, 221, 0.1);
        border-color: #47cbdd;
      }
      
      /* Button states */
      .ts-button.disabled,
      .ts-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      
      .ts-button.loading {
        pointer-events: none;
        opacity: 0.8;
      }
      
      .ts-button.loading .button-text {
        opacity: 0.7;
      }
      
      /* Button icons */
      .button-icon {
        display: flex;
        align-items: center;
      }
      
      .button-icon-left {
        margin-right: 4px;
      }
      
      .button-icon-right {
        margin-left: 4px;
      }
      
      /* Button groups */
      .ts-button-group {
        display: flex;
      }
      
      .ts-button-group-horizontal {
        flex-direction: row;
      }
      
      .ts-button-group-vertical {
        flex-direction: column;
      }
      
      .ts-button-group-tight {
        gap: 4px;
      }
      
      .ts-button-group-normal {
        gap: 12px;
      }
      
      .ts-button-group-loose {
        gap: 20px;
      }
      
      .ts-button-group-left {
        justify-content: flex-start;
      }
      
      .ts-button-group-center {
        justify-content: center;
      }
      
      .ts-button-group-right {
        justify-content: flex-end;
      }
      
      /* Navigation buttons */
      .navigation-buttons {
        margin-top: 30px;
        padding-top: 30px;
        border-top: 1px solid rgba(71, 203, 221, 0.2);
      }
      
      .progress-indicator {
        font-size: 12px !important;
        opacity: 0.7;
        cursor: default;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .ts-button-group-horizontal {
          flex-direction: column;
        }
        
        .ts-button {
          width: 100%;
          justify-content: center;
        }
        
        .navigation-buttons .ts-button {
          width: auto;
          flex: 1;
        }
        
        .navigation-buttons .progress-indicator {
          width: auto;
          flex: none;
        }
      }
      
      /* Loading spinner integration */
      .ts-button .spinner-inline {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: currentColor;
        animation: spin-ring 0.6s linear infinite;
        margin-right: 8px;
      }
      
      .ts-button-primary .spinner-inline {
        border-color: rgba(30, 33, 49, 0.3);
        border-top-color: #1e2131;
      }
      
      @keyframes spin-ring {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
  },
};

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  ButtonComponent.init();
});

// Make available globally
window.ButtonComponent = ButtonComponent;
