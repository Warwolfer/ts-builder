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
        } else if (typeof action.bonuses.hp === 'number') {
          totalHP += action.bonuses.hp;
        }
      }
    }
    
    return totalHP;
  },
  
  // Calculate save bonuses
  calculateSaves(state, masteryList) {
    const { chosenMasteries, chosenMasteriesRanks, armorType, armorRank } = state;
    const saves = { fortitude: 0, reflex: 0, will: 0 };
    
    // Mastery save bonuses
    for (let i = 0; i < chosenMasteries.length; i++) {
      const mastery = masteryList.find(m => m.lookup === chosenMasteries[i]);
      if (mastery && mastery.save) {
        const bonus = this.getRankBonus(chosenMasteriesRanks[i]);
        saves[mastery.save] += bonus;
      }
    }
    
    // Armor save bonuses
    const armorBonus = this.getRankBonus(armorRank);
    if (armorType === 'light') {
      saves.will += armorBonus;
    } else if (armorType === 'heavy') {
      saves.fortitude += armorBonus;
    } else if (armorType === 'medium') {
      saves.reflex += armorBonus;
    }
    
    // Apply multiplier
    saves.fortitude *= this.SAVE_MULTIPLIER;
    saves.reflex *= this.SAVE_MULTIPLIER;
    saves.will *= this.SAVE_MULTIPLIER;
    
    return saves;
  },
  
  // V2 system doesn't have expertise bonuses
  
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
  
  // V2 rank distribution validation: S×1, A×2, B×3
  validateMasteryRanks(ranks) {
    if (!ranks || ranks.length === 0) return { valid: true };
    
    const rankCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    ranks.forEach(rank => {
      const r = parseInt(rank) || 0;
      if (rankCounts.hasOwnProperty(r)) rankCounts[r]++;
    });
    
    const maxCaps = { 5: 1, 4: 2, 3: 3, 2: 6, 1: 6, 0: 6 };
    const rankNames = { 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D', 0: 'E' };
    
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count > maxCaps[rank]) {
        return { 
          valid: false, 
          error: `Too many ${rankNames[rank]} ranks: ${count}/${maxCaps[rank]} allowed. V2 caps: S×1, A×2, B×3.`
        };
      }
    }
    
    return { valid: true };
  }
};

// Make available globally
window.CharacterCalculations = CharacterCalculations;