const armorAbilitiesV2 = {
  heavy: {
    E: { name: "No ability", description: "", rollCode: "" },
    D: {
      name: "Immortal",
      description:
        "Free Action: Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal D # Character Name · <span class='thrcode'>Code</span>",
    },
    C: {
      name: "Immortal",
      description:
        "Free Action: Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal C # Character Name · <span class='thrcode'>Code</span>",
    },
    B: {
      name: "Immortal",
      description:
        "Free Action: Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal B # Character Name · <span class='thrcode'>Code</span>",
    },
    A: {
      name: "Immortal",
      description:
        "Free Action: Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal A # Character Name · <span class='thrcode'>Code</span>",
    },
    S: {
      name: "Immortal",
      description:
        "Free Action: Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal S # Character Name · <span class='thrcode'>Code</span>",
    },
  },
  medium: {
    E: { name: "No ability", description: "", rollCode: "" },
    D: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice D # Character Name · <span class='thrcode'>Code</span>",
    },
    C: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice C # Character Name · <span class='thrcode'>Code</span>",
    },
    B: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice B # Character Name · <span class='thrcode'>Code</span>",
    },
    A: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice A # Character Name · <span class='thrcode'>Code</span>",
    },
    S: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice S # Character Name · <span class='thrcode'>Code</span>",
    },
  },
  light: {
    E: { name: "No ability", description: "", rollCode: "" },
    D: {
      name: "Surge",
      description:
        "Free Action: Surge. Once per thread, gain 60 to an attack, buff, or heal.",
      rollCode:
        "?r surge D # Character Name · <span class='thrcode'>Code</span>",
    },
    C: {
      name: "Surge",
      description:
        "Free Action: Surge. Once per thread, gain 80 to an attack, buff, or heal.",
      rollCode:
        "?r surge C # Character Name · <span class='thrcode'>Code</span>",
    },
    B: {
      name: "Surge",
      description:
        "Free Action: Surge. Once per thread, gain 100 to an attack, buff, or heal.",
      rollCode:
        "?r surge B # Character Name · <span class='thrcode'>Code</span>",
    },
    A: {
      name: "Surge",
      description:
        "Free Action: Surge. Once per thread, gain 120 to an attack, buff, or heal.",
      rollCode:
        "?r surge A # Character Name · <span class='thrcode'>Code</span>",
    },
    S: {
      name: "Surge",
      description:
        "Free Action: Surge. Once per thread, gain 140 to an attack, buff, or heal.",
      rollCode:
        "?r surge S # Character Name · <span class='thrcode'>Code</span>",
    },
  },
};

// Make available globally
window.armorAbilitiesV2 = armorAbilitiesV2;
