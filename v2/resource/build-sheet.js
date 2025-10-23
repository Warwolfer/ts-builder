// Initialize global objects
window.buildState = window.buildState || new BuildState();
window.DataLoader = window.DataLoader || new DataLoader();
window.DOMUtils = window.DOMUtils || new DOMUtils();

// Build Sheet Display Logic for V2
class BuildSheetV2 {
  constructor() {
    this.state = window.buildState;
    this.dataLoader = window.DataLoader;
    this.domUtils = window.DOMUtils;
    this.calculations = window.CharacterCalculations;
    this.buildEncoder = window.BuildEncoder;

    this.armorImages = {
      heavy: "https://terrarp.com/db/tool/armor-heavy.png",
      medium: "https://terrarp.com/db/tool/armor-medium.png",
      light: "https://terrarp.com/db/tool/armor-light.png",
    };

    // Using armor images as placeholders for accessories
    this.accessoryImages = {
      combat: "https://terrarp.com/db/tool/armor-heavy.png",
      utility: "https://terrarp.com/db/tool/armor-medium.png",
      magic: "https://terrarp.com/db/tool/armor-light.png",
    };

    this.rankLabels = ["E", "D", "C", "B", "A", "S"];

    // Helper method to safely get rank label
    this.getRankLabel = (rank) => {
      if (rank < 0 || rank >= this.rankLabels.length) {
        return "E";
      }
      return this.rankLabels[rank];
    };

    this.init();
  }

  getRankColorClass(rank) {
    // Handle undefined or invalid rank values
    if (!rank || typeof rank !== "string") {
      return "rank-e"; // Default to gray
    }

    switch (rank.toUpperCase()) {
      case "S":
        return "rank-s"; // Gold
      case "A":
        return "rank-a"; // Orange
      case "B":
        return "rank-b"; // Pink
      case "C":
        return "rank-c"; // Green
      case "D":
        return "rank-d"; // Blue
      case "E":
        return "rank-e"; // Grey
      default:
        return "rank-e"; // Default to gray
    }
  }

  init() {
    try {
      // Load V2 data
      this.loadMasteriesV2();
      this.loadExpertiseV2();
      this.loadActionsV2();

      // Show the build display (it's hidden by default in app.css)
      const buildDisplay = this.domUtils.getElementById("builddisplay");
      if (buildDisplay) {
        buildDisplay.style.display = "block";
      }

      // Load state from URL if present
      this.state.loadFromURL();

      // Check for build code in URL hash
      this.loadFromBuildCode();

      // Check if we have a complete build
      if (!this.state.isValidForBuildSheet()) {
        alert("Please complete all previous steps first.");
        window.location.href = this.state.generateURL("mastery-selector.html");
        return;
      }

      // Calculate and display everything
      this.displayBuild();

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("BuildSheet V2: Initialization failed:", error);
      this.showError("Failed to load build data: " + error.message);
    }
  }

  loadMasteriesV2() {
    if (window.masteriesV2) {
      this.dataLoader.cache.masteries = window.masteriesV2;
    } else {
      throw new Error("masteriesV2 not found");
    }
  }

  loadExpertiseV2() {
    if (window.expertiseV2) {
      this.dataLoader.cache.expertise = window.expertiseV2;
    } else {
      throw new Error("expertiseV2 not found");
    }
  }

  loadActionsV2() {
    if (window.actionlistV2) {
      this.dataLoader.cache.actions = window.actionlistV2;
    } else {
      throw new Error("actionlistV2 not found");
    }
  }

  displayBuild() {
    const currentState = this.state.getState();
    const masteries = this.dataLoader.cache.masteries;
    const expertise = this.dataLoader.cache.expertise;
    const actions = this.dataLoader.cache.actions;

    // Display character name and banner
    this.displayCharacterName(currentState.characterName);
    this.displayCharacterTitle(currentState.characterTitle);
    this.displayBanner(currentState);
    this.displayCharacterRace(currentState.characterRace);
    this.displayAvatar(currentState.avatarUrl);

    // Display note
    this.displayNote(currentState.note);

    // Display masteries (6 instead of 5)
    this.displayMasteries(currentState, masteries);

    // Display expertise
    this.displayExpertise(currentState, expertise);

    // Calculate and display stats
    const stats = this.calculations.getCompleteStats(
      currentState,
      masteries,
      actions,
      expertise,
    );
    this.displayStats(stats);

    // Display equipment
    this.displayEquipment(currentState);

    // Display actions
    this.displayActions(currentState, actions);

    // Generate build codes
    this.generateBuildCodes(currentState);

    // Replace character name in all roll codes
    this.replaceCharacterName(currentState.characterName);

    // Replace weapon rank (WR) in all roll codes
    this.replaceWeaponRank(currentState.weaponRank);

    // Replace break types in all roll codes
    this.replaceBreakTypes(currentState);

    // Set up thread code functionality
    this.setupThreadCode();
    this.restoreThreadCode();

    // Hide navigation for imported characters
    this.adjustNavigationForImportedCharacter();
  }

  displayCharacterName(name) {
    const displayName = name || "Character Build V2";
    this.domUtils.setText(
      this.domUtils.getElementById("character-name-display"),
      displayName,
    );
  }

  displayCharacterRace(race) {
    const displayRace = race || "";
    this.domUtils.setText(
      this.domUtils.getElementById("character-race-display"),
      displayRace,
    );
  }

  displayCharacterTitle(title) {
    const displayTitle = title || "";
    this.domUtils.setText(
      this.domUtils.getElementById("character-title-display"),
      displayTitle,
    );
  }

  displayNote(note) {
    const noteTextarea = this.domUtils.getElementById("note");
    if (noteTextarea) {
      noteTextarea.value = note || "";
    }
  }

  displayAvatar(avatarUrl) {
    const avatarImg = this.domUtils.getElementById("pfp2");
    if (avatarImg && avatarUrl) {
      avatarImg.src = avatarUrl;
      avatarImg.style.display = "block";
    } else if (avatarImg) {
      avatarImg.style.display = "none";
    }
  }

  displayBanner(state) {
    const bannerContainer = this.domUtils.getElementsByClassName("banner")[0];
    if (!bannerContainer) return;

    // Handle NG+ display - only show when ng value is 1
    const ngElement = this.domUtils.getElementsByClassName("newgameplus")[0];
    if (ngElement) {
      if (state.ng === 1) {
        ngElement.style.display = "block";
      } else {
        ngElement.style.display = "none";
      }
    }

    if (state.profileBannerUrl) {
      // Show character banner if available - add background image but preserve existing content
      bannerContainer.style.display = "flex";
      bannerContainer.style.position = "relative";

      // Create or update pseudo-element for blurred background
      const style =
        document.getElementById("banner-blur-style") ||
        document.createElement("style");
      style.id = "banner-blur-style";
      style.textContent = `
        .banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url(${state.profileBannerUrl});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 10;
        }
      `;
      if (!document.getElementById("banner-blur-style")) {
        document.head.appendChild(style);
      }
    } else {
      // Remove banner background if no image
      const style = document.getElementById("banner-blur-style");
      if (style) {
        style.remove();
      }
    }
  }

  displayMasteries(state, masteries) {
    const container = this.domUtils.getElementById("masterydisplay");
    let html = "";

    // Display up to 6 masteries
    state.chosenMasteries.forEach((masteryId, index) => {
      const mastery = masteries.find((m) => m.lookup === masteryId);
      const rank = state.chosenMasteriesRanks[index] || 0;

      if (mastery) {
        html += `
          <div class="mastery-rank-display">
            <span class="mastery-with-icon">
              <img src="${mastery.image}" class="mastery-icon"> ${mastery.alt || mastery.name}
            </span>&nbsp;
            <span class="rank-badge ${this.getRankColorClass(this.getRankLabel(rank))}"> ${this.getRankLabel(rank)}</span>
          </div>
        `;
      }
    });

    this.domUtils.setHTML(container, html);
  }

  displayExpertise(state, expertise) {
    const container = this.domUtils.getElementById("expertisedisplay");
    let html = "";

    // Display expertise with same layout as masteries
    state.chosenExpertise.forEach((expertiseId, index) => {
      const expertiseData = expertise.find((e) => e.lookup === expertiseId);
      const rank = state.chosenExpertiseRanks[index] || 0;

      if (expertiseData) {
        html += `
          <div class="expertise-rank-display">
            <span class="mastery-with-icon">
              <img src="${expertiseData.image}" class="mastery-icon"> ${expertiseData.alt || expertiseData.name}
            </span>&nbsp;<span class="rank-badge ${this.getRankColorClass(this.getRankLabel(rank))}">${this.getRankLabel(rank)}</span>
          </div>
        `;
      }
    });

    this.domUtils.setHTML(container, html);
  }

  displayStats(stats) {
    // Calculate stat breakdowns for tooltips
    const statBreakdowns = this.calculateStatBreakdowns(stats);

    // HP
    this.domUtils.setHTML(
      this.domUtils.querySelector(".hpdisplay"),
      `<div class="stats-display" title="${statBreakdowns.hp}"><span class="mastery-with-icon"><img src="https://terrarp.com/db/tool/health.png" class="mastery-icon"></span><span class="rank-badge stat-value">${stats.hp}</span></div>`,
    );

    // Movement
    this.domUtils.setHTML(
      this.domUtils.querySelector(".movementdisplay"),
      `<div class="stats-display" title="${statBreakdowns.movement}"><span class="mastery-with-icon"><img src="https://terrarp.com/db/tool/movement.png" class="mastery-icon"></span><span class="rank-badge stat-value">${stats.movement}</span></div>`,
    );

    // Range (if > 0)
    if (stats.range > 0) {
      this.domUtils.setHTML(
        this.domUtils.querySelector(".rangedisplay"),
        `<div class="stats-display" title="${statBreakdowns.range}"><span class="mastery-with-icon"><img src="https://terrarp.com/db/tool/range.png" class="mastery-icon"></span><span class="rank-badge stat-value">${stats.range}</span></div>`,
      );
      this.domUtils.show(this.domUtils.querySelector(".rangedisplay"));
    } else {
      this.domUtils.hide(this.domUtils.querySelector(".rangedisplay"));
    }

    // Saves - display like equipment
    this.displaySaves(stats.saves);

    // V2 has no expertise bonuses to display

    // Calculate and display total score
    this.calculateAndDisplayTotalScore();
  }

