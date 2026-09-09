// Buffs that Plan Mode can compute ahead of the roll.
//
// Every value is copied from ts-discord-bot, which owns the authoritative rank
// tables; the bot itself never applies one buff to a later roll (see
// getPassiveModifiers in helpers.js, "Does NOT calculate bonuses"). Each entry
// cites its source so test/plan-buffs.test.js can pin the two together.
//
// Fields:
//   requiresTag  buff exists only while that toggle is active on the card
//   rankFrom     "clicked" (the mastery chosen on the card) or a fixed lookup
//   values       rank map, lowercase keys
//   appliesTo    family names from resource/action-families.js
//   duration     "once" | "persistent" | { charges: <rank map> }
//   target       "self" | "other" — the default state of targetSelf
//   selfToggle   render a Self checkbox on the producing row
//   stackable    default true; false keeps only the highest of its kind
//   requiresMasteryMatch  consumer must use the same mastery as the producer
const PlanBuffs = (function () {
    const table = {
        evolve: {
            label: "Evolve",
            // The Evolve card's roll code carries the Metamorph rank, not the
            // rank of the mastery being evolved.
            rankFrom: "metamorph",
            values: { e: 0, d: 10, c: 10, b: 15, a: 15, s: 20 },
            appliesTo: ["mainAction"],
            requiresMasteryMatch: true,
            duration: "persistent",
            target: "self",
            source: "ts-discord-bot alter.js:740 EVOLVE_BONUS",
        },
        duelist: {
            label: "Duelist · Challenge",
            requiresTag: "Challenge",
            rankFrom: "clicked",
            // DUEL_DMG doubled: Challenge turns the passive into a modifier.
            values: { e: 0, d: 30, c: 30, b: 40, a: 40, s: 50 },
            appliesTo: ["attack"],
            duration: "once",
            target: "self",
            source: "ts-discord-bot offense.js:1029 DUEL_DMG, doubled by Challenge",
        },
        mark: {
            label: "Mark",
            rankFrom: "clicked",
            values: { e: 0, d: 10, c: 15, b: 20, a: 25, s: 30 },
            appliesTo: ["attack"],
            // "(S) Upgrade: 2 to 3 attacks" per the actions.js description.
            // The bot's embed hardcodes "next 2 attacks" in its display string
            // even at S; that is prose, not a computed value, so the rules text
            // wins. Do not "fix" this to match the bot.
            duration: { charges: { e: 0, d: 2, c: 2, b: 2, a: 2, s: 3 } },
            target: "self",
            // Normally you attack what you marked, so this starts checked.
            // Uncheck it when another Hyper Sense user spent the charges first.
            selfToggle: true,
            source: "ts-discord-bot alter.js:444 MARK_BONUS",
        },
        exceed: {
            label: "Exceed",
            rankFrom: "clicked",
            values: { e: 5, d: 10, c: 15, b: 20, a: 25, s: 30 },
            appliesTo: ["mainAction"],
            duration: "persistent",
            target: "self",
            source: "ts-discord-bot alter.js:317 EXCEED_BONUS",
        },
        coordinate: {
            label: "Coordinate",
            rankFrom: "clicked",
            values: { e: 0, d: 5, c: 10, b: 15, a: 20, s: 25 },
            appliesTo: ["mainAction"],
            duration: "once",
            target: "other",
            selfToggle: true,
            source: "ts-discord-bot alter.js:778 COORDINATE_BONUS",
        },
        assist: {
            label: "Assist · Assign",
            // No requiresTag: the bot's handleAssist parses no triggers, so
            // "?r assist <MR>" always grants the Assign bonus, and the card
            // correctly renders no toggle.
            rankFrom: "clicked",
            values: { e: 0, d: 5, c: 5, b: 10, a: 10, s: 15 },
            appliesTo: ["masteryCheck"],
            duration: "once",
            target: "other",
            selfToggle: true,
            source: "ts-discord-bot alter.js:814 ASSIST_BONUS",
        },
        adapt: {
            label: "Adapt · Fend",
            requiresTag: "Fend",
            rankFrom: "clicked",
            values: { e: 0, d: 10, c: 10, b: 15, a: 15, s: 20 },
            appliesTo: ["save"],
            duration: "once",
            target: "self",
            source: "ts-discord-bot alter.js:681 FEND_BONUS",
        },
    };

    function rankKey(rankLetter) {
        return String(rankLetter || "").trim().toLowerCase();
    }

    // The buff's value at a rank. Unknown or missing ranks pay out nothing
    // rather than NaN, so a malformed row can never poison a total.
    function valueFor(entry, rankLetter) {
        if (!entry || !entry.values) return 0;
        const v = entry.values[rankKey(rankLetter)];
        return typeof v === "number" ? v : 0;
    }

    // How many uses a charge-based buff has at a rank, or null if it is not
    // charge-based.
    function chargesFor(entry, rankLetter) {
        if (!entry || !entry.duration || typeof entry.duration !== "object") return null;
        const charges = entry.duration.charges;
        if (!charges) return null;
        const n = charges[rankKey(rankLetter)];
        return typeof n === "number" ? n : 0;
    }

    return { table: table, valueFor: valueFor, chargesFor: chargesFor };
})();

window.PlanBuffs = PlanBuffs;
