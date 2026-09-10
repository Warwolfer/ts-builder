// Projected result ranges for a queued action.
//
// Mirrors the dice arithmetic in ts-discord-bot's command handlers so the queue
// can show what a roll will land between before you paste it. Every formula
// here is transcribed from a named handler and cites it, because these numbers
// become dice rolls in a live thread — a wrong one is worse than none.
//
// The inputs come from the rendered roll code rather than from state, on
// purpose: the roll code is the string that will actually be sent, so parsing
// it captures the mastery and weapon ranks plus every modifier already spliced
// in (the Lethal/Combat Focus passive, Risky Mode's conversion, and Plan Mode's
// own total) from one source of truth instead of three.
const PlanResult = (function () {
    // ts-discord-bot commands/constants.js RANK_DATA / WEAPON_RANK_DATA — both
    // tables carry the same values.
    const RANK_VALUE = { e: 0, d: 10, c: 15, b: 25, a: 30, s: 40 };

    // A roll code's dice half is everything before the '#'. It holds the rank
    // letters and the signed modifiers; the comment half holds names and tags,
    // which would otherwise contribute stray digits (a thread code, "NG1").
    function diceHalf(text) {
        const hash = text.indexOf("#");
        return hash === -1 ? text : text.slice(0, hash);
    }

    // Rank letters appear as standalone tokens: "?r attack A S +25".
    function ranksIn(dice) {
        const out = [];
        const tokens = dice.split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i].toLowerCase();
            if (t.length === 1 && RANK_VALUE.hasOwnProperty(t)) out.push(RANK_VALUE[t]);
        }
        return out;
    }

    // Signed modifiers: "+25", "+50", "-10". An unsigned number is not a
    // modifier — it would catch dice counts and rank digits.
    function modsIn(dice) {
        let sum = 0;
        const m = dice.match(/[+-]\s*\d+/g) || [];
        for (let i = 0; i < m.length; i++) sum += parseInt(m[i].replace(/\s+/g, ""), 10);
        return sum;
    }

    // The flat addition every roll gets: the rank values plus the modifiers.
    function baseOf(rollText) {
        const dice = diceHalf(String(rollText || ""));
        const ranks = ranksIn(dice);
        let sum = modsIn(dice);
        for (let i = 0; i < ranks.length; i++) sum += ranks[i];
        return { base: sum, ranks: ranks };
    }

    // The mastery rank drives several rank-scaled rules. It is the first rank
    // letter in the dice half, matching how every handler reads args[1].
    function masteryRankLetter(rollText) {
        const dice = diceHalf(String(rollText || ""));
        const tokens = dice.split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i].toLowerCase();
            if (t.length === 1 && RANK_VALUE.hasOwnProperty(t)) return t;
        }
        return "";
    }

    function r(n) { return Math.round(n); }

    // A single d100 plus flat additions, doubled on a natural 100. Shared by
    // attack (basic.js handleAttack), protect and counter, and their Ultra
    // variants (defense.js) — all four use the identical shape.
    function d100Double(base) {
        return {
            min: 1 + base,
            max: 99 + base,
            critMin: (100 + base) * 2,
            critMax: (100 + base) * 2,
        };
    }

    // Exploding dice: n dice of the given size, each high face rolling another.
    // The bot caps the chain at 200 dice, so a true maximum is meaningless —
    // this reports the unexploded span and flags that it can be exceeded.
    // offense.js handleStable (7d20, explode 17+) and handleBurst (12d20 plus
    // MR_BONUS_DICE, explode 16+). Neither applies a crit multiplier.
    function exploding(count, sides, base) {
        return {
            min: count + base,
            max: count * sides + base,
            critMin: null,
            critMax: null,
            exploding: true,
        };
    }

    const BUILDERS = {
        // --- 1d100, ×2 on a nat 100 -------------------------------------------
        attack: d100Double,
        protect: d100Double,
        counter: d100Double,
        "ultra-protect": d100Double,
        "ultra-counter": d100Double,

        // --- offense.js handleSneak -------------------------------------------
        // A success adds a rank bonus, a failure adds a flat 10. The floor is a
        // failed roll and the ceiling a successful one.
        "sneak-attack": function (base, rank) {
            const BONUS = { d: 25, c: 25, b: 30, a: 35, s: 40 };
            const win = BONUS[rank] || 10;
            return {
                min: 1 + 10 + base,
                max: 99 + win + base,
                critMin: (100 + win + base) * 2,
                critMax: (100 + win + base) * 2,
            };
        },

        // --- offense.js handleStable / handleBurst ----------------------------
        "stable-attack": function (base) { return exploding(7, 20, base); },
        "burst-attack": function (base, rank) {
            const BONUS_DICE = { e: 0, d: 0, c: 0, b: 1, a: 1, s: 2 };
            return exploding(12 + (BONUS_DICE[rank] || 0), 20, base);
        },

        // --- offense.js handleCritical ----------------------------------------
        // 2d100 scaled by a multiplier: 1.2 baseline, a rank-scaled 1.5-2.0 when
        // either die shows 85+, ×3 for a 100 (perfect or schrodinger), ×7 for
        // double 100. Non-crit therefore caps at 84+84.
        "critical-attack": function (base, rank) {
            const BY_RANK = { d: 1.5, c: 1.6, b: 1.7, a: 1.8, s: 2 };
            const mult = BY_RANK[rank] || 1.2;
            return {
                min: r((2 + base) * 1.2),
                max: r((168 + base) * 1.2),
                // The reachable crit: either die 85+ and neither a natural 100,
                // so 85+1 through 99+99, scaled by rank.
                critMin: r((86 + base) * mult),
                critMax: r((198 + base) * mult),
                critTiers: [
                    "×3 perfect crit (a 100): " +
                        r((101 + base) * 3) + "-" + r((199 + base) * 3),
                    "×7 star breaker (100, 100): " + r((200 + base) * 7),
                ],
            };
        },

        // --- offense.js handleSharp -------------------------------------------
        // 2d100 keeping the higher die. One 100 doubles; two 100s multiply by 7,
        // which needs Risky Mode's extra dice to be reachable at all.
        "sharp-attack": function (base) {
            return {
                min: 1 + base,
                max: 99 + base,
                critMin: (100 + base) * 2,
                critMax: (100 + base) * 2,
                critTiers: [
                    "×7 two 100s, needs Risky Mode's extra dice: " +
                        (200 + base) * 7 + "+",
                ],
            };
        },

        // --- offense.js handleReckless ----------------------------------------
        // 1d200 plus d100s that scale with the mastery rank: one at E/D/C, two
        // at B/A, and at S one plus a kept-highest pair. Crit runs ×2 to ×7.
        "reckless-attack": function (base, rank) {
            const HUNDREDS = { e: 1, d: 1, c: 1, b: 2, a: 2, s: 2 };
            const n = HUNDREDS[rank] || 1;
            // A single 100 among the d100s is the ordinary crit: the rest of
            // the dice can still be low, so the floor is much lower than the
            // ceiling. x7 wants several 100s at once.
            const critLow = 1 + 100 + (n - 1) + base;
            const critHigh = 200 + n * 100 + base;
            return {
                min: 1 + n + base,
                max: 199 + n * 99 + base,
                critMin: critLow * 2,
                critMax: critHigh * 2,
                critTiers: [
                    "×7 multiple 100s or a natural 200 with one: " +
                        critHigh * 7,
                ],
            };
        },
    };

    // support.js handleHeal / handleBuff and their Power variants: dice plus the
    // flat additions, then divided when the effect is spread across targets.
    // Simulcast and Versatile halve it, AoE thirds it (the toggle is labelled
    // "Multi" on the card but carries the AoE suffix).
    const SUPPORT = {
        heal: { count: 2, sides: 20 },
        "power-heal": { count: 4, sides: 20 },
        buff: { count: 1, sides: 100 },
        "power-buff": { count: 2, sides: 100 },
    };

    function divisorFor(tags) {
        const has = function (t) { return tags.indexOf(t) !== -1; };
        if (has("Simulcast") || has("Versatile")) return 2;
        if (has("AoE")) return 3;
        return 1;
    }

    // Returns null when the action has no roll worth projecting — a passive, a
    // bonus action, or one whose result is not a number (Charge's pool, a
    // narrative effect). The caller renders an em dash for those.
    function forRow(lookup, rollText, tags) {
        if (!lookup || !rollText) return null;
        const parsed = baseOf(rollText);
        const rank = masteryRankLetter(rollText);
        const list = tags || [];

        if (SUPPORT.hasOwnProperty(lookup)) {
            const spec = SUPPORT[lookup];
            const div = divisorFor(list);
            return {
                min: Math.floor((spec.count + parsed.base) / div),
                max: Math.floor((spec.count * spec.sides + parsed.base) / div),
                critMin: null,
                critMax: null,
                divisor: div,
            };
        }

        if (!BUILDERS.hasOwnProperty(lookup)) return null;
        return BUILDERS[lookup](parsed.base, rank);
    }

    // "21-119", or "7-140 ↑" when the dice explode past the stated ceiling.
    function formatRange(res) {
        if (!res) return "";
        const span = res.min === res.max ? String(res.min) : res.min + "-" + res.max;
        return res.exploding ? span + " ↑" : span;
    }

    function formatCrit(res) {
        if (!res || res.critMin == null) return "";
        const span = res.critMin === res.critMax
            ? String(res.critMin)
            : res.critMin + "-" + res.critMax;
        return res.exploding ? span + " ↑" : span;
    }

    return {
        forRow: forRow,
        formatRange: formatRange,
        formatCrit: formatCrit,
        RANK_VALUE: RANK_VALUE,
    };
})();

window.PlanResult = PlanResult;