  displaySaves(saves) {
    // Calculate save breakdowns for tooltips
    const saveBreakdowns = this.calculateSaveBreakdowns();

    // Display saves like equipment items with hover tooltips
    this.domUtils.setHTML(
      this.domUtils.querySelector(".fortitudesavedisplay"),
      `<div class="saves-rank-display" title="${saveBreakdowns.fortitude}"><span class="mastery-with-icon"><img src="https://terrarp.com/db/tool/fortitude.png" class="mastery-icon"> Fortitude</span><span class="rank-badge save-bonus">${saves.fortitude}</span></div>`,
    );

    this.domUtils.setHTML(
      this.domUtils.querySelector(".reflexsavedisplay"),
      `<div class="saves-rank-display" title="${saveBreakdowns.reflex}"><span class="mastery-with-icon"><img src="https://terrarp.com/db/tool/reflex.png" class="mastery-icon"> Reflex</span><span class="rank-badge save-bonus">${saves.reflex}</span></div>`,
    );

    this.domUtils.setHTML(
      this.domUtils.querySelector(".willsavedisplay"),
      `<div class="saves-rank-display" title="${saveBreakdowns.will}"><span class="mastery-with-icon"><img src="https://terrarp.com/db/tool/will.png" class="mastery-icon"> Will</span><span class="rank-badge save-bonus">${saves.will}</span></div>`,
    );
  }

  calculateSaveBreakdowns() {
    const currentState = this.state.getState();
    const masteries = this.dataLoader.cache.masteries;
    const {
      chosenMasteries,
      chosenMasteriesRanks,
      accessoryType,
      accessoryRank,
    } = currentState;

    // Initialize breakdown objects
    const breakdowns = {
      fortitude: [],
      reflex: [],
      will: [],
    };

    // Calculate mastery contributions
    for (let i = 0; i < chosenMasteries.length; i++) {
      const mastery = masteries.find((m) => m.lookup === chosenMasteries[i]);
      if (mastery && mastery.save) {
        const bonus = this.calculations.getRankBonus(chosenMasteriesRanks[i]);
        if (bonus > 0) {
          const masteryName = mastery.alt || mastery.name;
          breakdowns[mastery.save].push(`${masteryName}: ${bonus}`);
        }
      }
    }

    // Calculate accessory contributions
    if (accessoryType && accessoryRank !== undefined) {
      const accessoryBonus = (accessoryRank + 1) * 10; // E=10, D=20, C=30, B=40, A=50, S=60
      const accessoryName =
        accessoryType.charAt(0).toUpperCase() +
        accessoryType.slice(1) +
        " Accessory";

      switch (accessoryType) {
        case "combat":
          if (accessoryBonus > 0) {
            breakdowns.fortitude.push(`${accessoryName}: ${accessoryBonus}`);
          }
          break;
        case "utility":
          if (accessoryBonus > 0) {
            breakdowns.reflex.push(`${accessoryName}: ${accessoryBonus}`);
          }
          break;
        case "magic":
          if (accessoryBonus > 0) {
            breakdowns.will.push(`${accessoryName}: ${accessoryBonus}`);
          }
          break;
      }
    }

    // Format the breakdowns as tooltip strings
    const formatBreakdown = (saveType, contributions) => {
      if (contributions.length === 0) {
        return `${saveType.charAt(0).toUpperCase() + saveType.slice(1)}: 0 (No bonuses)`;
      }
      return `${saveType.charAt(0).toUpperCase() + saveType.slice(1)}: ${contributions.join(" + ")}`;
    };

    return {
      fortitude: formatBreakdown("fortitude", breakdowns.fortitude),
      reflex: formatBreakdown("reflex", breakdowns.reflex),
      will: formatBreakdown("will", breakdowns.will),
    };
  }

  calculateStatBreakdowns(stats) {
    const currentState = this.state.getState();
    const actions = this.dataLoader.cache.actions;
    const { armorType, armorRank, chosenActions, chosenMasteriesRanks } =
      currentState;

    // Health breakdown
    const hpBreakdown = [];
    hpBreakdown.push(`Base: ${this.calculations.BASE_HP}`);

    // Armor bonus
    if (armorType && this.calculations.ARMOR_MULTIPLIERS[armorType]) {
      const armorMultiplier = this.calculations.ARMOR_MULTIPLIERS[armorType];
      const armorBonus = parseInt(armorRank) * armorMultiplier;
      if (armorBonus > 0) {
        const armorTypeName =
          armorType.charAt(0).toUpperCase() + armorType.slice(1);
        const rankLabels = ["E", "D", "C", "B", "A", "S"];
        const rankLabel = rankLabels[armorRank] || "E";
        hpBreakdown.push(
          `${armorTypeName} Armor (${rankLabel}): ${armorBonus}`,
        );
      }
    }

    // Action bonuses
    for (const actionName of chosenActions) {
      const action = actions.find((a) => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.hp) {
        if (action.bonuses.hp === "rank-based" && actionName === "defense") {
          if (chosenMasteriesRanks.length > 0) {
            const alterRank =
              chosenMasteriesRanks[chosenMasteriesRanks.length - 1];
            const bonus = this.calculations.getRankBonus(alterRank);
            if (bonus > 0) {
              hpBreakdown.push(`Defense (Alter): ${bonus}`);
            }
          }
        } else if (
          action.bonuses.hp === "rank-based" &&
          actionName === "sturdy"
        ) {
          const sturdyMasteryRank =
            this.calculations.getHighestDefenseMasteryRank(
              currentState,
              actions,
            );
          const baseSturdy = 25;
          const sturdyBonus = Math.min(50, baseSturdy + 5 * sturdyMasteryRank);
          hpBreakdown.push(`Sturdy: ${sturdyBonus}`);
        } else if (typeof action.bonuses.hp === "number") {
          hpBreakdown.push(`${action.name}: ${action.bonuses.hp}`);
        }
      }
    }

    // Movement breakdown
    const movementBreakdown = [];
    movementBreakdown.push(`Base: ${this.calculations.BASE_MOVEMENT}`);

    for (const actionName of chosenActions) {
      const action = actions.find((a) => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.movement) {
        if (
          action.bonuses.movement === "rank-based" &&
          actionName === "speed"
        ) {
          const speedRank = this.calculations.getAlterMasteryRank(currentState);
          let speedBonus = 0;
          if (speedRank >= 1) speedBonus += 1;
          if (speedRank >= 3) speedBonus += 1;
          if (speedRank >= 5) speedBonus += 1;
          if (speedBonus > 0) {
            movementBreakdown.push(`Speed (Alter): ${speedBonus}`);
          }
        } else if (
          action.bonuses.movement === "rank-based" &&
          actionName === "swift"
        ) {
          const swiftMasteryRank =
            this.calculations.getHighestOffenseMasteryRank(
              currentState,
              actions,
            );
          let swiftBonus = 0;
          if (swiftMasteryRank >= 1) swiftBonus += 1;
          if (swiftMasteryRank >= 5) swiftBonus += 1;
          if (swiftBonus > 0) {
            movementBreakdown.push(`Swift: ${swiftBonus}`);
          }
        } else if (
          action.bonuses.movement === "rank-based" &&
          actionName === "acceleration"
        ) {
          const accelerationRank = this.calculations.getAlterMasteryRank(currentState);
          let accelerationBonus = 0;
          if (accelerationRank >= 1) accelerationBonus += 2;
          if (accelerationRank >= 3) accelerationBonus += 1;
          if (accelerationRank >= 5) accelerationBonus += 1;
          if (accelerationBonus > 0) {
            movementBreakdown.push(`Acceleration (Alter): ${accelerationBonus}`);
          }
        } else if (typeof action.bonuses.movement === "number") {
          movementBreakdown.push(`${action.name}: ${action.bonuses.movement}`);
        }
      }
    }

    // Range breakdown
    const rangeBreakdown = [];
    rangeBreakdown.push(`Base: 1`);

    for (const actionName of chosenActions) {
      const action = actions.find((a) => a.lookup === actionName);
      if (action && action.bonuses && action.bonuses.range) {
        if (typeof action.bonuses.range === "number") {
          rangeBreakdown.push(`${action.name}: ${action.bonuses.range}`);
        }
      }
    }

    return {
      hp: `Health: ${hpBreakdown.join(" + ")}`,
      movement: `Movement: ${movementBreakdown.join(" + ")}`,
      range: `Range: ${rangeBreakdown.join(" + ")}`,
    };
  }

  calculateAndDisplayTotalScore() {
    const currentState = this.state.getState();

    // Use actual game bonuses from calculations system
    const getRankValue = (rank) => {
      let numericRank;
      if (typeof rank === "string") {
        const rankMap = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };
        numericRank = rankMap[rank] || 0;
      } else {
        numericRank = Math.max(0, Math.min(5, rank)); // Ensure rank is between 0-5
      }

      // Use the actual game bonuses from calculations.js
      const RANK_BONUSES = {
        0: 0, // E rank
        1: 10, // D rank
        2: 15, // C rank
        3: 25, // B rank
        4: 30, // A rank
        5: 40, // S rank
      };

      return RANK_BONUSES[numericRank] || 0;
    };

    let totalScore = 0;
    let breakdown = [];

    // Equipment scores
    const weaponScore = getRankValue(currentState.weaponRank);
    const armorScore = getRankValue(currentState.armorRank);
    const accessoryScore = getRankValue(currentState.accessoryRank);

    totalScore += weaponScore + armorScore + accessoryScore;
    breakdown.push(
      `Weapon: ${this.getRankLabel(currentState.weaponRank)} (${weaponScore})`,
    );
    breakdown.push(
      `Armor: ${this.getRankLabel(currentState.armorRank)} (${armorScore})`,
    );
    breakdown.push(
      `Accessory: ${this.getRankLabel(currentState.accessoryRank)} (${accessoryScore})`,
    );

    // Mastery scores - check multiple possible field names
    let masteryTotal = 0;
    const masteryRanks =
      currentState.masteryRanks || currentState.chosenMasteriesRanks || {};
    const masteryNames =
      currentState.masteryNames || currentState.chosenMasteries || [];

    // Handle different data structures
    if (Array.isArray(masteryRanks) && Array.isArray(masteryNames)) {
      // Arrays - match by index
      masteryNames.forEach((masteryName, index) => {
        const rank = masteryRanks[index];
        if (rank !== undefined) {
          const rankValue = getRankValue(rank);
          masteryTotal += rankValue;
          breakdown.push(
            `${masteryName}: ${this.getRankLabel(rank)} (${rankValue})`,
          );
        }
      });
    } else if (typeof masteryRanks === "object") {
      // Object - use as key-value pairs
      Object.entries(masteryRanks).forEach(([masteryId, rank]) => {
        const rankValue = getRankValue(rank);
        masteryTotal += rankValue;
        breakdown.push(
          `${masteryId}: ${this.getRankLabel(rank)} (${rankValue})`,
        );
      });
    }

