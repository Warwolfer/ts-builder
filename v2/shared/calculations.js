// V2 Character stat calculations for TerraSphere Build Editor

const CharacterCalculations = {
  // V2 Constants
  ARMOR_MULTIPLIERS: {
    light: 20,
    medium: 25,
    heavy: 30
  },
  
  RANK_BONUSES: {
    0: 0,   // E rank
    1: 10,  // D rank 
    2: 15,  // C rank
    3: 25,  // B rank
    4: 30,  // A rank
    5: 40   // S rank
  },
  
  getRankBonus(rank) {
    return this.RANK_BONUSES[parseInt(rank) || 0] || 0;
  },
  
  BASE_HP: 100,
  BASE_MOVEMENT: 2,
  SAVE_MULTIPLIER: 5,
  EXPERTISE_MULTIPLIER: 5,
  
  // Calculate total HP
  calculateHP(state, masteryList, actionList) {
    const { armorType, armorRank, chosenActions, chosenMasteriesRanks } = state;
    
    let totalHP = this.BASE_HP;
    
    // Armor bonus
    if (armorType && this.ARMOR_MULTIPLIERS[armorType]) {
      const armorMultiplier = this.ARMOR_MULTIPLIERS[armorType];
      totalHP += parseInt(armorRank) * armorMultiplier;
    }
    
    // Action bonuses from actions.js
    for (const actionName of chosenActions) {
      const action = actionList.find(a => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.hp) {
        if (action.bonuses.hp === "rank-based" && actionName === "defense") {
          // Defense passive uses alter mastery rank
          if (chosenMasteriesRanks.length > 0) {
            const alterRank = chosenMasteriesRanks[chosenMasteriesRanks.length - 1];
            totalHP += this.getRankBonus(alterRank);
          }
        } else if (action.bonuses.hp === "rank-based" && actionName === "sturdy") {
          // Sturdy passive: 25 base + 5 per MR (D:+30, C:+35, B:+40, A:+45, S:+50), max +50
          // Find the mastery used for this action and get its rank
          const sturdyMasteryRank = this.getHighestDefenseMasteryRank(state, actionList);
          const baseSturdy = 25;
          const sturdyBonus = Math.min(50, baseSturdy + (5 * sturdyMasteryRank));
          totalHP += sturdyBonus;
        } else if (typeof action.bonuses.hp === 'number') {
          totalHP += action.bonuses.hp;
        }
      }
    }
    
    return totalHP;
  },
  
  // Calculate save bonuses
  calculateSaves(state, masteryList) {
    const { chosenMasteries, chosenMasteriesRanks, accessoryType, accessoryRank } = state;
    const saves = { fortitude: 0, reflex: 0, will: 0 };
    
    // Mastery save bonuses only
    for (let i = 0; i < chosenMasteries.length; i++) {
      const mastery = masteryList.find(m => m.lookup === chosenMasteries[i]);
      if (mastery && mastery.save) {
        const bonus = this.getRankBonus(chosenMasteriesRanks[i]);
        saves[mastery.save] += bonus;
      }
    }
    
    // Accessory save bonuses (+10 per rank)
    if (accessoryType && accessoryRank !== undefined) {
      const accessoryBonus = (accessoryRank + 1) * 10; // E=10, D=20, C=30, B=40, A=50, S=60
      
      switch (accessoryType) {
        case 'combat':
          saves.fortitude += accessoryBonus;
          break;
        case 'utility':
          saves.reflex += accessoryBonus;
          break;
        case 'magic':
          saves.will += accessoryBonus;
          break;
      }
    }
    return saves;
  },

  
  // Calculate movement
  calculateMovement(state, chosenActions, actionList) {
    let movement = this.BASE_MOVEMENT;
    
    // Action bonuses from actions.js
    for (const actionName of chosenActions) {
      const action = actionList.find(a => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.movement) {
        if (action.bonuses.movement === "rank-based" && actionName === "speed") {
          // Speed passive effects - rank-based movement bonuses
          const speedRank = this.getAlterMasteryRank(state);
          if (speedRank >= 1) movement += 1;
          if (speedRank >= 3) movement += 1;
          if (speedRank >= 5) movement += 1;
        } else if (action.bonuses.movement === "rank-based" && actionName === "swift") {
          // Swift passive: +1 movement at D rank, +2 at S rank
          const swiftMasteryRank = this.getHighestOffenseMasteryRank(state, actionList);
          if (swiftMasteryRank >= 1) movement += 1; // D rank: +1 movement
          if (swiftMasteryRank >= 5) movement += 1; // S rank: +1 additional (total +2)
        } else if (typeof action.bonuses.movement === 'number') {
          movement += action.bonuses.movement;
        }
      }
    }
    
    return movement;
  },
  
  // Calculate range
  calculateRange(state, chosenActions, actionList) {
    let range = 1; // Default range is now 1
    
    // Action bonuses from actions.js
    for (const actionName of chosenActions) {
      const action = actionList.find(a => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.range) {
        if (typeof action.bonuses.range === 'number') {
          range += action.bonuses.range;
        }
      }
    }
    
    return range;
  },
  
  // Get alter mastery rank (last mastery if it exists)
  getAlterMasteryRank(state) {
    const { chosenMasteriesRanks } = state;
    if (chosenMasteriesRanks.length > 0) {
      return parseInt(chosenMasteriesRanks[chosenMasteriesRanks.length - 1]) || 0;
    }
    return 0;
  },
  
  // Get highest defense mastery rank for sturdy calculation
  getHighestDefenseMasteryRank(state, actionList) {
    const { chosenMasteries, chosenMasteriesRanks } = state;
    const sturdyAction = actionList.find(a => a.lookup === "sturdy");
    
    if (!sturdyAction || !sturdyAction.masteries) return 0;
    
    let highestRank = 0;
    for (let i = 0; i < chosenMasteries.length; i++) {
      const masteryId = chosenMasteries[i];
      if (sturdyAction.masteries.includes(masteryId)) {
        const rank = parseInt(chosenMasteriesRanks[i]) || 0;
        highestRank = Math.max(highestRank, rank);
      }
    }
    
    return highestRank;
  },
  
  // Get highest offense mastery rank for swift calculation
  getHighestOffenseMasteryRank(state, actionList) {
    const { chosenMasteries, chosenMasteriesRanks } = state;
    const swiftAction = actionList.find(a => a.lookup === "swift");
    
    if (!swiftAction || !swiftAction.masteries) return 0;
    
    let highestRank = 0;
    for (let i = 0; i < chosenMasteries.length; i++) {
      const masteryId = chosenMasteries[i];
      if (swiftAction.masteries.includes(masteryId)) {
        const rank = parseInt(chosenMasteriesRanks[i]) || 0;
        highestRank = Math.max(highestRank, rank);
      }
    }
    
    return highestRank;
  },
  
  // Calculate damage modifiers
  calculateDamageModifiers(state, chosenActions) {
    const modifiers = [];
    
    if (chosenActions.includes('damage')) {
      const alterRank = this.getAlterMasteryRank(state);
      modifiers.push(this.getRankBonus(alterRank));
    }
    
    return modifiers;
  },
  
  // Calculate support modifiers
  calculateSupportModifiers(state, chosenActions) {
    const modifiers = [];
    
    if (chosenActions.includes('support')) {
      const alterRank = this.getAlterMasteryRank(state);
      modifiers.push(this.getRankBonus(alterRank));
    }
    
    return modifiers;
  },
  
  // Get complete character stats
  getCompleteStats(state, masteryList, actionList, expertiseList) {
    const stats = {
      hp: this.calculateHP(state, masteryList, actionList),
      saves: this.calculateSaves(state, masteryList),
      movement: this.calculateMovement(state, state.chosenActions, actionList),
      range: this.calculateRange(state, state.chosenActions, actionList),
      damageModifiers: this.calculateDamageModifiers(state, state.chosenActions),
      supportModifiers: this.calculateSupportModifiers(state, state.chosenActions)
    };
    
    return stats;
  },
  
  // Validate mastery selection
  validateMasterySelection(masteries) {
    if (masteries.length > 6) {
      return { valid: false, error: 'You may only select 6 masteries at maximum.' };
    }
    
    // Additional compatibility checks can be added here if needed
    
    return { valid: true };
  },
  
  // V2 rank distribution validation: S×1, A×2, B×unlimited
  validateMasteryRanks(ranks) {
    if (!ranks || ranks.length === 0) return { valid: true };
    
    const rankCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    ranks.forEach(rank => {
      const r = parseInt(rank) || 0;
      if (rankCounts.hasOwnProperty(r)) rankCounts[r]++;
    });
    
    const maxCaps = { 5: 1, 4: 2, 3: 6, 2: 6, 1: 6, 0: 6 }; // B rank now unlimited (set to 6 = max slots)
    const rankNames = { 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D', 0: 'E' };
    
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count > maxCaps[rank]) {
        return { 
          valid: false, 
          error: `Too many ${rankNames[rank]} ranks: ${count}/${maxCaps[rank]} allowed. V2 caps: S×1, A×2, B×unlimited.`
        };
      }
    }
    
    return { valid: true };
  }
};

// Make available globally
window.CharacterCalculations = CharacterCalculations;