// Data loading utilities for TerraSphere Build Editor

const DataLoader = {
  // Cache for loaded data
  cache: {
    masteries: null,
    actions: null,
    characters: null,
  },

  // Optimized lookup maps for O(1) access
  lookupMaps: {
    masteryLookup: new Map(), // lookup -> mastery object
    actionLookup: new Map(), // lookup -> action object
    masteryByRole: new Map(), // role -> mastery array
    actionByCategory: new Map(), // category -> action array
    actionsByMastery: new Map(), // masteryId -> action array
    actionPairs: new Map(), // pairId -> action array
    characterLookup: new Map(), // lookup -> character object
  },

  // Build lookup maps for optimized access
  buildLookupMaps() {
    console.log("🔧 DataLoader: Building lookup maps...");
    console.log(
      "🔧 Actions available:",
      this.cache.actions ? this.cache.actions.length : "none",
    );
    console.log(
      "🔧 Masteries available:",
      this.cache.masteries ? this.cache.masteries.length : "none",
    );

    // Clear existing maps
    Object.values(this.lookupMaps).forEach((map) => map.clear());

    // Build mastery lookup maps
    if (this.cache.masteries) {
      this.cache.masteries.forEach((mastery) => {
        // Lookup map: masteryId -> mastery object
        this.lookupMaps.masteryLookup.set(mastery.lookup, mastery);

        // Role map: role -> mastery array (supports both role and primaryRole)
        const role = mastery.primaryRole || mastery.role;
        if (role) {
          if (!this.lookupMaps.masteryByRole.has(role)) {
            this.lookupMaps.masteryByRole.set(role, []);
          }
          this.lookupMaps.masteryByRole.get(role).push(mastery);
        }
      });
    }

    // Build action lookup maps
    if (this.cache.actions) {
      console.log("🔧 Processing", this.cache.actions.length, "actions");
      let actionsByMasteryCount = 0;

      this.cache.actions.forEach((action, index) => {
        // Lookup map: actionId -> action object
        this.lookupMaps.actionLookup.set(action.lookup, action);

        // Category map: category -> action array
        if (action.category) {
          if (!this.lookupMaps.actionByCategory.has(action.category)) {
            this.lookupMaps.actionByCategory.set(action.category, []);
          }
          this.lookupMaps.actionByCategory.get(action.category).push(action);
        }

        // Mastery maps: masteryId -> action array
        if (action.masteries) {
          action.masteries.forEach((masteryId) => {
            if (masteryId === "all") {
              // Handle special 'all' case - still want to track these
              console.log('🔧 Found "all" action:', action.name);
              return;
            }
            if (!this.lookupMaps.actionsByMastery.has(masteryId)) {
              this.lookupMaps.actionsByMastery.set(masteryId, []);
            }
            this.lookupMaps.actionsByMastery.get(masteryId).push(action);
            actionsByMasteryCount++;
          });
        }

        // Pair map: pairId -> action array
        if (action.pair) {
          if (!this.lookupMaps.actionPairs.has(action.pair)) {
            this.lookupMaps.actionPairs.set(action.pair, []);
          }
          this.lookupMaps.actionPairs.get(action.pair).push(action);
        }
      });

      console.log("🔧 Built actionsByMastery mappings:", actionsByMasteryCount);
      console.log(
        "🔧 Unique masteries in actions:",
        this.lookupMaps.actionsByMastery.size,
      );
    }

    // Build character lookup maps
    if (this.cache.characters) {
      this.cache.characters.forEach((character) => {
        this.lookupMaps.characterLookup.set(character.lookup, character);
      });
    }
  },

  // Load mastery data
  loadMasteries() {
    if (this.cache.masteries) {
      return this.cache.masteries;
    }

    // V2 uses different variable names
    if (window.masteriesV2) {
      this.cache.masteries = window.masteriesV2;
      this.buildLookupMaps();
      return this.cache.masteries;
    }

    if (window.masterylist) {
      this.cache.masteries = window.masterylist;
      this.buildLookupMaps();
      return this.cache.masteries;
    }

    throw new Error("Could not load mastery data - masteries not found");
  },

  // Load action data
  loadActions() {
    if (this.cache.actions) {
      console.log(
        "🔄 DataLoader: Actions already cached, returning",
        this.cache.actions.length,
        "actions",
      );
      return this.cache.actions;
    }

    console.log("🔄 DataLoader: Loading actions...");
    console.log("🔄 window.actionlistV2 available:", !!window.actionlistV2);
    console.log("🔄 window.actionlist available:", !!window.actionlist);

    // V2 uses different variable names
    if (window.actionlistV2) {
      console.log(
        "🔄 Loading actionlistV2 with",
        window.actionlistV2.length,
        "actions",
      );
      this.cache.actions = window.actionlistV2;
      this.buildLookupMaps();
      return this.cache.actions;
    }

    if (window.actionlist) {
      console.log(
        "🔄 Loading actionlist with",
        window.actionlist.length,
        "actions",
      );
      this.cache.actions = window.actionlist;
      this.buildLookupMaps();
      return this.cache.actions;
    }

    throw new Error("Could not load action data - actions not found");
  },

  // Load character data (from safe characters)
  loadCharacters() {
    if (this.cache.characters) {
      return this.cache.characters;
    }

    if (window.charlist) {
      this.cache.characters = window.charlist;
      this.buildLookupMaps();
      return this.cache.characters;
    }

    throw new Error("Could not load character data - charlist not found");
  },

  // Get masteries by category (optimized with lookup map)
  getMasteriesByCategory(category = null) {
    if (!this.cache.masteries) {
      throw new Error("Masteries not loaded. Call loadMasteries() first.");
    }

    if (!category) {
      return this.cache.masteries;
    }

    // Use optimized lookup map for O(1) access
    return this.lookupMaps.masteryByRole.get(category) || [];
  },

  // Get mastery by lookup ID (optimized with lookup map)
  getMasteryById(id) {
    if (!this.cache.masteries) {
      throw new Error("Masteries not loaded. Call loadMasteries() first.");
    }

    // Use optimized lookup map for O(1) access
    return this.lookupMaps.masteryLookup.get(id);
  },

  // Get actions by mastery (optimized with lookup map)
  getActionsByMastery(masteryId) {
    if (!this.cache.actions) {
      throw new Error("Actions not loaded. Call loadActions() first.");
    }

    // Use optimized lookup map for O(1) access
    const actions = this.lookupMaps.actionsByMastery.get(masteryId) || [];

    // Also include actions marked as 'all'
    const allActions = this.cache.actions.filter(
      (action) => action.masteries && action.masteries.includes("all"),
    );

    console.log(`🔍 getActionsByMastery(${masteryId}):`, {
      masterySpecific: actions.length,
      allActions: allActions.length,
      total: actions.length + allActions.length,
      mapSize: this.lookupMaps.actionsByMastery.size,
    });

    // If we have no mastery-specific actions, fall back to old method temporarily
    if (actions.length === 0 && this.lookupMaps.actionsByMastery.size === 0) {
      console.log("🚨 Fallback: Using original filter method for", masteryId);
      const fallbackActions = this.cache.actions.filter(
        (action) => action.masteries && action.masteries.includes(masteryId),
      );
      return [...fallbackActions, ...allActions];
    }

    return [...actions, ...allActions];
  },

  // Get action by lookup ID (optimized with lookup map)
  getActionById(id) {
    if (!this.cache.actions) {
      throw new Error("Actions not loaded. Call loadActions() first.");
    }

    // Use optimized lookup map for O(1) access
    return this.lookupMaps.actionLookup.get(id);
  },

  // Get available actions for selected masteries
  getAvailableActions(selectedMasteries) {
    if (!this.cache.actions) {
      throw new Error("Actions not loaded. Call loadActions() first.");
    }

    return this.cache.actions.filter((action) => {
      if (!action.masteries) return false;

      // Check if action is available for any of the selected masteries
      return action.masteries.some((mastery) =>
        selectedMasteries.includes(mastery),
      );
    });
  },

  // Filter actions by category (optimized with lookup map)
  getActionsByCategory(category) {
    if (!this.cache.actions) {
      throw new Error("Actions not loaded. Call loadActions() first.");
    }

    // Use optimized lookup map for O(1) access
    return this.lookupMaps.actionByCategory.get(category) || [];
  },

  // Get action pairs (optimized with lookup map)
  getActionPairs() {
    if (!this.cache.actions) {
      throw new Error("Actions not loaded. Call loadActions() first.");
    }

    // Convert Map to Object for backward compatibility
    const pairs = {};
    this.lookupMaps.actionPairs.forEach((actions, pairId) => {
      pairs[pairId] = actions;
    });

    return pairs;
  },

  // Load all data at once and build lookup maps
  loadAll() {
    try {
      const masteries = this.loadMasteries();
      const actions = this.loadActions();
      const characters = this.loadCharacters();

      // Lookup maps are built automatically in each load method

      return {
        masteries: masteries,
        actions: actions,
        characters: characters,
      };
    } catch (error) {
      // Silently handle data loading errors
      throw error;
    }
  },

  // Clear cache and lookup maps (useful for testing or updates)
  clearCache() {
    this.cache = {
      masteries: null,
      actions: null,
      characters: null,
    };

    // Clear lookup maps as well
    Object.values(this.lookupMaps).forEach((map) => map.clear());
  },

  // Check if data is loaded
  isDataLoaded() {
    return !!(
      this.cache.masteries &&
      this.cache.actions &&
      this.cache.characters
    );
  },

  // Get character by lookup ID (optimized with lookup map)
  getCharacterById(id) {
    if (!this.cache.characters) {
      throw new Error("Characters not loaded. Call loadCharacters() first.");
    }

    // Use optimized lookup map for O(1) access
    return this.lookupMaps.characterLookup.get(id);
  },

  // Get actions for multiple masteries (optimized)
  getActionsForMasteries(masteryIds) {
    if (!this.cache.actions) {
      throw new Error("Actions not loaded. Call loadActions() first.");
    }

    if (!Array.isArray(masteryIds) || masteryIds.length === 0) {
      return [];
    }

    // Use Set to avoid duplicates when combining multiple mastery action lists
    const actionSet = new Set();

    // Get actions for each mastery using optimized lookups
    masteryIds.forEach((masteryId) => {
      const actions = this.getActionsByMastery(masteryId);
      actions.forEach((action) => actionSet.add(action));
    });

    return Array.from(actionSet);
  },

  // Get all available roles/categories
  getAvailableRoles() {
    return Array.from(this.lookupMaps.masteryByRole.keys());
  },

  getAvailableActionCategories() {
    return Array.from(this.lookupMaps.actionByCategory.keys());
  },

  // Get lookup map statistics (useful for debugging)
  getLookupMapStats() {
    const stats = {
      masteries: this.lookupMaps.masteryLookup.size,
      actions: this.lookupMaps.actionLookup.size,
      roles: this.lookupMaps.masteryByRole.size,
      categories: this.lookupMaps.actionByCategory.size,
      masteryActions: this.lookupMaps.actionsByMastery.size,
      pairs: this.lookupMaps.actionPairs.size,
      characters: this.lookupMaps.characterLookup.size,
    };

    console.log("📊 DataLoader Lookup Map Stats:", stats);

    // Sample some mastery->action mappings
    console.log("📊 Sample actionsByMastery mappings:");
    let count = 0;
    for (const [
      masteryId,
      actions,
    ] of this.lookupMaps.actionsByMastery.entries()) {
      if (count < 5) {
        console.log(`  ${masteryId}: ${actions.length} actions`);
        count++;
      }
    }

    return stats;
  },

  // Debug method to dump lookup maps
  debugLookupMaps() {
    console.log("🔍 DataLoader Debug - Full Lookup Maps:");
    console.log("Cache status:", {
      masteries: this.cache.masteries ? this.cache.masteries.length : null,
      actions: this.cache.actions ? this.cache.actions.length : null,
      characters: this.cache.characters ? this.cache.characters.length : null,
    });

    this.getLookupMapStats();

    // Check a specific mastery
    const testMastery = "arcanamancy";
    const testActions = this.lookupMaps.actionsByMastery.get(testMastery);
    console.log(
      `🔍 Test: ${testMastery} has ${testActions ? testActions.length : 0} actions`,
    );

    return this.lookupMaps;
  },
};

// Make available globally
window.DataLoader = DataLoader;
