// TerraSphere V2 - Centralized Configuration System
// Manages all application settings, URLs, feature flags, and environment configs

const Config = {
  // Environment detection
  environment: {
    isDevelopment:
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1",
    isProduction: window.location.hostname.includes("terrarp.com"),
    isV2: window.location.pathname.includes("/v2/"),

    get current() {
      if (this.isDevelopment) return "development";
      if (this.isProduction) return "production";
      return "staging";
    },
  },

  // API and URL configuration
  api: {
    base: {
      development: "http://localhost:3000",
      staging: "https://staging.terrarp.com",
      production: "https://terrarp.com",
    },

    endpoints: {
      characters: "/api/characters",
      masteries: "/api/masteries",
      actions: "/api/actions",
      builds: "/api/builds",
      profiles: "/data/profile_banners",
    },

    // Get API base URL for current environment
    getBaseUrl() {
      return this.base[Config.environment.current] || this.base.production;
    },

    // Get full endpoint URL
    getEndpoint(endpoint) {
      const baseUrl = this.getBaseUrl();
      const path = this.endpoints[endpoint];
      return path ? `${baseUrl}${path}` : null;
    },
  },

  // TerraSphere V2 specific URLs
  urls: {
    wiki: "https://terrarp.com/wiki",
    buildEditor: {
      v1: "https://terrarp.com/build/",
      v2: "https://terrarp.com/build/v2/",
    },

    // V2 page URLs
    pages: {
      index: "index.html",
      masterySelector: "mastery-selector.html",
      expertiseSelector: "expertise-selector.html",
      actionSelector: "action-selector.html",
      buildSheet: "build-sheet.html",
      debug: "debug-import.html",
    },

    // External resources
    resources: {
      logo: "https://terrarp.com/db/logo/logo-xs.png",
      favicon: "https://www.terrarp.com/favicon.ico",
      fonts: "https://fonts.gstatic.com",
      profileBanners: "https://terrarp.com/data/profile_banners/l/0/",
    },

    // Get page URL with base path
    getPageUrl(page) {
      const basePath = Config.environment.isV2 ? "" : "v2/";
      return `${basePath}${this.pages[page] || page}`;
    },
  },

  // UI Configuration
  ui: {
    theme: {
      primary: "#47cbdd",
      secondary: "#a9357b",
      background: "#11141c",
      surface: "#1e2131",
      surfaceLight: "#2a2d3a",
      text: "#ffffff",
      textMuted: "#b0b3b8",

      // Role colors
      roles: {
        offense: "#dc3545",
        defense: "#fd7e14",
        support: "#007bff",
        alter: "#6f42c1",
      },

      // Rank colors
      ranks: {
        S: "#ffd700",
        A: "#fd7e14",
        B: "#e83e8c",
        C: "#28a745",
        D: "#007bff",
        E: "#6c757d",
      },

      // Status colors
      success: "#28a745",
      warning: "#ffc107",
      error: "#dc3545",
      info: "#17a2b8",
    },

    // Layout settings
    layout: {
      maxContentWidth: "1200px",
      sidebarWidth: "280px",
      headerHeight: "60px",

      // Grid settings
      masteryGridColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      actionGridColumns: "repeat(auto-fill, minmax(250px, 1fr))",

      // Breakpoints
      breakpoints: {
        mobile: "768px",
        tablet: "1024px",
        desktop: "1200px",
      },
    },

    // Animation settings
    animations: {
      duration: {
        fast: "0.15s",
        normal: "0.3s",
        slow: "0.5s",
      },

      easing: {
        ease: "ease",
        easeOut: "ease-out",
        easeInOut: "ease-in-out",
      },

      // Disable animations for reduced motion
      respectReducedMotion: true,
    },

    // Component defaults
    components: {
      loadingSpinner: {
        defaultType: "ring",
        showText: true,
        fadeInDuration: 300,
      },

      buttons: {
        defaultSize: "normal",
        showLoadingSpinner: true,
        disableOnClick: true,
      },

      masteryCards: {
        showIcons: true,
        showRanks: true,
        showRoles: true,
        enableHover: true,
      },
    },
  },

  // Feature flags
  features: {
    // Core features
    v2BuildSystem: true,
    compactBuildCodes: true,
    expertiseSystem: true,
    accessorySystem: true,
    secondaryRoles: true,

    // UI features
    loadingSpinners: true,
    breadcrumbNavigation: true,
    realtimeValidation: true,
    autoSave: true,

    // Debug features
    debugMode: false, // Set to true in development
    verboseLogging: false,
    showPerformanceMetrics: false,

    // Experimental features
    buildSharing: true,
    buildTemplates: false,
    advancedFiltering: false,
    darkModeToggle: false,

    // Get feature flag value
    isEnabled(feature) {
      const value = this[feature];

      // Override with environment-specific logic
      if (feature === "debugMode") {
        return value || Config.environment.isDevelopment;
      }

      if (feature === "verboseLogging") {
        return value || (Config.environment.isDevelopment && this.debugMode);
      }

      return Boolean(value);
    },
  },

  // Game-specific settings
  game: {
    // V2 system limits
    limits: {
      maxMasteries: 6,
      maxActions: 12,
      maxExpertise: 6,
      maxRank: 5,

      // Rank distribution limits
      rankCaps: {
        S: 1,
        A: 2,
        B: 3,
        C: 4,
        D: 5,
        E: 6,
      },
    },

    // Default values
    defaults: {
      armorType: null,
      accessoryType: null,
      weaponRank: 0,
      armorRank: 0,
      accessoryRank: 0,
    },

    // Validation rules
    validation: {
      requireArmorType: true,
      requireAccessoryType: true,
      requireMinimumMasteries: 1,
      requireMinimumActions: 1,

      // Progressive validation (unlock next step only when current is valid)
      progressiveValidation: true,
    },
  },

  // Performance settings
  performance: {
    // Debounce delays (ms)
    debounce: {
      search: 300,
      resize: 150,
      scroll: 100,
      input: 200,
    },

    // Cache settings
    cache: {
      masteryData: true,
      actionData: true,
      buildState: true,

      // Cache duration (ms)
      duration: {
        shortTerm: 5 * 60 * 1000, // 5 minutes
        mediumTerm: 30 * 60 * 1000, // 30 minutes
        longTerm: 24 * 60 * 60 * 1000, // 24 hours
      },
    },

    // Lazy loading
    lazyLoading: {
      images: true,
      offscreenContent: true,
      threshold: 0.1,
    },
  },

  // User preferences (stored in localStorage)
  preferences: {
    // Default preferences
    defaults: {
      showTooltips: true,
      showAnimations: true,
      compactView: false,
      autoSaveInterval: 30000, // 30 seconds
      showBreadcrumbs: true,
      rememberLastBuild: true,
    },

    // Get user preference
    get(key) {
      try {
        const stored = localStorage.getItem("ts_v2_preferences");
        const preferences = stored ? JSON.parse(stored) : {};
        return preferences[key] !== undefined
          ? preferences[key]
          : this.defaults[key];
      } catch (error) {
        console.warn("Config: Failed to get preference:", key, error);
        return this.defaults[key];
      }
    },

    // Set user preference
    set(key, value) {
      try {
        const stored = localStorage.getItem("ts_v2_preferences");
        const preferences = stored ? JSON.parse(stored) : {};
        preferences[key] = value;
        localStorage.setItem("ts_v2_preferences", JSON.stringify(preferences));
        return true;
      } catch (error) {
        console.warn("Config: Failed to set preference:", key, value, error);
        return false;
      }
    },

    // Reset to defaults
    reset() {
      try {
        localStorage.removeItem("ts_v2_preferences");
        return true;
      } catch (error) {
        console.warn("Config: Failed to reset preferences:", error);
        return false;
      }
    },
  },

  // Utility methods
  utils: {
    // Get environment-specific value
    getEnvironmentValue(values) {
      const env = Config.environment.current;
      return values[env] || values.default || values.production;
    },

    // Create CSS custom properties from theme
    createCSSCustomProperties() {
      const properties = {};
      const theme = Config.ui.theme;

      // Convert theme colors to CSS custom properties
      Object.entries(theme).forEach(([category, value]) => {
        if (typeof value === "string") {
          properties[`--ts-${category}`] = value;
        } else if (typeof value === "object") {
          Object.entries(value).forEach(([subKey, subValue]) => {
            properties[`--ts-${category}-${subKey}`] = subValue;
          });
        }
      });

      return properties;
    },

    // Apply CSS custom properties to document
    applyCSSCustomProperties() {
      const properties = this.createCSSCustomProperties();
      const root = document.documentElement;

      Object.entries(properties).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    },

    // Generate cache key
    generateCacheKey(prefix, ...parts) {
      return `ts_v2_${prefix}_${parts.join("_")}`;
    },
  },

  // Initialize configuration system
  init() {
    // Set debug mode based on environment
    if (this.environment.isDevelopment) {
      this.features.debugMode = true;
      this.features.verboseLogging = true;
    }

    // Apply CSS custom properties
    this.utils.applyCSSCustomProperties();

    // Log initialization in debug mode
    if (this.features.isEnabled("verboseLogging")) {
      console.group("🔧 TerraSphere V2 Configuration");
      console.log("Environment:", this.environment.current);
      console.log("API Base URL:", this.api.getBaseUrl());
      console.log(
        "Features enabled:",
        Object.keys(this.features).filter(
          (f) =>
            typeof this.features[f] !== "function" &&
            this.features.isEnabled(f),
        ),
      );
      console.groupEnd();
    }

    // Set global flag for other modules
    window.TS_V2_CONFIG_LOADED = true;

    // Dispatch configuration ready event
    document.dispatchEvent(
      new CustomEvent("ts:config:ready", {
        detail: { config: this },
      }),
    );
  },
};

// Auto-initialize when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Config.init());
} else {
  Config.init();
}

// Make available globally
window.Config = Config;
window.TSConfig = Config; // Alternative name
