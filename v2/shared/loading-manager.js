// TerraSphere V2 - Loading State Manager
// Utility for managing loading spinners and states across the application

const LoadingManager = {
  // Show loading spinner in a container
  show(container, options = {}) {
    const {
      type = "ring", // ring, dots, mastery, data, progress
      text = "Loading...", // Loading text
      size = "normal", // small, normal, large
      overlay = false, // Show as overlay on existing content
      fullscreen = false, // Show fullscreen loading
    } = options;

    // Create loading HTML
    const loadingHTML = this.createLoadingHTML(type, text, size, fullscreen);

    if (typeof container === "string") {
      container =
        document.getElementById(container) || document.querySelector(container);
    }

    if (!container) {
      console.warn("LoadingManager: Container not found");
      return null;
    }

    if (overlay) {
      // Add overlay to existing content
      container.classList.add("loading-overlay");
      const overlayDiv = document.createElement("div");
      overlayDiv.className = "loading-overlay-content";
      overlayDiv.innerHTML = loadingHTML;
      container.appendChild(overlayDiv);
      return overlayDiv;
    } else {
      // Replace container content
      container.innerHTML = loadingHTML;
      return container.querySelector(".loading-container");
    }
  },

  // Hide loading spinner
  hide(container) {
    if (typeof container === "string") {
      container =
        document.getElementById(container) || document.querySelector(container);
    }

    if (!container) return;

    // Remove overlay
    container.classList.remove("loading-overlay");
    const overlayContent = container.querySelector(".loading-overlay-content");
    if (overlayContent) {
      overlayContent.remove();
    }

    // Remove loading container
    const loadingContainer = container.querySelector(".loading-container");
    if (loadingContainer) {
      loadingContainer.remove();
    }
  },

  // Show fullscreen loading
  showFullscreen(options = {}) {
    const existingOverlay = document.getElementById("ts-fullscreen-loading");
    if (existingOverlay) return existingOverlay;

    const {
      type = "mastery",
      text = "Loading TerraSphere V2...",
      size = "large",
    } = options;

    const overlay = document.createElement("div");
    overlay.id = "ts-fullscreen-loading";
    overlay.innerHTML = this.createLoadingHTML(type, text, size, true);

    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    return overlay;
  },

  // Hide fullscreen loading
  hideFullscreen() {
    const overlay = document.getElementById("ts-fullscreen-loading");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }
  },

  // Update loading text
  updateText(container, newText) {
    if (typeof container === "string") {
      container =
        document.getElementById(container) || document.querySelector(container);
    }

    const textElement = container?.querySelector(".loading-text");
    if (textElement) {
      textElement.textContent = newText;
    }
  },

  // Show loading in button
  showInButton(button, text = "Loading...") {
    if (typeof button === "string") {
      button =
        document.getElementById(button) || document.querySelector(button);
    }

    if (!button) return;

    // Store original content
    button._originalContent = button.innerHTML;
    button._originalDisabled = button.disabled;

    // Set loading content
    button.innerHTML = `<span class="spinner-inline"></span>${text}`;
    button.disabled = true;
    button.classList.add("loading");
  },

  // Hide loading in button
  hideInButton(button) {
    if (typeof button === "string") {
      button =
        document.getElementById(button) || document.querySelector(button);
    }

    if (!button) return;

    // Restore original content
    if (button._originalContent) {
      button.innerHTML = button._originalContent;
      button.disabled = button._originalDisabled || false;
      button.classList.remove("loading");

      delete button._originalContent;
      delete button._originalDisabled;
    }
  },

  // Create loading HTML based on type
  createLoadingHTML(type, text, size, fullscreen) {
    const containerClass = `loading-container ${fullscreen ? "fullscreen" : ""} loading-${size}`;
    let spinnerHTML = "";

    switch (type) {
      case "dots":
        spinnerHTML = `
          <div class="spinner-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        `;
        break;

      case "mastery":
        spinnerHTML = '<div class="spinner-mastery"></div>';
        break;

      case "data":
        spinnerHTML = '<div class="spinner-data"></div>';
        break;

      case "progress":
        spinnerHTML = '<div class="spinner-progress"></div>';
        break;

      case "ring":
      default:
        spinnerHTML = '<div class="spinner-ring"></div>';
        break;
    }

    return `
      <div class="${containerClass} loading-fade-in">
        ${spinnerHTML}
        ${text ? `<div class="loading-text">${text}</div>` : ""}
      </div>
    `;
  },

  // Utility methods for common loading scenarios
  showDataLoading(container) {
    return this.show(container, {
      type: "data",
      text: "Loading data...",
      size: "small",
    });
  },

  showMasteryLoading(container) {
    return this.show(container, {
      type: "mastery",
      text: "Loading masteries...",
    });
  },

  showActionLoading(container) {
    return this.show(container, {
      type: "dots",
      text: "Loading actions...",
    });
  },

  showImportLoading() {
    return this.showFullscreen({
      type: "progress",
      text: "Importing build...",
    });
  },

  // Promise wrapper for loading states
  async withLoading(container, promise, options = {}) {
    const loadingElement = this.show(container, options);

    try {
      const result = await promise;
      this.hide(container);
      return result;
    } catch (error) {
      this.hide(container);
      throw error;
    }
  },

  // Initialize loading manager (call this on page load)
  init() {
    // Add CSS if not already present
    if (!document.getElementById("ts-loading-styles")) {
      const link = document.createElement("link");
      link.id = "ts-loading-styles";
      link.rel = "stylesheet";
      link.href = "shared/loading-spinners.css";
      document.head.appendChild(link);
    }

    // Add loading overlay styles
    const style = document.createElement("style");
    style.textContent = `
      .loading-overlay-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(17, 20, 28, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        border-radius: inherit;
      }
      
      #ts-fullscreen-loading {
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }
      
      .button.loading {
        pointer-events: none;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
  },
};

// Auto-initialize when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => LoadingManager.init());
} else {
  LoadingManager.init();
}

// Make available globally
window.LoadingManager = LoadingManager;
