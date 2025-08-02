// State management for TerraSphere Build Editor
class BuildState {
  constructor() {
    this.state = {
      // Mastery Selection Phase
      chosenMasteries: [],
      armorType: null, // 'heavy', 'medium', 'light'
      
      // Rank Assignment Phase  
      chosenMasteriesRanks: [],
      weaponRank: 0,
      armorRank: 0,
      
      // Action Selection Phase
      chosenActions: [],
      
      // Character Info
      characterName: '',
      characterRace: '',
      characterTitle: '',
      threadCode: '',
      
      // Imported Character Data
      profileBannerUrl: '',
      
      // Build Metadata
      buildId: null,
      lastModified: new Date()
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
      chosenMasteriesRanks: [],
      weaponRank: 0,
      armorRank: 0,
      chosenActions: [],
      characterName: '',
      characterRace: '',
      characterTitle: '',
      threadCode: '',
      profileBannerUrl: '',
      buildId: null,
      lastModified: new Date()
    };
    this.saveToStorage();
    this.notifyListeners();
  }
  
  // Save to localStorage
  saveToStorage() {
    try {
      localStorage.setItem('tsbuilder_state', JSON.stringify(this.state));
    } catch (e) {
      // Silently handle localStorage save errors
    }
  }
  
  // Load from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('tsbuilder_state');
      console.log('💾 StateManager: Loading from localStorage:', saved ? 'Found data' : 'No data');
      if (saved) {
        const parsedState = JSON.parse(saved);
        console.log('💾 StateManager: Parsed localStorage data:', parsedState);
        this.state = { ...this.state, ...parsedState };
        console.log('💾 StateManager: State after loading:', this.state);
      }
    } catch (e) {
      console.error('💾 StateManager: Error loading from localStorage:', e);
    }
  }
  
  // Load from URL parameters (deprecated - localStorage-first approach)
  loadFromURL() {
    // URL parameter loading is now disabled to avoid long, problematic URLs
    // All character data is stored in localStorage and persists across page navigation
    // Only build codes (in URL hash) are used for sharing complete builds
    console.log('localStorage-first: URL parameter loading disabled for cleaner URLs');
  }
  
  // Generate clean URLs (localStorage-first approach)
  generateURL(basePath = '') {
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
    this.listeners = this.listeners.filter(l => l !== callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.state);
      } catch (e) {
        // Silently handle listener errors
      }
    });
  }
  
  // Validation methods
  isValidForRankSelection() {
    const valid = this.state.chosenMasteries.length > 0;
    console.log('🔍 StateManager: isValidForRankSelection =', valid, 'masteries:', this.state.chosenMasteries);
    return valid;
  }
  
  isValidForActionSelection() {
    const valid = this.state.chosenMasteries.length > 0 && 
           this.state.chosenMasteriesRanks.length === this.state.chosenMasteries.length;
    console.log('🔍 StateManager: isValidForActionSelection =', valid, {
      masteries: this.state.chosenMasteries.length,
      ranks: this.state.chosenMasteriesRanks.length
    });
    return valid;
  }
  
  isValidForBuildSheet() {
    const actionValid = this.isValidForActionSelection();
    const actionsValid = this.state.chosenActions.length > 0;
    const valid = actionValid && actionsValid;
    console.log('🔍 StateManager: isValidForBuildSheet =', valid, {
      actionSelectionValid: actionValid,
      hasActions: actionsValid,
      actionsCount: this.state.chosenActions.length
    });
    return valid;
  }
}

// Global state instance
window.buildState = new BuildState();