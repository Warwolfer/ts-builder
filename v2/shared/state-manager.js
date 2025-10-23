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
    if (characterData.username) {
      updates.characterName = characterData.username;
    }

    if (characterData.Race) {
      updates.characterRace = characterData.Race;
    }

    if (characterData.custom_title) {
      updates.characterTitle = characterData.custom_title;
    }

    // Profile images
    if (characterData.banner_urls?.l) {
      updates.profileBannerUrl = characterData.banner_urls.l;
    }

    if (characterData.avatar_urls?.m) {
      updates.avatarUrl = characterData.avatar_urls.m;
    }

    // Check for New Game Plus status
    if (
      characterData.secondary_user_group_ids &&
      Array.isArray(characterData.secondary_user_group_ids)
    ) {
      // Set ng to true (1) if secondary_user_group_ids contains ID 30
      updates.ng = characterData.secondary_user_group_ids.includes(30) ? 1 : 0;
    }

    // Parse character masteries for V2 system
    const chosenMasteries = [];
    const chosenMasteriesRanks = [];

    if (characterData.masteries && characterData.masteries.length > 0) {
      for (let i = 0; i < characterData.masteries.length; i++) {
        // Convert mastery name to V2 format (lowercase with hyphens)
        const masteryName = characterData.masteries[i].Mastery.toLowerCase().replace(/\s+/g, '-');
        const rank = characterData.masteries[i].Rank;

        chosenMasteries.push(masteryName);

        // Convert rank letter to number (0=E, 1=D, 2=C, 3=B, 4=A, 5=S)
        const rankMap = {'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5};
        chosenMasteriesRanks.push(rankMap[rank] || 0);
      }
      updates.chosenMasteries = chosenMasteries;
      updates.chosenMasteriesRanks = chosenMasteriesRanks;
    }

    // Parse expertise for V2 system
    const chosenExpertise = [];
    const chosenExpertiseRanks = [];
    const rankMap = {'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5};

    if (characterData.expertises && characterData.expertises.length > 0) {
      for (let i = 0; i < characterData.expertises.length; i++) {
        // Convert expertise name to V2 format (lowercase with hyphens)
        const expertiseName = characterData.expertises[i].Expertise.toLowerCase().replace(/\s+/g, '-');
        const rank = characterData.expertises[i].Rank;

        chosenExpertise.push(expertiseName);
        chosenExpertiseRanks.push(rankMap[rank] || 0);
      }
      updates.chosenExpertise = chosenExpertise;
      updates.chosenExpertiseRanks = chosenExpertiseRanks;
    }

    // Parse armor and accessory types from equipment
    if (characterData.equipment && characterData.equipment.length >= 2) {
      // Parse armor type
      const armorKey = Object.keys(characterData.equipment[1])[0];
      if (armorKey === 'Heavy Armor') {
        updates.armorType = 'heavy';
      } else if (armorKey === 'Medium Armor') {
        updates.armorType = 'medium';
      } else if (armorKey === 'Light Armor') {
        updates.armorType = 'light';
      }

      // Parse accessory type if available
      if (characterData.equipment.length >= 3) {
        const accessoryKey = Object.keys(characterData.equipment[2])[0];
        if (accessoryKey === 'Cloak' || accessoryKey === 'Combat Accessory') {
          updates.accessoryType = 'cloak';
        } else if (accessoryKey === 'Charm' || accessoryKey === 'Social Accessory') {
          updates.accessoryType = 'charm';
        } else if (accessoryKey === 'Band' || accessoryKey === 'Exploration Accessory') {
          updates.accessoryType = 'band';
        }
      }
    }

    // Clear chosen actions since masteries/expertise changed
    updates.chosenActions = [];

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