    totalScore += masteryTotal;

    // Expertise scores (V2 feature)
    let expertiseTotal = 0;
    const expertiseRanks =
      currentState.expertiseRanks || currentState.chosenExpertiseRanks || {};
    const expertiseNames =
      currentState.expertiseNames || currentState.chosenExpertise || [];

    // Handle different data structures for expertise (expertise worth 1/4 of masteries)
    if (Array.isArray(expertiseRanks) && Array.isArray(expertiseNames)) {
      // Arrays - match by index
      expertiseNames.forEach((expertiseName, index) => {
        const rank = expertiseRanks[index];
        if (rank !== undefined) {
          const fullRankValue = getRankValue(rank);
          const expertiseValue = Math.round(fullRankValue / 4); // Expertise worth 1/4
          expertiseTotal += expertiseValue;
          breakdown.push(
            `${expertiseName}: ${this.getRankLabel(rank)} (${expertiseValue})`,
          );
        }
      });
    } else if (typeof expertiseRanks === "object") {
      // Object - use as key-value pairs
      Object.entries(expertiseRanks).forEach(([expertiseId, rank]) => {
        const fullRankValue = getRankValue(rank);
        const expertiseValue = Math.round(fullRankValue / 4); // Expertise worth 1/4
        expertiseTotal += expertiseValue;
        breakdown.push(
          `${expertiseId}: ${this.getRankLabel(rank)} (${expertiseValue})`,
        );
      });
    }

    totalScore += expertiseTotal;

    // Console log the scoring breakdown
    console.group("🎯 Build Scoring System");
    console.log(`Total Score: ${totalScore}`);
    console.log("");
    console.log("Equipment Breakdown:");
    console.log(
      `  Weapon: ${this.getRankLabel(currentState.weaponRank)} (${weaponScore} points)`,
    );
    console.log(
      `  Armor: ${this.getRankLabel(currentState.armorRank)} (${armorScore} points)`,
    );
    console.log(
      `  Accessory: ${this.getRankLabel(currentState.accessoryRank)} (${accessoryScore} points)`,
    );
    console.log(
      `  Equipment Subtotal: ${weaponScore + armorScore + accessoryScore}`,
    );
    console.log("");

    if (Object.keys(masteryRanks).length > 0) {
      console.log("Mastery Breakdown:");
      Object.entries(masteryRanks).forEach(([masteryId, rank]) => {
        const rankValue = getRankValue(rank);
        console.log(
          `  ${masteryId}: ${this.getRankLabel(rank)} (${rankValue} points)`,
        );
      });
      console.log(`  Mastery Subtotal: ${masteryTotal}`);
      console.log("");
    }

    if (Object.keys(expertiseRanks).length > 0) {
      console.log("Expertise Breakdown:");
      Object.entries(expertiseRanks).forEach(([expertiseId, rank]) => {
        const rankValue = getRankValue(rank);
        console.log(
          `  ${expertiseId}: ${this.getRankLabel(rank)} (${rankValue} points)`,
        );
      });
      console.log(`  Expertise Subtotal: ${expertiseTotal}`);
      console.log("");
    }

    // Calculate build rank based on total score (0-339 scale with SAABBB limits)
    const getBuildRank = (score) => {
      const ranks = [
        { grade: "E", min: 0, max: 30 },
        { grade: "E+", min: 31, max: 61 },
        { grade: "D", min: 62, max: 92 },
        { grade: "D+", min: 93, max: 123 },
        { grade: "C", min: 124, max: 154 },
        { grade: "C+", min: 155, max: 185 },
        { grade: "B", min: 186, max: 216 },
        { grade: "B+", min: 217, max: 247 },
        { grade: "A", min: 248, max: 278 },
        { grade: "A+", min: 279, max: 309 },
        { grade: "S", min: 310, max: 338 },
        { grade: "S+", min: 339, max: 339 },
      ];

      const rank = ranks.find((r) => score >= r.min && score <= r.max);
      return rank ? rank.grade : "E";
    };

    const buildRank = getBuildRank(totalScore);

    // Update the avatar rank badge
    this.updateRankBadge(buildRank);

    console.log(`🏆 TOTAL BUILD SCORE: ${totalScore} points`);
    console.log(`📊 BUILD RANK: ${buildRank}`);
    console.log("");
    console.log(
      "Rank Scale: E (0-30), E+ (31-61), D (62-92), D+ (93-123), C (124-154), C+ (155-185)",
    );
    console.log(
      "           B (186-216), B+ (217-247), A (248-278), A+ (279-309), S (310-338), S+ (339)",
    );
    console.log("");
    console.log("Scoring: E=0, D=10, C=15, B=25, A=30, S=40 points per rank");
    console.log(
      "         Expertise worth 1/4 value (E=0, D=2.5, C=3.75, B=6.25, A=7.5, S=10)",
    );
    console.groupEnd();

