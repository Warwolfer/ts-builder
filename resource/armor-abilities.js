const armorAbilities = {
  heavy: {
    E: { name: "No ability", description: "", rollCode: "" },
    D: {
      name: "Immortal",
      description:
        "Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal D # Character Name | <span class='thrcode'>Code</span>",
    },
    C: {
      name: "Immortal",
      description:
        "Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal C # Character Name | <span class='thrcode'>Code</span>",
    },
    B: {
      name: "Immortal",
      description:
        "Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal B # Character Name | <span class='thrcode'>Code</span>",
    },
    A: {
      name: "Immortal",
      description:
        "Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal A # Character Name | <span class='thrcode'>Code</span>",
    },
    S: {
      name: "Immortal",
      description:
        "Once per thread before you take damage, restore to full health. If your health reaches zero after the damage calculation, die as normal.",
      rollCode:
        "?r immortal S # Character Name | <span class='thrcode'>Code</span>",
    },
  },
  medium: {
    E: { name: "No ability", description: "", rollCode: "" },
    D: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice D # Character Name | <span class='thrcode'>Code</span>",
    },
    C: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice C # Character Name | <span class='thrcode'>Code</span>",
    },
    B: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice B # Character Name | <span class='thrcode'>Code</span>",
    },
    A: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice A # Character Name | <span class='thrcode'>Code</span>",
    },
    S: {
      name: "Twice",
      description:
        "Once per thread, you may use a second main action on your play sheet. This action must be from a different role and cannot be a Special Action.",
      rollCode:
        "?r twice S # Character Name | <span class='thrcode'>Code</span>",
    },
  },
  light: {
    E: { name: "No ability", description: "", rollCode: "" },
    D: {
      name: "Surge",
      description:
        "Once per thread after rolling, you may add <b>60 </b>to any Xd20 or Xd100 rolls, add<b>4 </b> to haste, add<b>12 </b>to inspire, or revive <b> 2 </b>dead allies.",
      rollCode:
        "?r surge D # Character Name | <span class='thrcode'>Code</span>",
    },
    C: {
      name: "Surge",
      description:
        "Once per thread after rolling, you may add <b>80 </b>to any Xd20 or Xd100 rolls, add<b>5 </b> to haste, add<b>16 </b>to inspire, or revive <b> 2 </b>dead allies.",
      rollCode:
        "?r surge C # Character Name | <span class='thrcode'>Code</span>",
    },
    B: {
      name: "Surge",
      description:
        "Once per thread after rolling, you may add <b>100 </b>to any Xd20 or Xd100 rolls, add<b>6 </b> to haste, add<b>20 </b>to inspire, or revive <b> 3 </b>dead allies.",
      rollCode:
        "?r surge B # Character Name | <span class='thrcode'>Code</span>",
    },
    A: {
      name: "Surge",
      description:
        "Once per thread after rolling, you may add <b>120 </b>to any Xd20 or Xd100 rolls, add<b>7 </b> to haste, add<b>24 </b>to inspire, or revive <b> 3 </b>dead allies.",
      rollCode:
        "?r surge A # Character Name | <span class='thrcode'>Code</span>",
    },
    S: {
      name: "Surge",
      description:
        "Once per thread after rolling, you may add <b>140 </b>to any Xd20 or Xd100 rolls, add<b>8 </b> to haste, add<b>28 </b>to inspire, or revive <b> 4 </b>dead allies.",
      rollCode:
        "?r surge S # Character Name | <span class='thrcode'>Code</span>",
    },
  },
};

// Make available globally
window.armorAbilities = armorAbilities;
