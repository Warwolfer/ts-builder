// State management for TerraSphere Build Editor
class BuildState {
  constructor() {
    this.state = {
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

      // Character Info
      characterName: "",
      characterRace: "",
      characterTitle: "",
      threadCode: "",
      note: "",
      ng: 0, // New Game Plus indicator (0 or 1)

      // Imported Character Data
      profileBannerUrl: "",
      avatarUrl: "",

      // Build Metadata
      buildId: null,
      lastModified: new Date(),
    };

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
    this.state = {
      chosenMasteries: [],
      armorType: null,
      chosenExpertise: [],
      chosenMasteriesRanks: [],
      chosenExpertiseRanks: [],
      weaponRank: 0,
      armorRank: 0,
      chosenActions: [],
      characterName: "",
      characterRace: "",
      characterTitle: "",
      threadCode: "",
      ng: 0,
      profileBannerUrl: "",
      avatarUrl: "",
      buildId: null,
      lastModified: new Date(),
    };
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
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.state = { ...this.state, ...parsedState };
      }
    } catch (e) {
      console.error("💾 StateManager: Error loading from localStorage:", e);
    }
  }

  // Load from URL parameters (deprecated - localStorage-first approach)
  loadFromURL() {
    // URL parameter loading is now disabled to avoid long, problematic URLs
    // All character data is stored in localStorage and persists across page navigation
    // Only build codes (in URL hash) are used for sharing complete builds
  }

  // Load character data from TerraSphere Character Manager
  loadFromCharacterManager(characterData) {
    if (!characterData) return;

    const updates = {};

    // Basic character info
    if (characterData.character_name) {
      updates.characterName = characterData.character_name;
    }

    if (characterData.race) {
      updates.characterRace = characterData.race;
    }

    if (characterData.title) {
      updates.characterTitle = characterData.title;
    }

    // Profile images
    if (characterData.profile_banner_url) {
      updates.profileBannerUrl = characterData.profile_banner_url;
    }

    if (characterData.avatar_url) {
      updates.avatarUrl = characterData.avatar_url;
    }

    // Check for New Game Plus status
    if (
      characterData.secondary_user_group_ids &&
      Array.isArray(characterData.secondary_user_group_ids)
    ) {
      // Set ng to true (1) if secondary_user_group_ids contains ID 30
      updates.ng = characterData.secondary_user_group_ids.includes(30) ? 1 : 0;
    }

    // Update state with character data
    this.updateState(updates);

    console.log(
      "📋 StateManager: Loaded character from TerraSphere Character Manager",
      updates,
    );
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
    return (
      this.state.chosenMasteries.length > 0 &&
      this.state.chosenExpertise.length > 0
    );
  }

  isValidForActionSelection() {
    const masteryValid =
      this.state.chosenMasteries.length > 0 &&
      this.state.chosenMasteriesRanks.length ===
        this.state.chosenMasteries.length;

    const expertiseValid =
      this.state.chosenExpertise.length > 0 &&
      this.state.chosenExpertiseRanks.length ===
        this.state.chosenExpertise.length;

    // V2: Also validate rank caps for both masteries and expertise
    let rankCapsValid = true;
    if (window.CharacterCalculations) {
      const masteryRankValidation =
        window.CharacterCalculations.validateMasteryRanks(
          this.state.chosenMasteriesRanks,
        );
      const expertiseRankValidation =
        window.CharacterCalculations.validateMasteryRanks(
          this.state.chosenExpertiseRanks,
        );
      rankCapsValid =
        masteryRankValidation.valid && expertiseRankValidation.valid;
    }

    const valid = masteryValid && expertiseValid && rankCapsValid;
    return valid;
  }

  isValidForBuildSheet() {
    const actionValid = this.isValidForActionSelection();
    const actionsValid = this.state.chosenActions.length > 0;
    const valid = actionValid && actionsValid;
    return valid;
  }
}

// Global state instance
window.buildState = new BuildState();
