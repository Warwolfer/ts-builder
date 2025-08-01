const masteriesV2 = [
  // Defense Masteries
  {
    lookup: "aeromancy",
    name: "Aeromancy",
    color: "#48d1c3",
    image: "https://terrarp.com/db/mastery/w-aeromancy.png",
    primaryRole: "defense",
    secondaryRole: "offense",
    save: "reflex",
    breakType: "elemental",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"]
  },
  {
    lookup: "arcanamancy",
    name: "Arcanamancy",
    color: "#50cbe3",
    image: "https://terrarp.com/db/mastery/w-arcanamancy.png",
    primaryRole: "defense",
    secondaryRole: "offense",
    save: "will",
    breakType: "construct",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"]  },
  {
    lookup: "beast-arts",
    name: "Beast Arts",
    color: "#db7233",
    image: "https://terrarp.com/db/mastery/w-beast.png",
    primaryRole: "defense",
    secondaryRole: "offense",
    save: "reflex",
    breakType: "order",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"]  },
  {
    lookup: "chronomancy",
    name: "Chronomancy",
    color: "#ec4a97",
    image: "https://terrarp.com/db/mastery/w-chronomancy.png",
    primaryRole: "defense",
    secondaryRole: "support",
    save: "reflex",
    breakType: "construct",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"]  },
  {
    lookup: "cryomancy",
    name: "Cryomancy",
    color: "#5fcadb",
    image: "https://terrarp.com/db/mastery/w-cryomancy.png",
    primaryRole: "defense",
    secondaryRole: "offense",
    save: "fortitude",
    breakType: "elemental",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"]  },
  {
    lookup: "geomancy",
    name: "Geomancy",
    color: "#a76a36",
    image: "https://terrarp.com/db/mastery/w-geomancy.png",
    primaryRole: "defense",
    secondaryRole: "offense",
    save: "fortitude",
    breakType: "elemental",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"],
  },
  {
    lookup: "guard-arts",
    name: "Guard Arts",
    color: "#f2bb36",
    image: "https://terrarp.com/db/mastery/w-guard.png",
    primaryRole: "defense",
    secondaryRole: "support",
    save: "fortitude",
    breakType: "physical",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"],
  },
  {
    lookup: "hemomancy",
    name: "Hemomancy",
    color: "#c32222",
    image: "https://terrarp.com/db/mastery/w-hemomancy.png",
    primaryRole: "defense",
    secondaryRole: "support",
    save: "fortitude",
    breakType: "dark",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"],
  },
  {
    lookup: "illusion-magic",
    name: "Illusion Magic",
    color: "#ea5694",
    image: "https://terrarp.com/db/mastery/w-illusion.png",
    primaryRole: "defense",
    secondaryRole: "offense",
    save: "will",
    breakType: "construct",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"],
  },
  {
    lookup: "spellbane",
    name: "Spellbane",
    color: "#8b4c99",
    image: "https://terrarp.com/db/mastery/w-spellbane.png",
    primaryRole: "defense",
    secondaryRole: "offense",
    save: "will",
    breakType: "dark",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload"]  },

  // Offense Masteries
  {
    lookup: "astramancy",
    name: "Astramancy",
    color: "#ae43c3",
    image: "https://terrarp.com/db/mastery/w-astramancy.png",
    primaryRole: "offense",
    secondaryRole: "defense",
    save: "will",
    breakType: "dark",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },
  {
    lookup: "dark-magic",
    name: "Dark Magic",
    color: "#883cca",
    image: "https://terrarp.com/db/mastery/w-dark.png",
    primaryRole: "offense",
    secondaryRole: "support",
    save: "will",
    breakType: "dark",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },
  {
    lookup: "electromancy",
    name: "Electromancy",
    color: "#ecda2c",
    image: "https://terrarp.com/db/mastery/w-electromancy.png",
    primaryRole: "offense",
    secondaryRole: "defense",
    save: "reflex",
    breakType: "elemental",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },
  {
    lookup: "power",
    name: "Power",
    color: "#ce5e32",
    image: "https://terrarp.com/db/mastery/w-power.png",
    primaryRole: "offense",
    secondaryRole: "defense",
    save: "fortitude",
    breakType: "physical",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },
  {
    lookup: "precision",
    name: "Precision",
    color: "#46bcc8",
    image: "https://terrarp.com/db/mastery/w-precision.png",
    primaryRole: "offense",
    secondaryRole: "support",
    save: "reflex",
    breakType: "physical",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"]  },
  {
    lookup: "pyromancy",
    name: "Pyromancy",
    color: "#cb3739",
    image: "https://terrarp.com/db/mastery/w-pyromancy.png",
    primaryRole: "offense",
    secondaryRole: "defense",
    save: "will",
    breakType: "elemental",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },
  {
    lookup: "ranged",
    name: "Ranged",
    color: "#77b933",
    image: "https://terrarp.com/db/mastery/w-ranged.png",
    primaryRole: "offense",
    secondaryRole: "defense",
    save: "reflex",
    breakType: "physical",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },
  {
    lookup: "speed",
    name: "Speed",
    color: "#4263cb",
    image: "https://terrarp.com/db/mastery/w-speed.png",
    primaryRole: "offense",
    secondaryRole: "defense",
    save: "reflex",
    breakType: "physical",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },
  {
    lookup: "subterfuge",
    name: "Subterfuge",
    color: "#383838",
    image: "https://terrarp.com/db/mastery/w-subterfuge.png",
    primaryRole: "offense",
    secondaryRole: "support",
    save: "reflex",
    breakType: "physical",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"]  },
  {
    lookup: "unarmed",
    name: "Unarmed",
    color: "#c9c9c9",
    image: "https://terrarp.com/db/mastery/w-unarmed.png",
    primaryRole: "offense",
    secondaryRole: "defense",
    save: "fortitude",
    breakType: "physical",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive"],
  },

  // Support Masteries
  {
    lookup: "alchemy",
    name: "Alchemy",
    color: "#53b159",
    image: "https://terrarp.com/db/mastery/w-alchemy.png",
    primaryRole: "support",
    secondaryRole: "offense",
    save: "fortitude",
    breakType: "construct",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "animancy",
    name: "Animancy",
    color: "#6c319d",
    image: "https://terrarp.com/db/mastery/w-animancy.png",
    primaryRole: "support",
    secondaryRole: "defense",
    save: "fortitude",
    breakType: "dark",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "divine-magic",
    name: "Divine Magic",
    color: "#edb82a",
    image: "https://terrarp.com/db/mastery/w-divine.png",
    primaryRole: "support",
    secondaryRole: "offense",
    save: "will",
    breakType: "order",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "harmonic-magic",
    name: "Harmonic Magic",
    color: "#36a5e8",
    image: "https://terrarp.com/db/mastery/w-harmonic.png",
    primaryRole: "support",
    secondaryRole: "offense",
    save: "fortitude",
    breakType: "order",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "hydromancy",
    name: "Hydromancy",
    color: "#66b8ea",
    image: "https://terrarp.com/db/mastery/w-hydromancy.png",
    primaryRole: "support",
    secondaryRole: "defense",
    save: "will",
    breakType: "elemental",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "magitech",
    name: "Magitech",
    color: "#5c6779",
    image: "https://terrarp.com/db/mastery/w-magitech.png",
    primaryRole: "support",
    secondaryRole: "offense",
    save: "will",
    breakType: "dark",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"]  },
  {
    lookup: "nature-magic",
    name: "Nature Magic",
    color: "#91c023",
    image: "https://terrarp.com/db/mastery/w-nature.png",
    primaryRole: "support",
    secondaryRole: "defense",
    save: "reflex",
    breakType: "order",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "spirit-magic",
    name: "Spirit Magic",
    color: "#50c8cb",
    image: "https://terrarp.com/db/mastery/w-spirit.png",
    primaryRole: "support",
    secondaryRole: "offense",
    save: "will",
    breakType: "order",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "tinker",
    name: "Tinker",
    color: "#9c7c45",
    image: "https://terrarp.com/db/mastery/w-tinker2.png",
    primaryRole: "support",
    secondaryRole: "defense",
    save: "reflex",
    breakType: "construct",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"],
  },
  {
    lookup: "war-arts",
    name: "War Arts",
    color: "#8b4c3c",
    image: "https://terrarp.com/db/mastery/w-war-arts.png",
    primaryRole: "support",
    secondaryRole: "defense",
    save: "fortitude",
    breakType: "order",
    actions: ["Normal Attack", "Recover", "Rush", "Healthy", "Alert", "Mobile", "Auto Assist", "Consistent", "Risky", "Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload"]  },

  // Alter Masteries
  {
    lookup: "aura",
    name: "Aura",
    color: "#e0b439",
    image: "https://terrarp.com/db/mastery/w-aura.png",
    primaryRole: "alter",
    secondaryRole: "defense",
    save: null,
    breakType: "tank/support",
    actions: ["Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload", "defense", "Guardian", "Savior"],
  },
  {
    lookup: "battle-spirits",
    name: "Battle Spirits",
    color: "#b72c2c",
    image: "https://terrarp.com/db/mastery/w-battle-spirits.png",
    primaryRole: "alter",
    secondaryRole: "offense",
    save: null,
    breakType: "dps",
    actions: ["Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive", "Damage", "Speed", "Berserk"],
  },
  {
    lookup: "corrupt",
    name: "Corrupt",
    color: "#813090",
    image: "https://terrarp.com/db/mastery/w-corrupt.png",
    primaryRole: "alter",
    secondaryRole: "versatile",
    save: null,
    breakType: "dps/support",
    actions: ["Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive", "Damage", "support", "Corruption"],
  },
  {
    lookup: "dynamism",
    name: "Dynamism",
    color: "#87ad3d",
    image: "https://terrarp.com/db/mastery/w-dynamism.png",
    primaryRole: "alter",
    secondaryRole: "offense",
    save: null,
    breakType: "dps/utility",
    actions: ["Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive", "Speed", "Rover", "Momentum"],
  },
  {
    lookup: "evoke",
    name: "Evoke",
    color: "#50c8cb",
    image: "https://terrarp.com/db/mastery/w-evoke.png",
    primaryRole: "alter",
    secondaryRole: "versatile",
    save: null,
    breakType: "dps/support",
    actions: ["Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive", "Damage", "Extension", "Exceed"],
  },
  {
    lookup: "hyper-sense",
    name: "Hyper Sense",
    color: "#40883a",
    image: "https://terrarp.com/db/mastery/w-hyper-sense.png",
    primaryRole: "alter",
    secondaryRole: "offense",
    save: null,
    breakType: "amplifier",
    actions: ["Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload", "defense", "Extension", "Hyper Awareness"],
  },
  {
    lookup: "mend",
    name: "Mend",
    color: "#2f8cc1",
    image: "https://terrarp.com/db/mastery/w-mend.png",
    primaryRole: "alter",
    secondaryRole: "support",
    save: null,
    breakType: "support/tank",
    actions: ["Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload", "support", "Infuse", "Regeneration"],
  },
  {
    lookup: "metamorph",
    name: "Metamorph",
    color: "#cc4e71",
    image: "https://terrarp.com/db/mastery/w-metamorph.png",
    primaryRole: "alter",
    secondaryRole: "defense",
    save: null,
    breakType: "tank/utility",
    actions: ["Protect", "Ultra Protect", "Counter", "Ultra Counter", "Hinder", "Ultra Hinder", "Taunt", "Torment", "Alter Hinder", "Disruptive", "Shield", "Overload", "Damage", "defense", "Maneuver"],
  },
  {
    lookup: "summon",
    name: "Summon",
    color: "#4a4da5",
    image: "https://terrarp.com/db/mastery/w-summon.png",
    primaryRole: "alter",
    secondaryRole: "versatile",
    save: null,
    breakType: "amplifier/utility",
    actions: ["Heal", "Power Heal", "Buff", "Power Buff", "Inspire", "Haste", "Revive", "versatile", "Overheal", "Cure", "Boost", "Overload", "support", "Extension", "Coordinate"],
  },
  {
    lookup: "weapon-arts",
    name: "Weapon Arts",
    color: "#cb5050",
    image: "https://terrarp.com/db/mastery/w-weapon-arts.png",
    primaryRole: "alter",
    secondaryRole: "offense",
    save: null,
    breakType: "dps/amplifier",
    actions: ["Stable Attack", "Burst Attack", "Sharp Attack", "Multi Attack", "Sneak Attack", "Critical Attack", "Wild Attack", "Reckless Attack", "Duelist", "Sharpshooter", "Overload", "Area Effect", "Disruptive", "Damage", "support", "Charge"],
  }
];

// Make available globally
window.masteriesV2 = masteriesV2;
