// Data loading utilities for TerraSphere Build Editor

const DataLoader = {
  // Cache for loaded data
  cache: {
    masteries: null,
    actions: null,
    characters: null
  },
  
  // Load mastery data
  loadMasteries() {
    if (this.cache.masteries) {
      return this.cache.masteries;
    }
    
    if (window.masterylist) {
      this.cache.masteries = window.masterylist;
      return this.cache.masteries;
    }
    
    throw new Error('Could not load mastery data - masterylist not found');
  },
  
  // Load action data
  loadActions() {
    if (this.cache.actions) {
      return this.cache.actions;
    }
    
    if (window.actionlist) {
      this.cache.actions = window.actionlist;
      return this.cache.actions;
    }
    
    throw new Error('Could not load action data - actionlist not found');
  },
  
  // Load character data (from safe characters)
  loadCharacters() {
    if (this.cache.characters) {
      return this.cache.characters;
    }
    
    if (window.charlist) {
      this.cache.characters = window.charlist;
      return this.cache.characters;
    }
    
    throw new Error('Could not load character data - charlist not found');
  },
  
  // Get masteries by category
  getMasteriesByCategory(category = null) {
    if (!this.cache.masteries) {
      throw new Error('Masteries not loaded. Call loadMasteries() first.');
    }
    
    if (!category) {
      return this.cache.masteries;
    }
    
    return this.cache.masteries.filter(mastery => mastery.role === category);
  },
  
  // Get mastery by lookup ID
  getMasteryById(id) {
    if (!this.cache.masteries) {
      throw new Error('Masteries not loaded. Call loadMasteries() first.');
    }
    
    return this.cache.masteries.find(mastery => mastery.lookup === id);
  },
  
  // Get actions by mastery
  getActionsByMastery(masteryId) {
    if (!this.cache.actions) {
      throw new Error('Actions not loaded. Call loadActions() first.');
    }
    
    return this.cache.actions.filter(action => 
      action.masteries && action.masteries.includes(masteryId)
    );
  },
  
  // Get action by lookup ID
  getActionById(id) {
    if (!this.cache.actions) {
      throw new Error('Actions not loaded. Call loadActions() first.');
    }
    
    return this.cache.actions.find(action => action.lookup === id);
  },
  
  // Get available actions for selected masteries
  getAvailableActions(selectedMasteries) {
    if (!this.cache.actions) {
      throw new Error('Actions not loaded. Call loadActions() first.');
    }
    
    return this.cache.actions.filter(action => {
      if (!action.masteries) return false;
      
      // Check if action is available for any of the selected masteries
      const masteryList = action.masteries.split(' ');
      return masteryList.some(mastery => selectedMasteries.includes(mastery));
    });
  },
  
  // Filter actions by category
  getActionsByCategory(category) {
    if (!this.cache.actions) {
      throw new Error('Actions not loaded. Call loadActions() first.');
    }
    
    return this.cache.actions.filter(action => action.category === category);
  },
  
  // Get action pairs
  getActionPairs() {
    if (!this.cache.actions) {
      throw new Error('Actions not loaded. Call loadActions() first.');
    }
    
    const pairs = {};
    this.cache.actions.forEach(action => {
      if (action.pair) {
        if (!pairs[action.pair]) {
          pairs[action.pair] = [];
        }
        pairs[action.pair].push(action);
      }
    });
    
    return pairs;
  },
  
  // Load all data at once
  loadAll() {
    try {
      const masteries = this.loadMasteries();
      const actions = this.loadActions();
      const characters = this.loadCharacters();
      
      return {
        masteries: masteries,
        actions: actions,
        characters: characters
      };
    } catch (error) {
      console.error('Failed to load all data:', error);
      throw error;
    }
  },
  
  // Clear cache (useful for testing or updates)
  clearCache() {
    this.cache = {
      masteries: null,
      actions: null,
      characters: null
    };
  },
  
  // Check if data is loaded
  isDataLoaded() {
    return !!(this.cache.masteries && this.cache.actions && this.cache.characters);
  }
};

// Make available globally
window.DataLoader = DataLoader;