    return { totalScore, buildRank };
  }

  updateDowncastIndicators(cardElement, clickedMasteryId, clickedMastery) {
    // Get the action ID from the card
    const actionId = cardElement.id.replace("final", "");
    const actions = this.dataLoader.cache.actions;
    const action = actions.find((a) => a.lookup === actionId);

    if (!action) return;

    // Evolve action should never show downcast indicators
    if (action.lookup === "evolve") return;

    // Check if the clicked mastery would cause downcast for this action
    const isDowncast = this.isActionDowncast(action, clickedMastery);

    // Find or create the action downcast indicator
    let indicator = cardElement.querySelector(".action-downcast-indicator");

    if (isDowncast) {
      // Get the current state to find the mastery rank
      const currentState = this.state.getState();
      const masteryIndex =
        currentState.chosenMasteries.indexOf(clickedMasteryId);

      if (masteryIndex !== -1) {
        const currentRank = currentState.chosenMasteriesRanks[masteryIndex];
        const downcastRank = Math.max(0, currentRank - 1); // Downcast by 1 rank
        const rankLabels = ["E", "D", "C", "B", "A", "S"];
        const currentRankLabel = rankLabels[currentRank];
        const downcastRankLabel = rankLabels[downcastRank];

        // Show indicator if it doesn't exist
        if (!indicator) {
          indicator = document.createElement("div");
          indicator.className = "action-downcast-indicator";
          indicator.textContent = "⬇";
          cardElement.appendChild(indicator);
        }

        // Update tooltip with rank downgrade info
        indicator.title = `A secondary role mastery has been detected, action rank will be reduced from MR ${currentRankLabel} to MR ${downcastRankLabel}.`;

        // Update the MR display in the rollcode to show downcast rank
        const masteryReplace = cardElement.querySelector(".masteryreplace");
        if (masteryReplace) {
          masteryReplace.innerHTML = downcastRankLabel;
        }
      }

      // Add downcast class to card
      cardElement.classList.add("downcast-action");
    } else {
      // Remove indicator if it exists
      if (indicator) {
        indicator.remove();
      }
      // Remove downcast class from card
      cardElement.classList.remove("downcast-action");

      // Reset MR to normal rank if not downcast
      const currentState = this.state.getState();
      const masteryIndex =
        currentState.chosenMasteries.indexOf(clickedMasteryId);

      if (masteryIndex !== -1) {
        const currentRank = currentState.chosenMasteriesRanks[masteryIndex];
        const rankLabels = ["E", "D", "C", "B", "A", "S"];
        const currentRankLabel = rankLabels[currentRank];

        // Update the MR display to show normal rank
        const masteryReplace = cardElement.querySelector(".masteryreplace");
        if (masteryReplace) {
          masteryReplace.innerHTML = currentRankLabel;
        }
      }
    }
  }

  updateRankBadge(buildRank) {
    const badge = this.domUtils.getElementById("rank-badge-avatar");
    if (!badge) return;

    // Update badge text with superscript for + signs
    let displayText = buildRank;
    if (buildRank.includes("+")) {
      const baseLetter = buildRank.charAt(0);
      displayText = `${baseLetter}<sup>+</sup>`;
    }
    badge.innerHTML = displayText;

    // Remove all rank classes
    badge.className = "rank-badge-avatar";

    // Add appropriate rank class
    let rankClass = buildRank.toLowerCase();
    if (rankClass === "s+") {
      rankClass = "splus";
    } else {
      rankClass = rankClass.replace("+", "");
    }
    badge.classList.add(`rank-${rankClass}`);
  }

  displayEquipment(state) {
    const {
      armorType,
      weaponRank,
      armorRank,
      accessoryType = null,
      accessoryRank = 0,
    } = state;

    this.domUtils.setHTML(
      this.domUtils.querySelector(".weaponrankdisplay"),
      `<div class="equipment-rank-display"><span class="mastery-with-icon"><img src="https://terrarp.com/db/tool/weapon-rank.png" class="mastery-icon"> Weapon</span><span class="rank-badge ${this.getRankColorClass(this.getRankLabel(weaponRank))}">${this.getRankLabel(weaponRank)}</span></div>`,
    );

    if (armorType && this.armorImages[armorType]) {
      this.domUtils.setHTML(
        this.domUtils.querySelector(".armorrankdisplay"),
        `<div class="equipment-rank-display"><span class="mastery-with-icon"><img src="${this.armorImages[armorType]}" class="mastery-icon"> ${armorType.charAt(0).toUpperCase() + armorType.slice(1)}</span><span class="rank-badge ${this.getRankColorClass(this.getRankLabel(armorRank))}">${this.getRankLabel(armorRank)}</span></div>`,
      );

      // Set armor ability
      const armorAbilityData = this.getArmorAbility(armorType, armorRank);
      this.displayArmorAbility(armorAbilityData, armorType, armorRank);
    }

    if (accessoryType && this.accessoryImages[accessoryType]) {
      this.domUtils.setHTML(
        this.domUtils.querySelector(".accessoryrankdisplay"),
        `<div class="equipment-rank-display"><span class="mastery-with-icon"><img src="${this.accessoryImages[accessoryType]}" class="mastery-icon"> ${accessoryType.charAt(0).toUpperCase() + accessoryType.slice(1)}</span><span class="rank-badge ${this.getRankColorClass(this.getRankLabel(accessoryRank))}">${this.getRankLabel(accessoryRank)}</span></div>`,
      );
    }

    // Populate mastery check icons
    this.populateMasteryCheckIcons(state);

    // Populate expertise check icons
    this.populateExpertiseCheckIcons(state);
  }

  getArmorAbility(armorType, armorRank) {
    // Use V2 armor abilities data
    const armorAbilities = window.armorAbilitiesV2;

    if (!armorAbilities)
      return { name: "No ability", description: "", rollCode: "" };

    const rankLetter = this.getRankLabel(armorRank);
    const result = armorAbilities[armorType]?.[rankLetter] || {
      name: "No ability",
      description: "",
      rollCode: "",
    };
    return result;
  }

  displayArmorAbility(abilityData, armorType, armorRank) {
    // Hide the old armor passive display area
    const armorSkillDisplay = this.domUtils.getElementById("equipmentpassive");
    if (armorSkillDisplay) {
      armorSkillDisplay.style.display = "none";
    }

    // Find the Free actions container
    const freeActionsContainer =
      this.domUtils.getElementById("freeactiondisplay");
    if (!freeActionsContainer) return;

    // Remove any existing armor ability card
    const existingArmorCard = this.domUtils.querySelector(
      "#armor-ability-card",
    );
    if (existingArmorCard) {
      existingArmorCard.remove();
    }

    // Only add armor ability card if there's a valid ability
    if (
      !abilityData.name ||
      abilityData.name === "No ability" ||
      armorRank === 0
    ) {
      return;
    }

    const armorTypeName =
      armorType.charAt(0).toUpperCase() + armorType.slice(1);

    // Create armor ability card HTML
    const armorCard = `
      <div class="card normal" id="armor-ability-card">
        <div class="cardtop">
            <div class="cardtopleft">
                <div class="cardtitle">${abilityData.name}</div>
                <div class="filler"></div>
                <p class="type">${armorTypeName} Armor Ability</p>
            </div>
            <div class="filler"></div>
            <div class="cardicon" style="background-color: #1e2131; background-image: url('${this.armorImages[armorType]}'); background-repeat: no-repeat; background-position: center; background-size: contain;"></div>
        </div>
        <div class="cardinfo">
          <p>${abilityData.description}</p>
        </div>
        <div class="rollcode clickable-rollcode" onclick="copyRollCode(this, event)" title="Click to copy">${abilityData.rollCode}</div>
        <div class="risky-toggle-container"></div>
      </div>
    `;

    // Insert the armor card right after the opening div of freeactiondisplay (before Attack card)
    const firstCard = freeActionsContainer.querySelector(".card");
    if (firstCard) {
      firstCard.insertAdjacentHTML("beforebegin", armorCard);
    } else {
      freeActionsContainer.insertAdjacentHTML("afterbegin", armorCard);
    }
  }

  populateMasteryCheckIcons(state) {
    const container = this.domUtils.getElementById("masterycheckicons");
    const masteries = this.dataLoader.cache.masteries;
    let html = "";

    state.chosenMasteries.forEach((masteryId) => {
      const mastery = masteries.find((m) => m.lookup === masteryId);
      if (mastery) {
        html += `<div class='display masterycircle ${mastery.lookup}' onclick='clickMastery(this)'><img src='${mastery.image}'></div>`;
      }
    });

    this.domUtils.setHTML(container, html);
  }

  populateExpertiseCheckIcons(state) {
    const container = this.domUtils.getElementById("expertiseicons");
    const expertise = this.dataLoader.cache.expertise;
    let html = "";

    state.chosenExpertise.forEach((expertiseId) => {
      const expertiseData = expertise.find((e) => e.lookup === expertiseId);
      if (expertiseData) {
        // Get border color based on first type
        const firstType = expertiseData.types && expertiseData.types[0];
        let borderColor = "#6e51cb"; // Default: Discipline

        if (firstType === "physical") {
          borderColor = "#ce6541"; // Physical
        } else if (firstType === "creative") {
          borderColor = "#a84b72"; // Artistic
        } else if (firstType === "crafting") {
          borderColor = "#d2aa49"; // Crafting
        }

        html += `<div class='display masterycircle ${expertiseData.lookup}' onclick='clickExpertise(this, "${expertiseId}")' style='border-color: ${borderColor};'><img src='${expertiseData.image}'></div>`;
      }
    });

    this.domUtils.setHTML(container, html);
  }

  displayActions(state, actions) {
    const container = this.domUtils.getElementById("actionsdisplay");
    const masteries = this.dataLoader.cache.masteries;
    let html = "";

    // Add base actions first (attack, rush - no recover in V2)
    this.displayBaseActions(state, masteries);

    // Add chosen actions
    state.chosenActions.forEach((actionId) => {
      const action = actions.find((a) => a.lookup === actionId);
      if (action && !["attack", "rush"].includes(action.lookup)) {
        html += this.generateActionCard(action, state, masteries);
      }
    });

    this.domUtils.setHTML(container, html);
  }

  displayBaseActions(state, masteries) {
    const baseActions = ["attack", "rush"];
    const actions = this.dataLoader.cache.actions;

    baseActions.forEach((actionId) => {
      const action = actions.find((a) => a.lookup === actionId);
      if (action) {
        const container = this.domUtils.querySelector(`.card.${actionId}final`);
        if (container) {
          // Remove any existing downcast indicators and classes - they only show when mastery is clicked
          const existingIndicator = container.querySelector(
            ".action-downcast-indicator",
          );
          if (existingIndicator) {
            existingIndicator.remove();
          }
          container.classList.remove("downcast-action");

          this.domUtils.setHTML(
            container,
            this.generateActionCardContent(action, state, masteries),
          );
        }
      }
    });
  }

  generateActionCard(action, state, masteries) {
    // Don't show downcast indicators by default - they only appear when mastery is clicked
    return `<div class="card" id="${action.lookup}final" style="border-color: ${action.color}">
      ${this.generateActionCardContent(action, state, masteries)}
    </div>`;
  }

  generateActionCardContent(action, state, masteries) {
    const rollSection =
      action.dice && action.dice !== "-"
        ? `<div class="filler"></div><div class="cardroll"><b>Roll:</b> ${action.dice}</div>`
        : "";

    const rollCodeSection =
      action.roll && action.roll !== "-"
        ? `<div class="rollcode clickable-rollcode" onclick="copyRollCode(this, event)" title="Click to copy">${action.roll}</div>`
        : "";

    // Generate mastery icons for this action
    const masteryIcons = this.generateMasteryIcons(action, state, masteries);

    // Generate action-specific toggle buttons
    const toggleButtons = this.generateToggleButtons(action);

    // Generate swap button for Revive action
    const swapButton =
      action.lookup === "revive"
        ? '<div class="revive-swap-button" onclick="toggleReviveStabilize(this)" title="Toggle between Revive and Stabilize">⇄</div>'
        : "";

    return `
      <div class="cardtop">
        <div class="cardtopleft">
            <div class="cardtitle">${action.name}</div>
            <div class="filler"></div>
            <p class="type">${action.type}</p>
        </div>
        <div class="filler"></div>
        <div class="cardicon" style="background-color: ${action.color}; background-image: url('${action.image}'); background-repeat: no-repeat; background-position: center;">
          ${swapButton}
        </div>
      </div>
      <div class="cardinfo">${action.description}</div>
      ${rollSection}
      ${rollCodeSection}
      ${masteryIcons}
      ${toggleButtons}
    `;
  }

  generateToggleButtons(action) {
    const buttons = [];

    // Define button configurations for specific actions
    const buttonConfigs = {
      "ultra-counter": [
        {
          text: "Melee",
          onclick: "toggleMelee",
          suffix: "Melee",
        },
      ],
      "reckless-attack": [
        {
          text: "Risky",
          onclick: "toggleRisky",
          suffix: "Risky Mode",
          hasInput: true,
        },
      ],
      versatile: [
        {
          text: "Simulcast",
          onclick: "toggleSimulcast",
          suffix: "Simulcast",
        },
      ],
      heal: [
        {
          text: "AoE",
          onclick: "toggleAoE",
          suffix: "AoE",
        },
        {
          text: "Versatile",
          onclick: "toggleVersatile",
          suffix: "Versatile",
        },
        {
          text: "Simulcast",
          onclick: "toggleSimulcast",
          suffix: "Simulcast",
        },
      ],
      buff: [
        {
          text: "AoE",
          onclick: "toggleAoE",
          suffix: "AoE",
        },
        {
          text: "Versatile",
          onclick: "toggleVersatile",
          suffix: "Versatile",
        },
        {
          text: "Simulcast",
          onclick: "toggleSimulcast",
          suffix: "Simulcast",
        },
      ],
      "power-heal": [
        {
          text: "AoE",
          onclick: "toggleAoE",
          suffix: "AoE",
        },
        {
          text: "Versatile",
          onclick: "toggleVersatile",
          suffix: "Versatile",
        },
        {
          text: "Simulcast",
          onclick: "toggleSimulcast",
          suffix: "Simulcast",
        },
      ],
      "power-buff": [
        {
          text: "AoE",
          onclick: "toggleAoE",
          suffix: "AoE",
        },
        {
          text: "Versatile",
          onclick: "toggleVersatile",
          suffix: "Versatile",
        },
        {
          text: "Simulcast",
          onclick: "toggleSimulcast",
          suffix: "Simulcast",
        },
      ],
      aid: [
        {
          text: "Assist",
          onclick: "toggleAssist",
          suffix: "Assist",
        },
      ],
      evolve: [
        {
          text: "Shift",
          onclick: "toggleShift",
          suffix: "Shift",
        },
      ],
      adapt: [
        {
          text: "Prowl",
          onclick: "toggleProwl",
          suffix: "Prowl",
          mutuallyExclusive: ["Fend"],
        },
        {
          text: "Fend",
          onclick: "toggleFend",
          suffix: "Fend",
          mutuallyExclusive: ["Prowl"],
        },
      ],
      regenerate: [
        {
          text: "Power Regenerate",
          onclick: "togglePowerRegenerate",
          suffix: "Power Regenerate",
        },
      ],
      "hyper-instinct": [
        {
          text: "Ultra Instinct",
          onclick: "toggleUltraInstinct",
          suffix: "Ultra Instinct",
        },
      ],
      "hyper-insight": [
        {
          text: "Ultra Insight",
          onclick: "toggleUltraInsight",
          suffix: "Ultra Insight",
        },
      ],
      engage: [
        {
          text: "Redo",
          onclick: "toggleRedo",
          suffix: "Redo",
          mutuallyExclusive: ["Accretion"],
        },
        {
          text: "Accretion",
          onclick: "toggleAccretion",
          suffix: "Accretion",
          mutuallyExclusive: ["Redo"],
        },
      ],
      guardian: [
        {
          text: "Amplify Aura",
          onclick: "toggleAmplifyAura",
          suffix: "Amplify Aura",
        },
      ],
      savior: [
        {
          text: "Share Aura",
          onclick: "toggleShareAura",
          suffix: "Share Aura",
        },
      ],
      "follow-up": [],
      charge: [
        {
          text: "Charging",
          onclick: "toggleCharging",
          suffix: "Charging",
          hasInput: true,
          inputPlaceholder: "Charging Value",
          updateFunction: "updateChargingSuffix",
        },
        {
          text: "Release",
          onclick: "toggleRelease",
          suffix: "Release",
          hasInput: true,
          inputPlaceholder: "Release Value",
          updateFunction: "updateReleaseSuffix",
        },
      ],
      exchange: [
        {
          text: "Defile",
          onclick: "toggleDefile",
          suffix: "Defile",
          hasInput: false,
        },
      ],
      wager: [
        {
          text: "Bank",
          onclick: "toggleBank",
          suffix: "Bank",
          hasInput: true,
          inputPlaceholder: "Action Name",
          updateFunction: "updateBankSuffix",
        },
      ],
      rage: [
        {
          text: "Frenzy",
          onclick: "toggleFrenzy",
          suffix: "Frenzy",
        },
      ],
      momentum: [
        {
          text: "Blitz",
          onclick: "toggleBlitz",
          suffix: "Blitz",
        },
      ],
      overdrive: [],
    };

    // Define input configurations for actions that need custom inputs
    const inputConfigs = {
      imbue: {
        target: true,
      },
      revive: {
        target: true,
        maxhp: true,
      },
      "follow-up": {
        target: true,
      },
      rage: {
        damageTaken: true,
      },
      overdrive: {
        overdriveDamage: true,
      },
      mark: {
        target: true,
      },
      "wager-future": {
        bank: true,
      },
    };

    const configs = buttonConfigs[action.lookup];
    const inputs = inputConfigs[action.lookup];

    if (configs) {
      configs.forEach((config) => {
        let buttonHtml = `<button class="risky-toggle" onclick="${config.onclick}('${action.lookup}', '${config.suffix}')">${config.text}</button>`;

        // Add input field for buttons that have hasInput
        if (config.hasInput) {
          const placeholder = config.inputPlaceholder || "Modifiers";
          const updateFunction = config.updateFunction || "updateRiskySuffix";
          const inputClass = `risky-input ${config.suffix.toLowerCase()}-input`;
          buttonHtml += `<input type="text" class="${inputClass}" placeholder="${placeholder}" style="display: none;" oninput="${updateFunction}('${action.lookup}', '${config.suffix}')" onkeyup="${updateFunction}('${action.lookup}', '${config.suffix}')">`;
        }

        buttons.push(buttonHtml);
      });
    }

    // Add custom inputs for actions that need them (always visible)
    if (inputs) {
      if (inputs.target) {
        buttons.push(
          `<input type="text" class="target-input" placeholder="Target" oninput="updateTargetSuffix('${action.lookup}')" onkeyup="updateTargetSuffix('${action.lookup}')">`,
        );
      }
      if (inputs.maxhp) {
        buttons.push(
          `<input type="number" class="maxhp-input" placeholder="Max HP" min="1" onkeydown="validateNumericInput(event)" oninput="updateMaxHPSuffix('${action.lookup}')" onkeyup="updateMaxHPSuffix('${action.lookup}')">`,
        );
      }
      if (inputs.bank) {
        buttons.push(
          `<input type="text" class="target-input" placeholder="Banked Action" min="1" onkeydown="updateTargetSuffix(event)" oninput="updateTargetSuffix('${action.lookup}')" onkeyup="updateTargetSuffix('${action.lookup}')">`,
        );
      }
      if (inputs.damageTaken) {
        buttons.push(
          `<input type="number" class="damage-taken-input" placeholder="Damage Taken" min="0" onkeydown="validateNumericInput(event)" oninput="updateDamageTakenSuffix('${action.lookup}')" onkeyup="updateDamageTakenSuffix('${action.lookup}')">`,
        );
      }
      if (inputs.overdriveDamage) {
        buttons.push(
          `<input type="number" class="overdrive-damage-input" placeholder="Overdrive Damage" min="0" onkeydown="validateNumericInput(event)" oninput="updateOverdriveDamageSuffix('${action.lookup}')" onkeyup="updateOverdriveDamageSuffix('${action.lookup}')">`,
        );
      }
    }

    // Always return a container, even if empty
    return `<div class="risky-toggle-container">${buttons.join("")}</div>`;
  }

  isActionDowncast(action, mastery) {
    // Check if the mastery's primary role matches the action's category
    // If not, it's downcast (mastery is being used outside its primary role)
    return mastery.primaryRole !== action.category;
  }

  hasDowncastMasteries(action, state, masteries) {
    if (!action.masteries) return false;

    const applicableMasteries = state.chosenMasteries.filter((masteryId) =>
      action.masteries.includes(masteryId),
    );

    return applicableMasteries.some((masteryId) => {
      const mastery = masteries.find((m) => m.lookup === masteryId);
      return mastery && this.isActionDowncast(action, mastery);
    });
  }

  generateMasteryIcons(action, state, masteries) {
    if (!action.masteries) return "";

    // Rush action should not have mastery selection
    if (action.lookup === "rush") return "";

    // Hide mastery icons if the action's roll code doesn't contain "Mastery"
    // Exception: Evolve action always shows mastery selection
    if (
      action.lookup !== "evolve" &&
      (!action.dice || !action.roll.includes("Mastery"))
    ) {
      return '<div class="masteryicon" style="height: 41px;"></div>';
    }

    // Handle "all" masteries - if action accepts all masteries, use all chosen masteries
    let applicableMasteries;
    if (action.lookup === "evolve") {
      // Special case: Evolve action shows all non-alter masteries
      applicableMasteries = state.chosenMasteries.filter((masteryId) => {
        const mastery = masteries.find((m) => m.lookup === masteryId);
        return mastery && mastery.primaryRole !== "alter";
      });
    } else if (action.masteries.includes("all")) {
      applicableMasteries = state.chosenMasteries;

      // Special case: Attack action should not include alter masteries
      if (action.lookup === "attack") {
        applicableMasteries = applicableMasteries.filter((masteryId) => {
          const mastery = masteries.find((m) => m.lookup === masteryId);
          return mastery && mastery.primaryRole !== "alter";
        });
      }
    } else {
      applicableMasteries = state.chosenMasteries.filter((masteryId) =>
        action.masteries.includes(masteryId),
      );
    }

    if (applicableMasteries.length === 0) return "";

    let html = '<div class="masteryicon">';
    applicableMasteries.forEach((masteryId) => {
      const mastery = masteries.find((m) => m.lookup === masteryId);
      if (mastery) {
        // Basic actions like Attack and Evolve should never be downcasted
        const isDowncast =
          action.lookup !== "attack" &&
          action.lookup !== "evolve" &&
          this.isActionDowncast(action, mastery);
        const downcastClass = isDowncast ? " downcast" : "";
        const downcastIndicator = isDowncast
          ? '<div class="downcast-indicator">↓</div>'
          : "";

        html += `<div class="display masterycircle ${masteryId}${downcastClass}" data-mastery="${masteryId}" data-action="${action.lookup}" onclick="clickMastery(this)">
          <img class="${masteryId}" src="${mastery.image}">
          ${downcastIndicator}
        </div>`;
      }
    });
    html += "</div>";

    return html;
  }

  generateBuildCodes(state) {
    // Generate compact build URL
    const buildURL = this.buildEncoder.generateCompactBuildCode(state);
    this.domUtils.setValue(this.domUtils.getElementById("build-url"), buildURL);
  }

  replaceCharacterName(characterName) {
    if (!characterName) return;

    // Replace in all sections that contain roll codes
    const sectionsToUpdate = [
      "freeactiondisplay",
      "actionsdisplay",
      "saveschecks",
    ];

    sectionsToUpdate.forEach((sectionId) => {
      const section = this.domUtils.getElementById(sectionId);
      if (section) {
        section.innerHTML = section.innerHTML.replace(
          /Character Name/g,
          characterName,
        );
      }
    });

    // Replace in armor passive if it exists
    const armorPassive = this.domUtils.querySelector(".charpassive");
    if (armorPassive) {
      armorPassive.innerHTML = armorPassive.innerHTML.replace(
        /Character Name/g,
        characterName,
      );
    }

    // Update character name display
    const charNameElement = this.domUtils.querySelector(".charname");
    if (charNameElement) {
      charNameElement.innerHTML = characterName;
    }
  }

  replaceWeaponRank(weaponRank) {
    if (weaponRank === undefined || weaponRank === null) return;

    // Convert weapon rank number to letter
    const rankLetters = ["E", "D", "C", "B", "A", "S"];
    const weaponRankLetter = rankLetters[weaponRank] || "E";

    // Replace in all sections that contain roll codes
    const sectionsToUpdate = [
      "freeactiondisplay",
      "actionsdisplay",
      "saveschecks",
    ];

    sectionsToUpdate.forEach((sectionId) => {
      const section = this.domUtils.getElementById(sectionId);
      if (section) {
        section.innerHTML = section.innerHTML.replace(/WR/g, weaponRankLetter);
      }
    });

    // Replace in armor passive if it exists
    const armorPassive = this.domUtils.querySelector(".charpassive");
    if (armorPassive) {
      armorPassive.innerHTML = armorPassive.innerHTML.replace(
        /WR/g,
        weaponRankLetter,
      );
    }
  }

  replaceBreakTypes(state) {
    const masteries = this.dataLoader.cache.masteries;

    // Get the first selected mastery as primary for break type
    if (state.chosenMasteries && state.chosenMasteries.length > 0) {
      const primaryMasteryId = state.chosenMasteries[0];
      const primaryMastery = masteries.find(
        (m) => m.lookup === primaryMasteryId,
      );

      if (primaryMastery && primaryMastery.breakType) {
        const breakType =
          primaryMastery.breakType.charAt(0).toUpperCase() +
          primaryMastery.breakType.slice(1);

        // Replace break types in all sections that contain roll codes
        const sectionsToUpdate = [
          "freeactiondisplay",
          "actionsdisplay",
          "saveschecks",
        ];

        sectionsToUpdate.forEach((sectionId) => {
          const section = this.domUtils.getElementById(sectionId);
          if (section) {
            // Replace the breaktype span content
            const breakTypeSpans = section.querySelectorAll(".breaktype");
            breakTypeSpans.forEach((span) => {
              span.innerHTML = breakType;
            });
          }
        });
      }
    }
  }

  setupThreadCode() {
    const threadCodeInput = this.domUtils.getElementById("threadcodereplace");

    if (threadCodeInput) {
      // Update in real-time as user types
      this.domUtils.addEventListener(threadCodeInput, "input", () =>
        this.updateThreadCode(),
      );

      // Also update on enter key
      this.domUtils.addEventListener(threadCodeInput, "keypress", (e) => {
        if (e.key === "Enter") {
          this.updateThreadCode();
        }
      });
    }
  }

  restoreThreadCode() {
    const currentState = this.state.getState();
    const savedThreadCode = currentState.threadCode;

    if (savedThreadCode) {
      // Restore the input value
      const threadCodeInput = this.domUtils.getElementById("threadcodereplace");
      if (threadCodeInput) {
        this.domUtils.setValue(threadCodeInput, savedThreadCode);
      }

      // Update all thread code displays
      this.updateThreadCode();
    }
  }

  updateThreadCode() {
    const newCode = this.domUtils.getValue(
      this.domUtils.getElementById("threadcodereplace"),
    );
    const elements = this.domUtils.querySelectorAll(".thrcode");

    // Update all thread code elements
    elements.forEach((element) => {
      this.domUtils.setText(element, newCode || "Thread Code");
    });

    // Save thread code to state for persistence
    this.state.updateState({ threadCode: newCode });

    // Regenerate build codes with new thread code
    const currentState = this.state.getState();
    this.generateBuildCodes(currentState);
  }

  updateNote() {
    const noteTextarea = this.domUtils.getElementById("note");
    if (!noteTextarea) return;

    const newNote = noteTextarea.value;

    // Save note to state for persistence
    this.state.updateState({ note: newNote });

    // Regenerate build codes with new note
    const currentState = this.state.getState();
    this.generateBuildCodes(currentState);
  }

  setupEventListeners() {
    // Copy buttons
    this.domUtils.querySelectorAll(".copy-button").forEach((button) => {
      this.domUtils.addEventListener(button, "click", (e) => {
        const targetId = e.target.dataset.target;
        const textarea = this.domUtils.getElementById(targetId);
        if (textarea) {
          textarea.select();
          document.execCommand("copy");
          e.target.textContent = "Copied!";
          setTimeout(() => {
            e.target.textContent = "Copy";
          }, 2000);
        }
      });
    });

    // Navigation buttons
    this.domUtils.addEventListener(
      this.domUtils.getElementById("back-button"),
      "click",
      () => this.goToPreviousPage(),
    );

    this.domUtils.addEventListener(
      this.domUtils.getElementById("edit-build-button"),
      "click",
      () => this.editBuild(),
    );

    // Note textarea - save on input and update build URL
    const noteTextarea = this.domUtils.getElementById("note");
    if (noteTextarea) {
      this.domUtils.addEventListener(noteTextarea, "input", () =>
        this.updateNote(),
      );
    }
  }

  goToPreviousPage() {
    const url = this.state.generateURL("action-selector.html");
    window.location.href = url;
  }

  editBuild() {
    const currentState = this.state.getState();

    // If character was imported from Terrarp, skip to action selection
    // since masteries and ranks are already set from the API
    if (currentState.profileBannerUrl) {
      const url = this.state.generateURL("action-selector.html");
      window.location.href = url;
    } else {
      // For manual builds, go back to mastery selection
      const url = this.state.generateURL("mastery-selector.html");
      window.location.href = url;
    }
  }

  loadFromBuildCode() {
    const hash = window.location.hash;
    if (
      hash &&
      (hash.includes("#load.") ||
        hash.includes("#import.") ||
        hash.includes("#sample.") ||
        hash.includes("#compact."))
    ) {
      try {
        const result = this.buildEncoder.loadFromURL();
        if (result.success) {
          this.state.updateState(result.data);
        } else {
          console.warn(
            "BuildSheet V2: Failed to load build from URL:",
            result.error,
          );
        }
      } catch (error) {
        console.error("BuildSheet V2: Error loading build code:", error);
      }
    }
  }

  adjustNavigationForImportedCharacter() {
    const currentState = this.state.getState();

    // If character has profileBannerUrl, it was imported from Terrarp
    if (currentState.profileBannerUrl) {
      // Hide "< Select Actions" button
      const backButton = this.domUtils.getElementById("back-button");
      if (backButton) {
        backButton.style.display = "none";
      }
    } else {
      // For manual builds (no banner), add top padding to prevent cut-off appearance
      const builddisplay = this.domUtils.getElementById("builddisplay");
      if (builddisplay) {
        // builddisplay.style.paddingTop = '60px';
      }
    }
  }

  showError(message) {
    const container = this.domUtils.getElementById("builddisplay");
    this.domUtils.showError(container, message);
  }
}

