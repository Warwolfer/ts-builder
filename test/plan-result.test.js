"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { PlanResult } = load();
const { forRow, formatRange, formatCrit } = PlanResult;

// Every expectation below is derived from a named ts-discord-bot handler, so a
// failure here means either this module or the bot moved.

test("a plain attack with no modifiers spans the non-crit faces of one d100", () => {
    // basic.js handleAttack: 1d100 + MR + WR + mods; a 100 is the crit, so the
    // ordinary range stops at 99. E rank contributes 0.
    const r = forRow("attack", "?r attack E E # Lune", []);
    assert.strictEqual(formatRange(r), "1-99");
});

test("a modifier shifts both ends of the range and the crit with it", () => {
    // The worked example: +20 gives 21-119, and a crit is (100+20)x2 = 240.
    const r = forRow("attack", "?r attack E E +20 # Lune", []);
    assert.strictEqual(formatRange(r), "21-119");
    assert.strictEqual(formatCrit(r), "240");
});

test("rank letters in the roll code are read as their values", () => {
    // A=30, S=40, plus a +25 modifier = 95 flat.
    const r = forRow("attack", "?r attack A S +25 # Lune", []);
    assert.strictEqual(formatRange(r), "96-194");
    assert.strictEqual(formatCrit(r), "390");
});

test("only the dice half of the roll code contributes", () => {
    // The comment half carries a thread code and an NG tag; neither is a
    // modifier, and picking them up would inflate every projection.
    const withComment = forRow("attack", "?r attack E E +20 # Lune · NG1 · 2768", []);
    assert.strictEqual(formatRange(withComment), "21-119");
});

test("an unsigned number is not treated as a modifier", () => {
    // Only signed tokens are modifiers, so a bare number in the comment or a
    // dice count cannot leak into the total.
    assert.strictEqual(formatRange(forRow("attack", "?r attack E E # 100", [])), "1-99");
});

test("protect, counter and the Ultra variants share the attack shape", () => {
    // defense.js handleProtect/handleCounter/handleUltraProtect/handleUltraCounter
    // are all 1d100 + MR + WR + mods, doubled on a natural 100.
    for (const lookup of ["protect", "counter", "ultra-protect", "ultra-counter"]) {
        const r = forRow(lookup, "?r x E E +20 # Lune", []);
        assert.strictEqual(formatRange(r), "21-119", lookup);
        assert.strictEqual(formatCrit(r), "240", lookup);
    }
});

test("exploding-dice attacks report the unexploded span and say so", () => {
    // offense.js handleStable is 7d20 exploding on 17+, capped at 200 dice, so a
    // true maximum is meaningless. Neither Stable nor Burst applies a crit
    // multiplier, so they have no crit figure at all.
    const stable = forRow("stable-attack", "?r stable E E # Lune", []);
    assert.strictEqual(formatRange(stable), "7-140 ↑");
    assert.strictEqual(formatCrit(stable), "");
    assert.strictEqual(stable.exploding, true);
});

test("Burst gains dice with mastery rank", () => {
    // MR_BONUS_DICE: none below B, one at B/A, two at S — on top of 12d20.
    // Assert the dice count rather than the printed span, since the rank letter
    // that selects the bonus die also contributes its own value to the base.
    const dice = (code) => {
        const r = forRow("burst-attack", code, []);
        return (r.max - r.min) / 19; // (20n + base) - (n + base) = 19n
    };
    assert.strictEqual(dice("?r burst E E # x"), 12);
    assert.strictEqual(dice("?r burst B E # x"), 13);
    assert.strictEqual(dice("?r burst S E # x"), 14);
    // And at E rank, where the base is 0, the span is the raw dice range.
    assert.strictEqual(formatRange(forRow("burst-attack", "?r burst E E # x", [])), "12-240 ↑");
});

test("Sneak Attack's floor is a failed roll and its ceiling a successful one", () => {
    // offense.js handleSneak: a success adds a rank bonus, a failure a flat 10.
    // At S the bonus is 40, so 1+10 through 99+40.
    const r = forRow("sneak-attack", "?r sneak S E # x", []);
    assert.strictEqual(formatRange(r), "51-179");
});

