// Character stat calculations for TerraSphere Build Editor

const CharacterCalculations = {
  // Constants
  ARMOR_MULTIPLIERS: {
    light: 20,
    medium: 25,
    heavy: 30
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
          // Defense passive - 10 HP per alter mastery rank
          if (chosenMasteriesRanks.length > 0) {
            const alterRank = parseInt(chosenMasteriesRanks[chosenMasteriesRanks.length - 1]);
            totalHP += alterRank * 10;
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
    
    // Mastery bonuses
    for (let i = 0; i < chosenMasteries.length; i++) {
      const mastery = masteryList.find(m => m.lookup === chosenMasteries[i]);
      if (mastery && mastery.save) {
        const rank = parseInt(chosenMasteriesRanks[i]) || 0;
        saves[mastery.save] += rank;
      }
    }
    
    // Armor bonuses
    const armorRankValue = parseInt(armorRank) || 0;
    if (armorType === 'light') {
      saves.will += armorRankValue;
    } else if (armorType === 'heavy') {
      saves.fortitude += armorRankValue;
    } else if (armorType === 'medium') {
      saves.reflex += armorRankValue;
    }
    
    // Apply multiplier
    saves.fortitude *= this.SAVE_MULTIPLIER;
    saves.reflex *= this.SAVE_MULTIPLIER;
    saves.will *= this.SAVE_MULTIPLIER;
    
    return saves;
  },
  
  // Calculate expertise bonuses
  calculateExpertise(state, masteryList) {
    const { chosenMasteries, chosenMasteriesRanks } = state;
    const expertise = { fitness: 0, awareness: 0, knack: 0, knowledge: 0, presence: 0 };
    
    // Mastery bonuses
    for (let i = 0; i < chosenMasteries.length; i++) {
      const mastery = masteryList.find(m => m.lookup === chosenMasteries[i]);
      if (mastery && mastery.expertise) {
        const rank = parseInt(chosenMasteriesRanks[i]) || 0;
        expertise[mastery.expertise] += rank;
      }
    }
    
    // Apply multiplier
    expertise.fitness *= this.EXPERTISE_MULTIPLIER;
    expertise.awareness *= this.EXPERTISE_MULTIPLIER;
    expertise.knack *= this.EXPERTISE_MULTIPLIER;
    expertise.knowledge *= this.EXPERTISE_MULTIPLIER;
    expertise.presence *= this.EXPERTISE_MULTIPLIER;
    
    return expertise;
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
    
    // Damage passive (alter mastery)
    if (chosenActions.includes('damage')) {
      const alterRank = this.getAlterMasteryRank(state);
      modifiers.push(alterRank * 5);
    }
    
    return modifiers;
  },
  
  // Calculate support modifiers
  calculateSupportModifiers(state, chosenActions) {
    const modifiers = [];
    
    // Support passive (alter mastery)
    if (chosenActions.includes('support')) {
      const alterRank = this.getAlterMasteryRank(state);
      modifiers.push(alterRank * 5);
    }
    
    return modifiers;
  },
  
  // Get complete character stats
  getCompleteStats(state, masteryList, actionList) {
    const stats = {
      hp: this.calculateHP(state, masteryList, actionList),
      saves: this.calculateSaves(state, masteryList),
      expertise: this.calculateExpertise(state, masteryList),
      movement: this.calculateMovement(state, state.chosenActions, actionList),
      range: this.calculateRange(state, state.chosenActions, actionList),
      damageModifiers: this.calculateDamageModifiers(state, state.chosenActions),
      supportModifiers: this.calculateSupportModifiers(state, state.chosenActions)
    };
    
    return stats;
  },
  
  // Validate mastery selection
  validateMasterySelection(masteries) {
    if (masteries.length > 5) {
      return { valid: false, error: 'You may only select 5 masteries at maximum.' };
    }
    
    // Check weapon-arts compatibility
    // if (masteries.includes('weapon-arts')) {
    //   const incompatible = ['beast-arts', 'shadow-arts', 'alchemy', 'magitech'];
    //   const hasIncompatible = masteries.some(m => incompatible.includes(m));
    //   if (hasIncompatible) {
    //     return {
    //       valid: false,
    //       error: 'Weapon Arts is not compatible with Beast Arts, Shadow Arts, Alchemy, and Magitech.'
    //     };
    //   }
    // }
    //
    // // Check evoke compatibility
    // if (masteries.includes('evoke')) {
    //   const magicMasteries = [
    //     'arcanamancy', 'astramancy', 'geomancy', 'hemomancy', 'hydromancy',
    //     'illusion-magic', 'aeromancy', 'dark-magic', 'pyromancy', 'animancy',
    //     'chronomancy', 'divine-magic', 'harmonic-magic', 'nature-magic', 'spirit-magic'
    //   ];
    //   const hasMagic = masteries.some(m => magicMasteries.includes(m));
    //   if (!hasMagic) {
    //     return {
    //       valid: false,
    //       error: 'Evoke requires at least one magic mastery to be selected.'
    //     };
    //   }
    // }
    
    return { valid: true };
  }
};

// Make available globally
window.CharacterCalculations = CharacterCalculations;