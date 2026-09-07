// Per-action toggle buttons and custom inputs shown under an action card.
//
// Static data, kept out of the renderer so it is allocated once instead of per
// card, and so it can be read without a DOM (see test/risky-mode.test.js).

// Reckless Attack and Sharp Attack both have the Risky free action, which
// converts other bonuses into extra dice and modifiers. `beforeThreadCode`
// marks Risky Mode as a rules tag: it belongs with the Lethal/NG1 tags in
// front of the thread code, not appended after it like a per-roll flag.
const RISKY_TOGGLE = [
    {
        text: "Risky",
        onclick: "toggleRisky",
        suffix: "Risky Mode",
        beforeThreadCode: true,
        hasInput: true,
        inputPlaceholder: "Extra Mods",
        updateFunction: "updateRiskyMod",
    },
];

// Buttons, keyed by action lookup.
const actionToggleButtons = {
    "reckless-attack": RISKY_TOGGLE,
    "sharp-attack": RISKY_TOGGLE,
    "ultra-counter": [
        {
            text: "Melee",
            onclick: "toggleMelee",
            suffix: "Melee",
        },
    ],
    "area-effect": [
        {
            text: "Splash",
            onclick: "toggleSplash",
            suffix: "Splash",
        },
    ],
    range: [
        {
            text: "Extend",
            onclick: "toggleExtend",
            suffix: "Extend",
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
            text: "Multi",
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
            text: "Multi",
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
            text: "Multi",
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
            text: "Multi",
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
            text: "Power",
            onclick: "togglePowerRegenerate",
            suffix: "Power",
        },
    ],
    "hyper-instinct": [
        {
            text: "Ultra",
            onclick: "toggleUltraInstinct",
            suffix: "Ultra",
        },
    ],
    "hyper-insight": [
        {
            text: "Ultra",
            onclick: "toggleUltraInsight",
            suffix: "Ultra",
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
            text: "Amplify",
            onclick: "toggleAmplifyAura",
            suffix: "Amplify",
        },
    ],
    savior: [
        {
            text: "Share",
            onclick: "toggleShareAura",
            suffix: "Share",
        },
    ],
    "follow-up": [],
    charge: [
        {
            text: "Charging",
            onclick: "toggleCharging",
            suffix: "Charging",
            mutuallyExclusive: ["Release"],
        },
        {
            text: "Release",
            onclick: "toggleRelease",
            suffix: "Release",
            hasInput: true,
            inputPlaceholder: "Charge Value",
            updateFunction: "updateReleaseSuffix",
            mutuallyExclusive: ["Charging"],
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
    torment: [
        {
            text: "Ultra",
            onclick: "toggleUltra",
            suffix: "Ultra",
            mutuallyExclusive: ["Radial"],
        },
        {
            text: "Radial",
            onclick: "toggleRadial",
            suffix: "Radial",
            mutuallyExclusive: ["Ultra"],
        },
    ],
    defile: [
        {
            text: "Ally",
            onclick: "toggleAlly",
            suffix: "Ally",
            mutuallyExclusive: ["Enemy"],
        },
        {
            text: "Enemy",
            onclick: "toggleEnemy",
            suffix: "Enemy",
            mutuallyExclusive: ["Ally"],
        },
        {
            text: "Vilify",
            onclick: "toggleVilify",
            suffix: "Vilify",
        },
    ],
    vitiate: [
        {
            text: "Amplify",
            onclick: "toggleAmplify",
            suffix: "Amplify",
            mutuallyExclusive: ["Radial"],
        },
        {
            text: "Radial",
            onclick: "toggleRadialVitiate",
            suffix: "Radial",
            mutuallyExclusive: ["Amplify"],
        },
    ],
    duelist: [
        {
            text: "Challenge",
            onclick: "toggleChallenge",
            suffix: "Challenge",
        },
    ],
    sharpshooter: [
        {
            text: "Snipe",
            onclick: "toggleSnipe",
            suffix: "Snipe",
        },
    ],
    acrimony: [
        {
            text: "Meliorate",
            onclick: "toggleMeliorate",
            suffix: "Meliorate",
        },
    ],
    locomote: [
        {
            text: "Switch",
            onclick: "toggleSwitch",
            suffix: "Switch",
        },
    ],
    profane: [
        {
            text: "Apostasy",
            onclick: "toggleApostasy",
            suffix: "Apostasy",
        },
    ],
    rover: [
        {
            text: "Rove",
            onclick: "toggleRove",
            suffix: "Rove",
        },
    ],
    gift: [
        {
            text: "Ultra",
            onclick: "toggleUltraGift",
            suffix: "Ultra",
        },
    ],
    cleanse: [
        {
            text: "Cure",
            onclick: "toggleCure",
            suffix: "Cure",
        },
    ],
    overdrive: [],
};

// Always-visible inputs, keyed by action lookup.
const actionToggleInputs = {
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
    momentum: {
        speed: true,
    },
    acceleration: {
        speed: true,
    },
    locomote: {
        target: true,
    },
};

window.actionToggleButtons = actionToggleButtons;
window.actionToggleInputs = actionToggleInputs;