// Global reference to BuildSheet instance
let buildSheetInstance = null;

// Global click functions for roll code interaction
function clickMastery(element) {
  if (!buildSheetInstance) return;

  // Add glow effect
  addGlowEffect(element, "masterycircle");

  const state = buildSheetInstance.state.getState();
  const masteries = buildSheetInstance.dataLoader.cache.masteries;

  // Find the mastery ID from the element's class
  const classList = element.classList.toString();

  // The classList might contain multiple classes, need to find the mastery one
  const classArray = classList.split(" ");
  let masteryId = null;
  let masteryIndex = -1;

  // Find which class corresponds to a chosen mastery
  for (const className of classArray) {
    masteryIndex = state.chosenMasteries.indexOf(className);
    if (masteryIndex !== -1) {
      masteryId = className;
      break;
    }
  }

  if (masteryIndex !== -1) {
    // Get rank letter
    const rankLetters = ["E", "D", "C", "B", "A", "S"];
    const rankLetter = rankLetters[state.chosenMasteriesRanks[masteryIndex]];

    // Find mastery name
    const mastery = masteries.find((m) => m.lookup === masteryId);
    const masteryName = mastery ? mastery.name : "Mastery";

    // Find the roll code container and update
    const cardElement = element.closest(".card");
    if (cardElement) {
      const rollCodeElement = cardElement.querySelector(".rollcode");
      const masteryReplace = cardElement.querySelector(".masteryreplace");
      const mnameReplace = cardElement.querySelector(".mnamereplace");

      // Check if this is the Evolve action - special handling
      const actionElement = cardElement.querySelector('[data-action="evolve"]');
      if (actionElement) {
        // For Evolve action, add Mastery (masteryname) suffix to rollcode
        if (rollCodeElement) {
          // Remove any existing Mastery suffix first
          const existingSuffixPattern = / · Mastery \([^)]+\)/g;
          rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
            existingSuffixPattern,
            "",
          );

          // Add new suffix
          rollCodeElement.innerHTML += ` · Mastery (${masteryName})`;
        }
        return; // Don't do normal mastery replacement for Evolve
      }

      // Update the spans FIRST, then update the command
      if (masteryReplace) {
        masteryReplace.innerHTML = rankLetter;
      }
      if (mnameReplace) {
        mnameReplace.innerHTML = masteryName;
      }

      // Update break type
      const breakTypeReplace = cardElement.querySelector(".breaktype");
      if (breakTypeReplace && mastery && mastery.breakType) {
        const breakType =
          mastery.breakType.charAt(0).toUpperCase() +
          mastery.breakType.slice(1);
        breakTypeReplace.innerHTML = breakType;
      }

      // Update downcast indicators based on clicked mastery
      buildSheetInstance.updateDowncastIndicators(
        cardElement,
        masteryId,
        mastery,
      );
    }
  }
}

