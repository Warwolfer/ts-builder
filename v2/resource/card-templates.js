// Card Template System for Build Sheet
// Reduces redundancy in HTML generation

class CardTemplates {
  static createCard(options) {
    const {
      id,
      title,
      type,
      description,
      rollCode,
      rollSection,
      masteryIcons,
      toggleButtons,
      borderColor = "#1e2131",
      iconUrl,
      iconBackgroundColor = "#1e2131",
      additionalButtons = "",
    } = options;

    return `
      <div class="card" id="${id}" style="border-color: ${borderColor}">
        <div class="cardtop">
          <div class="cardtopleft">
            <div class="cardtitle">${title}</div>
            <div class="filler"></div>
            <p class="type">${type}</p>
          </div>
          <div class="filler"></div>
          <div class="cardicon" style="background-color: ${iconBackgroundColor}; background-image: url('${iconUrl}'); background-repeat: no-repeat; background-position: center; background-size: contain;">
            ${additionalButtons}
          </div>
        </div>
        <div class="cardinfo">${description}</div>
        ${rollSection}
        ${rollCode}
        ${masteryIcons}
        ${toggleButtons}
      </div>
    `;
  }

  static createRankDisplay(options) {
    const {
      name,
      imageUrl,
      rank,
      rankColorClass,
      containerClass = "mastery-rank-display",
    } = options;

    return `
      <div class="${containerClass}">
        <span class="mastery-with-icon">
          <img src="${imageUrl}" class="mastery-icon"> ${name}
        </span>&nbsp;
        <span class="rank-badge ${rankColorClass}">${rank}</span>
      </div>
    `;
  }

  static createStatsDisplay(options) {
    const { imageUrl, value, tooltip } = options;

    return `
      <div class="stats-display" title="${tooltip}">
        <span class="mastery-with-icon">
          <img src="${imageUrl}" class="mastery-icon">
        </span>
        <span class="rank-badge stat-value">${value}</span>
      </div>
    `;
  }

  static createToggleButton(options) {
    const {
      text,
      actionId,
      suffix,
      onclick,
      hasInput = false,
      inputType = "text",
      placeholder = "",
      additionalClasses = "",
    } = options;

    let buttonHtml = `<button class="risky-toggle ${additionalClasses}" onclick="${onclick}('${actionId}', '${suffix}')">${text}</button>`;

    if (hasInput) {
      buttonHtml += `<input type="${inputType}" class="risky-input" placeholder="${placeholder}" style="display: none;" oninput="updateRiskySuffix('${actionId}')" onkeyup="updateRiskySuffix('${actionId}')">`;
    }

    return buttonHtml;
  }

  static createMasteryIcon(options) {
    const { masteryId, imageUrl, isDowncast = false, actionId } = options;

    const downcastClass = isDowncast ? " downcast" : "";
    const downcastIndicator = isDowncast
      ? '<div class="downcast-indicator">↓</div>'
      : "";

    return `
      <div class="display masterycircle ${masteryId}${downcastClass}" data-mastery="${masteryId}" data-action="${actionId}" onclick="clickMastery(this)">
        <img class="${masteryId}" src="${imageUrl}">
        ${downcastIndicator}
      </div>
    `;
  }

  static createSaveDisplay(options) {
    const { saveType, imageUrl, value, tooltip } = options;

    return `
      <div class="saves-rank-display" title="${tooltip}">
        <span class="mastery-with-icon">
          <img src="${imageUrl}" class="mastery-icon"> ${saveType}
        </span>
        <span class="rank-badge save-bonus">${value}</span>
      </div>
    `;
  }

  static createEquipmentDisplay(options) {
    const { name, imageUrl, rank, rankColorClass } = options;

    return `
      <div class="equipment-rank-display">
        <span class="mastery-with-icon">
          <img src="${imageUrl}" class="mastery-icon"> ${name}
        </span>
        <span class="rank-badge ${rankColorClass}">${rank}</span>
      </div>
    `;
  }

  // Common button configurations
  static getToggleConfigs() {
    return {
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
      // Add more configurations as needed
    };
  }

  // Common input configurations
  static getInputConfigs() {
    return {
      imbue: {
        target: true,
      },
      revive: {
        target: true,
        maxhp: true,
      },
      // Add more configurations as needed
    };
  }
}

// Make available globally
window.CardTemplates = CardTemplates;
