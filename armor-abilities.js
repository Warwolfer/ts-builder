const armorAbilities = {
  heavy: {
    E: "No ability",
    D: "Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
    C: "Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
    B: "Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
    A: "Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
    S: "Immortal. Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal."
  },
  medium: {
    E: "No ability",
    D: "Twice. Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
    C: "Twice. Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
    B: "Twice. Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
    A: "Twice. Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
    S: "Twice. Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action."
  },
  light: {
    E: "No ability",
    D: "Surge. Once per thread, gain 60 to an attack, buff, or heal.",
    C: "Surge. Once per thread, gain 80 to an attack, buff, or heal.",
    B: "Surge. Once per thread, gain 100 to an attack, buff, or heal.",
    A: "Surge. Once per thread, gain 120 to an attack, buff, or heal.",
    S: "Surge. Once per thread, gain 140 to an attack, buff, or heal."
  }
};

// Make available globally
window.armorAbilities = armorAbilities;