function clickFortitude(element) {
  if (!buildSheetInstance) return;

  // Add glow effect
  addGlowEffect(element, "masterycircle");

  const state = buildSheetInstance.state.getState();
  const masteries = buildSheetInstance.dataLoader.cache.masteries;
  const expertise = buildSheetInstance.dataLoader.cache.expertise;
  const stats = buildSheetInstance.calculations.getCompleteStats(
    state,
    masteries,
    [],
    expertise,
  );

  document.querySelector(".savereplace").innerHTML = "Fortitude";
  document.querySelector(".savebonusreplace").innerHTML = stats.saves.fortitude;
  document.querySelector(".reflexmodifiers").innerHTML = "";
}

function clickReflex(element) {
  if (!buildSheetInstance) return;

  // Add glow effect
  addGlowEffect(element, "masterycircle");

  const state = buildSheetInstance.state.getState();
  const masteries = buildSheetInstance.dataLoader.cache.masteries;
  const expertise = buildSheetInstance.dataLoader.cache.expertise;
  const stats = buildSheetInstance.calculations.getCompleteStats(
    state,
    masteries,
    [],
    expertise,
  );

  document.querySelector(".savereplace").innerHTML = "Reflex";
  document.querySelector(".savebonusreplace").innerHTML = stats.saves.reflex;
  document.querySelector(".reflexmodifiers").innerHTML =
    stats.saves.reflexmod || "";
}

function clickWill(element) {
  if (!buildSheetInstance) return;

  // Add glow effect
  addGlowEffect(element, "masterycircle");

  const state = buildSheetInstance.state.getState();
  const masteries = buildSheetInstance.dataLoader.cache.masteries;
  const expertise = buildSheetInstance.dataLoader.cache.expertise;
  const stats = buildSheetInstance.calculations.getCompleteStats(
    state,
    masteries,
    [],
    expertise,
  );

  document.querySelector(".savereplace").innerHTML = "Will";
  document.querySelector(".savebonusreplace").innerHTML = stats.saves.will;
  document.querySelector(".reflexmodifiers").innerHTML = "";
}

function clickExpertise(element, expertiseId) {
  if (!buildSheetInstance) return;

  // Add glow effect
  addGlowEffect(element, "masterycircle");

  const state = buildSheetInstance.state.getState();
  const expertiseList = buildSheetInstance.dataLoader.cache.expertise;

  // Find the expertise data and rank
  const expertiseIndex = state.chosenExpertise.indexOf(expertiseId);
  if (expertiseIndex !== -1) {
    const expertiseData = expertiseList.find((e) => e.lookup === expertiseId);
    const rank = state.chosenExpertiseRanks[expertiseIndex];
    const rankLetters = ["E", "D", "C", "B", "A", "S"];
    const rankLetter = rankLetters[rank];

    document.querySelector(".expertisereplace").innerHTML = expertiseData
      ? expertiseData.name
      : "Expertise";
    document.querySelector(".expertisebonusreplace").innerHTML = rankLetter;
  }
}

