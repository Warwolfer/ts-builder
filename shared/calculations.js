// Character stat calculations for TerraSphere Build Editor

const CharacterCalculations = {
  // Constants
  ARMOR_MULTIPLIERS: {
    light: 20,
    medium: 25,
    heavy: 30,
  },

  RANK_BONUSES: {
    0: 0, // E rank
    1: 10, // D rank
    2: 15, // C rank
    3: 25, // B rank
    4: 30, // A rank
    5: 40, // S rank
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
      const action = actionList.find((a) => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.hp) {
        if (action.bonuses.hp === "rank-based" && actionName === "defense") {
          // Defense passive uses alter mastery rank
          if (chosenMasteriesRanks.length > 0) {
            const alterRank =
              chosenMasteriesRanks[chosenMasteriesRanks.length - 1];
            totalHP += this.getRankBonus(alterRank);
          }
        } else if (
          action.bonuses.hp === "rank-based" &&
          actionName === "sturdy"
        ) {
          // Sturdy passive: 25 base + 5 per MR (D:+30, C:+35, B:+40, A:+45, S:+50), max +50
          // Find the mastery used for this action and get its rank
          const sturdyMasteryRank = this.getHighestDefenseMasteryRank(
            state,
            actionList,
          );
          const baseSturdy = 25;
          const sturdyBonus = Math.min(50, baseSturdy + 5 * sturdyMasteryRank);
          totalHP += sturdyBonus;
        } else if (
          action.bonuses.hp === "rank-based" &&
          actionName === "focus-defense"
        ) {
          // Focus: Defense passive: +20 HP at D, +30 at B, +40 at S
          const alterRank = this.getAlterMasteryRank(state);
          if (alterRank >= 1) totalHP += 20; // D rank: +20
          if (alterRank >= 3) totalHP += 10; // B rank: +10 additional (total +30)
          if (alterRank >= 5) totalHP += 10; // S rank: +10 additional (total +40)
        } else if (typeof action.bonuses.hp === "number") {
          totalHP += action.bonuses.hp;
        }
      }
    }

    return totalHP;
  },

  // Calculate save bonuses
  calculateSaves(state, masteryList, actionList = []) {
    const {
      chosenMasteries,
      chosenMasteriesRanks,
      chosenActions = [],
      accessoryType,
      accessoryRank,
    } = state;
    const saves = { fortitude: 0, reflex: 0, will: 0 };

    // Mastery save bonuses only
    for (let i = 0; i < chosenMasteries.length; i++) {
      const mastery = masteryList.find((m) => m.lookup === chosenMasteries[i]);
      if (mastery && mastery.save) {
        const bonus = this.getRankBonus(chosenMasteriesRanks[i]);
        saves[mastery.save] += bonus;
      }
    }

    // Accessory save bonuses (+10 per rank)
    if (accessoryType && accessoryRank !== undefined) {
      const accessoryBonus = (accessoryRank + 1) * 10; // E=10, D=20, C=30, B=40, A=50, S=60

      switch (accessoryType) {
        case "combat":
          saves.fortitude += accessoryBonus;
          break;
        case "utility":
          saves.reflex += accessoryBonus;
          break;
        case "magic":
          saves.will += accessoryBonus;
          break;
      }
    }

    // Action bonuses for Focus: Defense and Focus: Movement
    if (chosenActions.includes("focus-defense")) {
      // Focus: Defense: +10 to all saves at D, +15 at B, +20 at S
      const alterRank = this.getAlterMasteryRank(state);
      let saveBonus = 0;
      if (alterRank >= 1) saveBonus = 10; // D rank: +10
      if (alterRank >= 3) saveBonus = 15; // B rank: +15
      if (alterRank >= 5) saveBonus = 20; // S rank: +20

      saves.fortitude += saveBonus;
      saves.reflex += saveBonus;
      saves.will += saveBonus;
    }

    if (chosenActions.includes("focus-movement")) {
      // Focus: Movement: +5 to all saves at D, +10 at B, +15 at S
      const alterRank = this.getAlterMasteryRank(state);
      let saveBonus = 0;
      if (alterRank >= 1) saveBonus = 5; // D rank: +5
      if (alterRank >= 3) saveBonus = 10; // B rank: +10
      if (alterRank >= 5) saveBonus = 15; // S rank: +15

      saves.fortitude += saveBonus;
      saves.reflex += saveBonus;
      saves.will += saveBonus;
    }

    return saves;
  },

  // Calculate movement
  calculateMovement(state, chosenActions, actionList) {
    let movement = this.BASE_MOVEMENT;

    // Action bonuses from actions.js
    for (const actionName of chosenActions) {
      const action = actionList.find((a) => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.movement) {
        if (
          action.bonuses.movement === "rank-based" &&
          actionName === "speed"
        ) {
          // Speed passive effects - rank-based movement bonuses
          const speedRank = this.getAlterMasteryRank(state);
          if (speedRank >= 1) movement += 1;
          if (speedRank >= 3) movement += 1;
          if (speedRank >= 5) movement += 1;
        } else if (
          action.bonuses.movement === "rank-based" &&
          actionName === "swift"
        ) {
          // Swift passive: +1 movement at D rank, +2 at S rank
          const swiftMasteryRank = this.getHighestOffenseMasteryRank(
            state,
            actionList,
          );
          if (swiftMasteryRank >= 1) movement += 1; // D rank: +1 movement
          if (swiftMasteryRank >= 5) movement += 1; // S rank: +1 additional (total +2)
        } else if (
          action.bonuses.movement === "rank-based" &&
          actionName === "acceleration"
        ) {
          // Acceleration passive: +2 movement at D rank, +3 at B rank, +4 at S rank
          const accelerationRank = this.getAlterMasteryRank(state);
          if (accelerationRank >= 1) movement += 2; // D rank: +2 movement
          if (accelerationRank >= 3) movement += 1; // B rank: +1 additional (total +3)
          if (accelerationRank >= 5) movement += 1; // S rank: +1 additional (total +4)
        } else if (
          action.bonuses.movement === "rank-based" &&
          actionName === "focus-movement"
        ) {
          // Focus: Movement passive: +1 movement at D rank, +2 at B rank
          const alterRank = this.getAlterMasteryRank(state);
          if (alterRank >= 1) movement += 1; // D rank: +1 movement
          if (alterRank >= 3) movement += 1; // B rank: +1 additional (total +2)
        } else if (typeof action.bonuses.movement === "number") {
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
      const action = actionList.find((a) => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.range) {
        if (typeof action.bonuses.range === "number") {
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
      return (
        parseInt(chosenMasteriesRanks[chosenMasteriesRanks.length - 1]) || 0
      );
    }
    return 0;
  },

  // Get highest defense mastery rank for sturdy calculation
  getHighestDefenseMasteryRank(state, actionList) {
    const { chosenMasteries, chosenMasteriesRanks } = state;
    const sturdyAction = actionList.find((a) => a.lookup === "sturdy");

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
    const swiftAction = actionList.find((a) => a.lookup === "swift");

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

    if (chosenActions.includes("damage")) {
      const alterRank = this.getAlterMasteryRank(state);
      modifiers.push(this.getRankBonus(alterRank));
    }

    return modifiers;
  },

  // Calculate support modifiers
  calculateSupportModifiers(state, chosenActions) {
    const modifiers = [];

    if (chosenActions.includes("support")) {
      const alterRank = this.getAlterMasteryRank(state);
      modifiers.push(this.getRankBonus(alterRank));
    }

    return modifiers;
  },

  // Get complete character stats
  getCompleteStats(state, masteryList, actionList, expertiseList) {
    const stats = {
      hp: this.calculateHP(state, masteryList, actionList),
      saves: this.calculateSaves(state, masteryList, actionList),
      movement: this.calculateMovement(state, state.chosenActions, actionList),
      range: this.calculateRange(state, state.chosenActions, actionList),
      damageModifiers: this.calculateDamageModifiers(
        state,
        state.chosenActions,
      ),
      supportModifiers: this.calculateSupportModifiers(
        state,
        state.chosenActions,
      ),
    };

    return stats;
  },

  // Validate mastery selection
  validateMasterySelection(masteries) {
    if (masteries.length > 6) {
      return {
        valid: false,
        error: "You may only select 6 masteries at maximum.",
      };
    }

    // Additional compatibility checks can be added here if needed

    return { valid: true };
  },

  // rank distribution validation: cumulative caps
  // - Max 1 slot at S or above (so 1×S max)
  // - Max 3 slots at A or above (so 1×S + 2×A max = 3 total)
  // - Unlimited slots at B or below
  validateMasteryRanks(ranks) {
    if (!ranks || ranks.length === 0) return { valid: true };

    const rankCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    ranks.forEach((rank) => {
      const r = parseInt(rank) || 0;
      if (rankCounts.hasOwnProperty(r)) rankCounts[r]++;
    });

    const rankNames = { 5: "S", 4: "A", 3: "B", 2: "C", 1: "D", 0: "E" };

    // Check cumulative caps
    const sRanks = rankCounts[5];
    const aOrAbove = rankCounts[5] + rankCounts[4];
    const bOrAbove = rankCounts[5] + rankCounts[4] + rankCounts[3];

    // Max 1 S rank
    if (sRanks > 1) {
      return {
        valid: false,
        message: `Too many S ranks: ${sRanks}/1 allowed. Only 1 slot can be S rank.`,
      };
    }

    // Max 3 ranks at A or above (S + A)
    if (aOrAbove > 3) {
      return {
        valid: false,
        message: `Too many A+ ranks: ${aOrAbove}/3 allowed. Max 3 slots can be A rank or higher (includes S ranks).`,
      };
    }

    // Max 6 ranks at B or above (unlimited, but checking max slots)
    if (bOrAbove > 6) {
      return {
        valid: false,
        message: `Too many ranks: ${bOrAbove}/6 allowed. Maximum 6 masteries/expertise.`,
      };
    }

    return { valid: true };
  },
};

// Make available globally
window.CharacterCalculations = CharacterCalculations;
