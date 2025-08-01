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
      console.warn('Could not save state to localStorage:', e);
    }
  }
  
  // Load from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('tsbuilder_state');
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.state = { ...this.state, ...parsedState };
      }
    } catch (e) {
      console.warn('Could not load state from localStorage:', e);
    }
  }
  
  // Load from URL parameters
  loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const updates = {};
    
    if (urlParams.has('masteries')) {
      updates.chosenMasteries = urlParams.get('masteries').split(',');
    }
    if (urlParams.has('ranks')) {
      updates.chosenMasteriesRanks = urlParams.get('ranks').split(',').map(Number);
    }
    if (urlParams.has('armor')) {
      updates.armorType = urlParams.get('armor');
    }
    if (urlParams.has('armorRank')) {
      updates.armorRank = parseInt(urlParams.get('armorRank'));
    }
    if (urlParams.has('weaponRank')) {
      updates.weaponRank = parseInt(urlParams.get('weaponRank'));
    }
    if (urlParams.has('actions')) {
      updates.chosenActions = urlParams.get('actions').split(',');
    }
    if (urlParams.has('name')) {
      updates.characterName = decodeURIComponent(urlParams.get('name'));
    }
    
    if (Object.keys(updates).length > 0) {
      this.updateState(updates);
    }
  }
  
  // Generate URL parameters from current state
  generateURL(basePath = '') {
    const params = new URLSearchParams();
    
    if (this.state.chosenMasteries.length > 0) {
      params.set('masteries', this.state.chosenMasteries.join(','));
    }
    if (this.state.chosenMasteriesRanks.length > 0) {
      params.set('ranks', this.state.chosenMasteriesRanks.join(','));
    }
    if (this.state.armorType) {
      params.set('armor', this.state.armorType);
    }
    if (this.state.armorRank > 0) {
      params.set('armorRank', this.state.armorRank.toString());
    }
    if (this.state.weaponRank > 0) {
      params.set('weaponRank', this.state.weaponRank.toString());
    }
    if (this.state.chosenActions.length > 0) {
      params.set('actions', this.state.chosenActions.join(','));
    }
    if (this.state.characterName) {
      params.set('name', encodeURIComponent(this.state.characterName));
    }
    
    const paramString = params.toString();
    return basePath + (paramString ? '?' + paramString : '');
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
        console.error('Error in state listener:', e);
      }
    });
  }
  
  // Validation methods
  isValidForRankSelection() {
    return this.state.chosenMasteries.length > 0;
  }
  
  isValidForActionSelection() {
    return this.state.chosenMasteries.length > 0 && 
           this.state.chosenMasteriesRanks.length === this.state.chosenMasteries.length;
  }
  
  isValidForBuildSheet() {
    return this.isValidForActionSelection() && 
           this.state.chosenActions.length > 0;
  }
}

// Global state instance
window.buildState = new BuildState();