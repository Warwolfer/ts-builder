// State management for TerraSphere Build Editor

// Bumped whenever the stored shape changes in a way defaults cannot absorb.
// loadFromStorage() runs migrate() when a stored state is older than this, so
// an upload never leaves a player with a state the new code cannot read.
const STATE_VERSION = 2;

// Everything a fresh state holds. Built by a function so reset() and the
// constructor cannot drift apart, and so migrate() has one source of defaults.
function defaultState() {
  return {
    // Mastery Selection Phase
    chosenMasteries: [],
    armorType: null, // 'heavy', 'medium', 'light'
    accessoryType: null, // 'combat', 'utility', 'magic'

    // Expertise Selection Phase
    chosenExpertise: [],

    // Rank Assignment Phase
    chosenMasteriesRanks: [],
    chosenExpertiseRanks: [],
    weaponRank: 0,
    armorRank: 0,
    accessoryRank: 0,

    // Action Selection Phase
    chosenActions: [],

    // Custom actions imported on the build sheet's Custom tab. Each entry is
    // { id, action, payload }. They never enter the build code, the URL, the
    // embed code or the plan queue fingerprint — only this state, the saved
    // record, and the pending-build handoff.
    customActions: [],

    // Character Info
    characterName: "",
    characterRace: "",
    characterTitle: "",
    threadCode: "",
    note: "",
    ng: 0, // New Game Plus indicator (0 or 1)

    // Imported Character Data
    profileBannerUrl: "",
    bannerPositionY: 0,
    avatarUrl: "",
    imported: false, // Flag to track if character was imported from API

    // Build Metadata
    buildId: null,
    stateVersion: STATE_VERSION,
    lastModified: new Date(),
  };
}

class BuildState {
  static STATE_VERSION = STATE_VERSION;

  constructor() {
    this.state = defaultState();

    this.loadFromStorage();
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Update specific state properties
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.state.lastModified = new Date();
    this.saveToStorage();
    this.notifyListeners();
  }

  // Reset state to initial values
  reset() {
    this.state = defaultState();
    this.saveToStorage();
    this.notifyListeners();
  }

  // Save to localStorage
  saveToStorage() {
    try {
      localStorage.setItem("tsbuilder_state", JSON.stringify(this.state));
    } catch (e) {
      // Silently handle localStorage save errors
    }
  }

  // Load from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem("tsbuilder_state");
      if (!saved) return;
      const parsedState = JSON.parse(saved);
      if (parsedState.stateVersion === STATE_VERSION) {
        this.state = { ...this.state, ...parsedState };
        return;
      }
      this.state = BuildState.migrate(parsedState, parsedState.stateVersion);
      this.saveToStorage();
    } catch (e) {
      console.error("💾 StateManager: Error loading from localStorage:", e);
    }
  }

  // Brings a stored state from `fromVersion` (undefined for pre-versioned
  // states) up to STATE_VERSION. Today every change is absorbed by the
  // defaults merge; add a `if (fromVersion < N)` block here when a later
  // shape change needs real work.
  static migrate(saved, fromVersion) {
    const out = { ...defaultState(), ...saved };
    out.stateVersion = STATE_VERSION;
    return out;
  }

  // Load from URL parameters (deprecated - localStorage-first approach)
  loadFromURL() {
    // URL parameter loading is now disabled to avoid long, problematic URLs
    // All character data is stored in localStorage and persists across page navigation
    // Only build codes (in URL hash) are used for sharing complete builds
  }

  // Generate clean URLs (localStorage-first approach)
  generateURL(basePath = "") {
    // No longer generates query parameters - all data is in localStorage
    // This creates clean, shareable URLs between pages
    // For sharing builds, use BuildEncoder.generateBuildCode() instead
    return basePath;
  }

  // Event listeners for state changes
  listeners = [];

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.state);
      } catch (e) {
        // Silently handle listener errors
      }
    });
  }

  // Validation methods
  isValidForRankSelection() {
    // Allow zero masteries/expertise - user can start with empty character
    return true;
  }

  isValidForActionSelection() {
    // Allow zero masteries/expertise
    const masteryValid =
      this.state.chosenMasteriesRanks.length === this.state.chosenMasteries.length;

    const expertiseValid =
      this.state.chosenExpertiseRanks.length === this.state.chosenExpertise.length;

    // Validate rank caps for both masteries and expertise (only if they exist)
    let rankCapsValid = true;
    if (window.CharacterCalculations) {
      if (this.state.chosenMasteriesRanks.length > 0) {
        const masteryRankValidation =
          window.CharacterCalculations.validateMasteryRanks(
            this.state.chosenMasteriesRanks,
          );
        rankCapsValid = rankCapsValid && masteryRankValidation.valid;
      }
      if (this.state.chosenExpertiseRanks.length > 0) {
        const expertiseRankValidation =
          window.CharacterCalculations.validateMasteryRanks(
            this.state.chosenExpertiseRanks,
          );
        rankCapsValid = rankCapsValid && expertiseRankValidation.valid;
      }
    }

    const valid = masteryValid && expertiseValid && rankCapsValid;
    return valid;
  }

  isValidForBuildSheet() {
    const actionValid = this.isValidForActionSelection();
    // No minimum actions required
    return actionValid;
  }
}

// Global state instance
window.buildState = new BuildState();
window.BuildState = BuildState;