test("Critical Attack shows the reachable crit inline, not the star breaker", () => {
    // offense.js handleCritical: x1.2 baseline, a rank-scaled 1.5-2.0 on any
    // 85+, x3 for a 100, x7 for double 100. Non-crit caps at 84+84. Inline we
    // show only the 85+ tier, which is the crit you actually hit - a x7 ceiling
    // that needs double 100s made every crit look inflated.
    const r = forRow("critical-attack", "?r critical S S # x", []);
    assert.strictEqual(r.min, Math.round((2 + 80) * 1.2));
    assert.strictEqual(r.max, Math.round((168 + 80) * 1.2));
    assert.strictEqual(r.critMin, Math.round((86 + 80) * 2));
    assert.strictEqual(r.critMax, Math.round((198 + 80) * 2));
    assert.ok(formatCrit(r).includes("-"), "the 85+ tier is itself a range");
    // The rarer tiers move to the tooltip rather than being dropped.
    assert.strictEqual(r.critTiers.length, 2);
    assert.match(r.critTiers.join(" "), /perfect crit/);
    assert.match(r.critTiers.join(" "), /star breaker/);
    assert.ok(
        r.critTiers.join(" ").includes(String(Math.round((200 + 80) * 7))),
        "the star breaker figure is still reported, just not inline",
    );
});

test("Sharp Attack's inline crit is the single-100 double", () => {
    // offense.js handleSharp: 2d100kh1, one 100 doubles. Two 100s multiply by
    // 7, but the dropped die never counts toward a crit, so a second 100 can
    // only come from Risky Mode's extra dice - tooltip, not inline.
    const r = forRow("sharp-attack", "?r sharp E E # x", []);
    assert.strictEqual(formatRange(r), "1-99");
    assert.strictEqual(formatCrit(r), "200");
    assert.match(r.critTiers.join(" "), /Risky Mode/);
});

test("the inline crit never exceeds the tooltip tiers", () => {
    // The whole point of moving them: what shows inline must be the reachable
    // crit, with the extremes reported separately rather than inflating it.
    for (const [lookup, code] of [
        ["critical-attack", "?r critical S S # x"],
        ["sharp-attack", "?r sharp A B # x"],
        ["reckless-attack", "?r reckless S S +25 # x"],
    ]) {
        const r = forRow(lookup, code, []);
        assert.ok(r.critTiers && r.critTiers.length, lookup + " should report its tiers");
        const biggest = Math.max.apply(
            null,
            r.critTiers.join(" ").match(/\d+/g).map(Number),
        );
        assert.ok(
            r.critMax < biggest,
            lookup + ": inline crit " + r.critMax + " should be below the tier max " + biggest,
        );
    }
});

test("Reckless Attack's dice count follows mastery rank", () => {
    // offense.js handleReckless: 1d200 plus one d100 at E/D/C and two at B/A/S.
    const low = forRow("reckless-attack", "?r reckless C E # x", []);
    const high = forRow("reckless-attack", "?r reckless S E # x", []);
    assert.strictEqual(low.max, 199 + 99 + 15);
    assert.strictEqual(high.max, 199 + 198 + 40);
    assert.ok(high.max > low.max, "more dice must widen the range");
    // A single 100 with everything else low is the ordinary crit, so its floor
    // sits far below its ceiling.
    assert.ok(high.critMin < high.critMax, "reckless crit is a range");
});

test("support actions divide by their active spread toggle", () => {
    // support.js handleHeal: Simulcast and Versatile halve the total, AoE thirds
    // it. The card labels the AoE toggle "Multi", but the suffix is what the
    // engine and the roll code carry.
    const solo = forRow("heal", "?r heal E E # x", []);
    const multi = forRow("heal", "?r heal E E # x", ["AoE"]);
    const versatile = forRow("heal", "?r heal E E # x", ["Versatile"]);
    assert.strictEqual(solo.max, 40);
    assert.strictEqual(multi.max, Math.floor(40 / 3));
    assert.strictEqual(versatile.max, Math.floor(40 / 2));
    assert.strictEqual(multi.divisor, 3);
});

test("support actions have no crit figure", () => {
    assert.strictEqual(formatCrit(forRow("buff", "?r buff E E # x", [])), "");
});

test("an action with no projectable roll returns null", () => {
    // Torment, Evolve, the save and check cards: either no dice or a result
    // that is not a number. The renderer shows a dash for these.
    for (const lookup of ["torment", "evolve", "duelist", "@save", "not-an-action"]) {
        assert.strictEqual(forRow(lookup, "?r x A # y", []), null, lookup);
    }
});

test("a missing or empty roll code returns null rather than throwing", () => {
    assert.strictEqual(forRow("attack", "", []), null);
    assert.strictEqual(forRow("attack", null, []), null);
    assert.strictEqual(forRow(null, "?r attack A S # x", []), null);
});

test("formatters tolerate a null result", () => {
    assert.strictEqual(formatRange(null), "");
    assert.strictEqual(formatCrit(null), "");
});