// Helper function to add glow effect and manage active state
function addGlowEffect(element, containerClass) {
  // Find the container that holds all similar elements (for mastery circles, save buttons, etc.)
  let container;
  if (containerClass === "masterycircle") {
    container =
      element.closest(".masteryicon") || element.closest("#savesicons");
  } else if (containerClass === "togglesavechecks") {
    container = element.closest(".togglecontainer");
  }

  // Remove glow from all similar elements in the container
  if (container) {
    const allSimilarElements = container.querySelectorAll(`.${containerClass}`);
    allSimilarElements.forEach((el) => el.classList.remove("active-glow"));
  }

  // Add glow to clicked element
  element.classList.add("active-glow");
}

// Advantage/disadvantage toggle functions for saves
function advantageSave(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".saveadv").innerHTML = "adv ";
}

function normalSave(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".saveadv").innerHTML = "";
}

function disadvantageSave(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".saveadv").innerHTML = "dis ";
}

// Advantage/disadvantage toggle functions for expertise
function advantageExpertise(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".expertiseadv").innerHTML = "adv ";
}

function normalExpertise(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".expertiseadv").innerHTML = "";
}

function disadvantageExpertise(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".expertiseadv").innerHTML = "dis ";
}

// Advantage/disadvantage toggle functions for mastery
function advantageMastery(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".masteryadv").innerHTML = "adv ";
}

function normalMastery(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".masteryadv").innerHTML = "";
}

function disadvantageMastery(element) {
  // Add glow effect
  addGlowEffect(event.target, "togglesavechecks");

  document.querySelector(".masteryadv").innerHTML = "dis ";
}

// Generic toggle function for action buttons
function toggleActionButton(actionId, suffix, baseText) {
  const button = event.target;
  const cardElement = button.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");
  const inputClass = `.${suffix.toLowerCase()}-input`;
  const inputElement = cardElement.querySelector(inputClass);

  if (!rollCodeElement) return;

  const isActive = button.classList.contains("active");

  if (isActive) {
    // Remove active state
    button.classList.remove("active");
    button.textContent = baseText;
    // Hide input if it exists
    if (inputElement) {
      inputElement.style.display = "none";
      inputElement.value = "";
      // Clear any custom text from reckless attack
      if (actionId === "reckless-attack") {
        updateRiskySuffix(actionId);
      }
    }

    // Handle different actions differently
    if (actionId === "reckless-attack") {
      // For reckless attack, remove ". Risky Mode" suffix
      const suffixPattern = new RegExp(` · Risky Mode$`);
      rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
        suffixPattern,
        "",
      );
    } else {
      // For other actions, remove suffix from the end of roll code
      const suffixPattern = new RegExp(` · ${suffix}`);
      rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
        suffixPattern,
        "",
      );
    }
  } else {
    // Add active state
    button.classList.add("active");
    button.textContent = baseText;
    // Show input if it exists
    if (inputElement) {
      inputElement.style.display = "inline-block";
      inputElement.focus();
    }

    // Handle different actions differently
    if (actionId === "reckless-attack") {
      // For reckless attack, add ". Risky Mode" suffix at the end
      rollCodeElement.innerHTML += ` · Risky Mode`;
    } else {
      // For other actions, add suffix to the end of roll code
      rollCodeElement.innerHTML += ` · ${suffix}`;
    }
  }
}

// Function to toggle action button without adding/removing suffix (for input-driven suffixes)
function toggleActionButtonNoSuffix(actionId, baseText) {
  const button = event.target;
  const cardElement = button.closest(".card");
  const inputClass = `.${baseText.toLowerCase()}-input`;
  const inputElement = cardElement.querySelector(inputClass);

  const isActive = button.classList.contains("active");

  if (isActive) {
    // Remove active state
    button.classList.remove("active");
    button.textContent = baseText;
    // Hide input if it exists and clear its value
    if (inputElement) {
      inputElement.style.display = "none";
      inputElement.value = "";
      // Trigger the update function to remove suffix
      if (baseText === "Charging") {
        updateChargingSuffix(actionId);
      } else if (baseText === "Release") {
        updateReleaseSuffix(actionId);
      }
    }
  } else {
    // Add active state
    button.classList.add("active");
    button.textContent = baseText;
    // Show input if it exists
    if (inputElement) {
      inputElement.style.display = "inline-block";
      inputElement.focus();
    }
  }
}

// Function to update the risky suffix based on input value
function updateRiskySuffix(actionId) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    console.log("No roll code element found");
    return;
  }

  const customText = inputElement.value.trim();
  console.log("Updating risky suffix:", actionId, customText);

  if (actionId === "reckless-attack") {
    // For reckless attack, insert the custom text before the # symbol
    const currentHtml = rollCodeElement.innerHTML;
    console.log("Current HTML:", currentHtml);

    // Target the damagepassivemod span - insert text inside it
    if (customText) {
      // Insert custom text inside the damagepassivemod span
      const updatedHtml = currentHtml.replace(
        /(<span class="damagepassivemod">)[^<]*(<\/span>)/,
        `$1${customText}$2 `,
      );
      console.log("Updated HTML:", updatedHtml);
      rollCodeElement.innerHTML = updatedHtml;
    } else {
      // Clear the damagepassivemod span
      const updatedHtml = currentHtml.replace(
        /(<span class="damagepassivemod">)[^<]*(<\/span>)/,
        "$1$2",
      );
      console.log("Cleaned HTML:", updatedHtml);
      rollCodeElement.innerHTML = updatedHtml;
    }
  } else {
    // For other actions, use the old suffix replacement method
    const newSuffix = customText || "Risky Mode";
    const suffixPattern = / \. [^.]*$/;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      ` . ${newSuffix}`,
    );
  }
}

// Function to update the target suffix based on input value
function updateTargetSuffix(actionId) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    return;
  }

  const targetText = inputElement.value.trim();

  // Find the target span and update its content directly
  const targetSpan = rollCodeElement.querySelector(".target");
  if (targetSpan) {
    targetSpan.innerHTML = targetText || "Target";
  }
}

// Function to validate numeric input and prevent non-numbers
function validateNumericInput(event) {
  // Allow: backspace, delete, tab, escape, enter
  if (
    [8, 9, 27, 13, 46].includes(event.keyCode) ||
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    (event.keyCode === 65 && event.ctrlKey === true) ||
    (event.keyCode === 67 && event.ctrlKey === true) ||
    (event.keyCode === 86 && event.ctrlKey === true) ||
    (event.keyCode === 88 && event.ctrlKey === true) ||
    // Allow: home, end, left, right, down, up
    (event.keyCode >= 35 && event.keyCode <= 40)
  ) {
    return;
  }
  // Ensure that it is a number and stop the keypress
  if (
    (event.shiftKey || event.keyCode < 48 || event.keyCode > 57) &&
    (event.keyCode < 96 || event.keyCode > 105)
  ) {
    event.preventDefault();
  }
}

// Function to update the MaxHP suffix based on input value
function updateMaxHPSuffix(actionId) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    return;
  }

  let maxhpText = inputElement.value.trim();

  // Filter out non-numeric characters and ensure positive numbers only
  const numericValue = maxhpText.replace(/[^0-9]/g, "");

  // Update input field to show only numeric value
  if (maxhpText !== numericValue) {
    inputElement.value = numericValue;
    maxhpText = numericValue;
  }

  // Find the maxhp span and update its content directly
  const maxhpSpan = rollCodeElement.querySelector(".maxhp");
  if (maxhpSpan) {
    maxhpSpan.innerHTML = maxhpText || "Max Hp";
  }
}

// Function to update the damage taken suffix
function updateDamageTakenSuffix(actionId) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    return;
  }

  let damageText = inputElement.value.trim();

  // Filter out non-numeric characters and ensure positive numbers only
  const numericValue = damageText.replace(/[^0-9]/g, "");

  // Update input field to show only numeric value
  if (damageText !== numericValue) {
    inputElement.value = numericValue;
    damageText = numericValue;
  }

  // Add or update the Taken-damage suffix
  if (damageText) {
    // Remove existing Taken-damage suffix if it exists
    const suffixPattern = / · Taken-damage \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
    // Add new suffix
    rollCodeElement.innerHTML += ` · Taken-damage (${damageText})`;
  } else {
    // Remove suffix if input is empty
    const suffixPattern = / · Taken-damage \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
  }
}

// Function to update the overdrive damage suffix
function updateOverdriveDamageSuffix(actionId) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    return;
  }

  let odDamageText = inputElement.value.trim();

  // Filter out non-numeric characters and ensure positive numbers only
  const numericValue = odDamageText.replace(/[^0-9]/g, "");

  // Update input field to show only numeric value
  if (odDamageText !== numericValue) {
    inputElement.value = numericValue;
    odDamageText = numericValue;
  }

  // Add or update the OD-damage suffix
  if (odDamageText) {
    // Remove existing OD-damage suffix if it exists
    const suffixPattern = / · OD-damage \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
    // Add new suffix
    rollCodeElement.innerHTML += ` · OD-damage (${odDamageText})`;
  } else {
    // Remove suffix if input is empty
    const suffixPattern = / · OD-damage \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
  }
}

// Function to update the charging suffix
function updateChargingSuffix(actionId, suffix) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    return;
  }

  const chargingText = inputElement.value.trim();

  // Add or update the Charging suffix
  if (chargingText) {
    // Remove existing Charging suffix if it exists
    const suffixPattern = / · Charging \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
    // Add new suffix
    rollCodeElement.innerHTML += ` · Charging (${chargingText})`;
  } else {
    // Remove suffix if input is empty
    const suffixPattern = / · Charging \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
  }
}

// Function to update the release suffix
function updateReleaseSuffix(actionId, suffix) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    return;
  }

  const releaseText = inputElement.value.trim();

  // Add or update the Release suffix
  if (releaseText) {
    // Remove existing Release suffix if it exists
    const suffixPattern = / · Release \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
    // Add new suffix
    rollCodeElement.innerHTML += ` · Release (${releaseText})`;
  } else {
    // Remove suffix if input is empty
    const suffixPattern = / · Release \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
  }
}

// Function to update the bank suffix
function updateBankSuffix(actionId, suffix) {
  const inputElement = event.target;
  const cardElement = inputElement.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) {
    return;
  }

  const bankText = inputElement.value.trim();

  // Add or update the Bank suffix
  if (bankText) {
    // Remove existing Bank suffix if it exists
    const suffixPattern = / · Bank \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
    // Add new suffix
    rollCodeElement.innerHTML += ` · Bank (${bankText})`;
  } else {
    // Remove suffix if input is empty
    const suffixPattern = / · Bank \([^)]*\)/g;
    rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
      suffixPattern,
      "",
    );
  }
}

// Wrapper functions for backward compatibility
function toggleMelee(actionId, suffix = "Melee") {
  toggleActionButton(actionId, suffix, "Melee");
}

function toggleRisky(actionId, suffix = "Risky Mode") {
  toggleActionButton(actionId, suffix, "Risky");
}

function toggleSimulcast(actionId, suffix = "Simulcast") {
  toggleActionButton(actionId, suffix, "Simulcast");
}

function toggleAoE(actionId, suffix = "AoE") {
  toggleActionButton(actionId, suffix, "AoE");
}

function toggleVersatile(actionId, suffix = "Versatile") {
  toggleActionButton(actionId, suffix, "Versatile");
}

function toggleAssist(actionId, suffix = "Assist") {
  toggleActionButton(actionId, suffix, "Assist");
}

function toggleShift(actionId, suffix = "Shift") {
  toggleActionButton(actionId, suffix, "Shift");
}

function toggleBlitz(actionId, suffix = "Blitz") {
  toggleActionButton(actionId, suffix, "Blitz");
}

// Handle mutual exclusivity for flag buttons
function handleMutualExclusivity(
  actionId,
  currentSuffix,
  mutuallyExclusiveList,
) {
  const cardElement = event.target.closest(".card");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!rollCodeElement) return;

  // Check if current button is being activated (not already active)
  const currentButton = event.target;
  const isCurrentlyActive = currentButton.classList.contains("active");

  // Only handle exclusivity when activating a button (not deactivating)
  if (!isCurrentlyActive) {
    mutuallyExclusiveList.forEach((excludedSuffix) => {
      // Find button with the excluded suffix text
      const excludedButton = Array.from(
        cardElement.querySelectorAll(".risky-toggle"),
      ).find(
        (btn) =>
          btn.textContent === excludedSuffix &&
          btn.classList.contains("active"),
      );

      if (excludedButton) {
        // Deactivate the excluded button
        excludedButton.classList.remove("active");

        // Hide the input field for the excluded button
        const excludedInputClass = `.${excludedSuffix.toLowerCase()}-input`;
        const excludedInput = cardElement.querySelector(excludedInputClass);
        if (excludedInput) {
          excludedInput.style.display = "none";
          excludedInput.value = ""; // Clear the input value

          // Directly remove the input-based suffix from rollcode
          if (excludedSuffix === "Charging") {
            const chargingSuffixPattern = / · Charging \([^)]*\)/g;
            rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
              chargingSuffixPattern,
              "",
            );
          } else if (excludedSuffix === "Release") {
            const releaseSuffixPattern = / · Release \([^)]*\)/g;
            rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
              releaseSuffixPattern,
              "",
            );
          }
        }

        // Remove the excluded suffix from rollcode (handle both base and input suffixes)
        const baseSuffixPattern = new RegExp(` · ${excludedSuffix}`, "g");
        const inputSuffixPattern = new RegExp(
          ` · ${excludedSuffix} \\([^)]*\\)`,
          "g",
        );
        rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
          baseSuffixPattern,
          "",
        );
        rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
          inputSuffixPattern,
          "",
        );
      }
    });
  }
}

function toggleProwl(actionId, suffix = "Prowl") {
  // Handle mutual exclusivity - deactivate Fend if it's active
  handleMutualExclusivity(actionId, "Prowl", ["Fend"]);
  toggleActionButton(actionId, suffix, "Prowl");
}

function toggleFend(actionId, suffix = "Fend") {
  // Handle mutual exclusivity - deactivate Prowl if it's active
  handleMutualExclusivity(actionId, "Fend", ["Prowl"]);
  toggleActionButton(actionId, suffix, "Fend");
}

function togglePowerRegenerate(actionId, suffix = "Power Regenerate") {
  toggleActionButton(actionId, suffix, "Power Regenerate");
}

function toggleUltraInstinct(actionId, suffix = "Ultra Instinct") {
  toggleActionButton(actionId, suffix, "Ultra Instinct");
}

function toggleUltraInsight(actionId, suffix = "Ultra Insight") {
  toggleActionButton(actionId, suffix, "Ultra Insight");
}

function toggleRedo(actionId, suffix = "Redo") {
  // Handle mutual exclusivity - deactivate Accretion if it's active
  handleMutualExclusivity(actionId, "Redo", ["Accretion"]);
  toggleActionButton(actionId, suffix, "Redo");
}

function toggleAccretion(actionId, suffix = "Accretion") {
  // Handle mutual exclusivity - deactivate Redo if it's active
  handleMutualExclusivity(actionId, "Accretion", ["Redo"]);
  toggleActionButton(actionId, suffix, "Accretion");
}

function toggleAmplifyAura(actionId, suffix = "Amplify Aura") {
  toggleActionButton(actionId, suffix, "Amplify Aura");
}

function toggleShareAura(actionId, suffix = "Share Aura") {
  toggleActionButton(actionId, suffix, "Share Aura");
}

function toggleCharging(actionId, suffix = "Charging") {
  // Handle mutual exclusivity - deactivate Release if it's active
  handleMutualExclusivity(actionId, "Charging", ["Release"]);
  // Don't add base suffix - let the input handler manage the complete suffix
  toggleActionButtonNoSuffix(actionId, "Charging");
}

function toggleRelease(actionId, suffix = "Release") {
  // Handle mutual exclusivity - deactivate Charging if it's active
  handleMutualExclusivity(actionId, "Release", ["Charging"]);
  // Don't add base suffix - let the input handler manage the complete suffix
  toggleActionButtonNoSuffix(actionId, "Release");
}

function toggleDefile(actionId, suffix = "Defile") {
  toggleActionButton(actionId, suffix, "Defile");
}

function toggleBank(actionId, suffix = "Bank") {
  toggleActionButton(actionId, suffix, "Bank");
}

function toggleFrenzy(actionId, suffix = "Frenzy") {
  toggleActionButton(actionId, suffix, "Frenzy");
}

// Function to toggle between Revive and Stabilize with flip animation
function toggleReviveStabilize(buttonElement) {
  const cardElement = buttonElement.closest(".card");
  const cardTitleElement = cardElement.querySelector(".cardtitle");
  const rollCodeElement = cardElement.querySelector(".rollcode");

  if (!cardTitleElement || !rollCodeElement) {
    return;
  }

  const isCurrentlyRevive = cardTitleElement.textContent === "Revive";

  // Start flip animation
  cardElement.classList.add("card-flipping");

  // Change content at mid-flip (50% of animation duration)
  setTimeout(() => {
    const cardInfoElement = cardElement.querySelector(".cardinfo");

    if (isCurrentlyRevive) {
      // Change to Stabilize
      cardTitleElement.textContent = "Stabilize";
      buttonElement.classList.add("active");

      // Change description to remove Lander limitations
      if (cardInfoElement) {
        cardInfoElement.innerHTML =
          "<p>This action may be selected for free when you select 'Heal'.</p><p>Bonus Action: Revive an ally within range. They regain 50% of their max HP.</p>";
      }

      // Append "· Stabilize" to the end of the rollcode
      if (!rollCodeElement.innerHTML.includes("· Stabilize")) {
        rollCodeElement.innerHTML += " · Stabilize";
      }
    } else {
      // Change back to Revive
      cardTitleElement.textContent = "Revive";
      buttonElement.classList.remove("active");

      // Restore original description with Lander limitations
      if (cardInfoElement) {
        cardInfoElement.innerHTML =
          "<p>This action may be selected for free when you select 'Heal'.</p><p>Bonus Action: Revive an ally within range. They regain 50% of their max HP.</p><p>Limitations: Lander characters cannot use this action card.</p>";
      }

      // Remove "· Stabilize" from the rollcode
      rollCodeElement.innerHTML = rollCodeElement.innerHTML.replace(
        " · Stabilize",
        "",
      );
    }
  }, 150); // Exactly when the card reaches 90 degrees (25% of 600ms)

  // Remove flip class after animation completes
  setTimeout(() => {
    cardElement.classList.remove("card-flipping");
  }, 600); // Full animation duration
}

// Function to toggle action filters
function toggleActionFilter(category) {
  const filterButton = event.target;

  // Remove active class from all tabs
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Add active class to clicked tab
  filterButton.classList.add("active");

  // Refresh the display based on selected filter
  refreshAllActionFilters();
}

function refreshAllActionFilters() {
  // Get the active filter (only one can be active now)
  const activeTab = document.querySelector(".filter-tab.active");
  const activeFilter = activeTab
    ? activeTab.getAttribute("data-filter")
    : "all";

  const actions = buildSheetInstance.dataLoader.cache.actions;

  // Show/hide actions based on selected filter
  actions.forEach((action) => {
    const actionCard = document.getElementById(action.lookup + "final");
    if (actionCard) {
      let shouldShow = false;

      // Filter logic
      if (activeFilter === "all") {
        shouldShow = true;
      } else {
        shouldShow = action.category === activeFilter;
      }

      actionCard.style.display = shouldShow ? "flex" : "none";
    }
  });

  // Handle basic attack card (always visible regardless of filter)
  const attackCard = document.querySelector(".attackfinal");
  if (attackCard) {
    attackCard.style.display = "flex";
  }
}

// Copy rollcode to clipboard function
function copyRollCode(element, event) {
  // Get the text content without HTML tags
  const text = element.innerText || element.textContent;

  // Copy to clipboard
  navigator.clipboard
    .writeText(text)
    .then(function () {
      // Flash blue background
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = "#67a2e0";
      element.style.transition = "background-color 0.05s ease";

      // Show "Copied!" tooltip
      const copyTooltip = document.createElement("div");
      copyTooltip.className = "copy-tooltip";
      copyTooltip.textContent = "Copied!";
      element.appendChild(copyTooltip);

      // Reset background quickly, remove tooltip after longer delay
      setTimeout(function () {
        element.style.backgroundColor = originalBg;
      }, 50);

      setTimeout(function () {
        if (copyTooltip.parentNode) {
          copyTooltip.remove();
        }
      }, 800);
    })
    .catch(function (err) {
      console.error("Failed to copy text: ", err);
    });
}

// Initialize when page loads
window.onload = function () {
  buildSheetInstance = new BuildSheetV2();
};
