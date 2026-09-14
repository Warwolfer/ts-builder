"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { PlanResult } = load();
const { forRow, formatRange, formatCrit, formatCritChance } = PlanResult;

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
    // At S the bonus is 40, so 1+10 through 100+40. There is no crit branch in
    // the handler, so a natural 100 is simply 100.
    const r = forRow("sneak-attack", "?r sneak S E # x", []);
    assert.strictEqual(formatRange(r), "51-180");
    assert.strictEqual(r.critMin, null);
});

test("Critical Attack shows the reachable crit inline, not the star breaker", () => {
    // offense.js handleCritical: x1.2 baseline, a rank-scaled 1.5-2.0 on any
    // 85+, x3 for a 100, x7 for double 100. Non-crit caps at 84+84. Inline we
    // show only the 85+ tier, which is the crit you actually hit - a x7 ceiling
    // that needs double 100s made every crit look inflated.
    const r = forRow("critical-attack", "?r critical S S # x", []);
    assert.strictEqual(r.min, Math.round((2 + 80) * 1.2));
    assert.strictEqual(r.max, Math.round((168 + 80) * 1.2));
    // 85 with a natural 1 is a crit fail, so the reachable floor is 85+2.
    assert.strictEqual(r.critMin, Math.round((87 + 80) * 2));
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
    for (const lookup of ["torment", "evolve", "duelist", "not-an-action"]) {
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

test("saves and checks project a range with no crit", () => {
    // basic.js handleSave/handleExpertise/handleMastery: 1d100 plus a bonus,
    // no multiplier — a natural 100 is just 100, so the span runs to 100+base.
    const save = forRow("@save", "?r save 70 # Reflex · Lune", []);
    assert.strictEqual(formatRange(save), "71-170");
    assert.strictEqual(formatCrit(save), "");

    // Expertise and mastery checks carry a rank letter instead of a number.
    assert.strictEqual(formatRange(forRow("@expertise-check", "?r expertise B # x", [])), "26-125");
    assert.strictEqual(formatRange(forRow("@mastery-check", "?r mastery S # x", [])), "41-140");
});

test("only the save card treats an unsigned number as a bonus", () => {
    // clickSave stamps the computed save value as a bare number, so it has to
    // count there. Anywhere else an unsigned number is a dice count or noise,
    // and counting it would inflate the projection.
    assert.strictEqual(formatRange(forRow("@save", "?r save 70 # x", [])), "71-170");
    assert.strictEqual(formatRange(forRow("attack", "?r attack E E 70 # x", [])), "1-99");
});

test("advantage does not change a check's bounds", () => {
    // adv/dis roll a second d100 and keep the higher or lower, which shifts the
    // odds but not the range.
    const plain = forRow("@save", "?r save 70 # x", []);
    const adv = forRow("@save", "?r save adv 70 # x", []);
    assert.strictEqual(formatRange(plain), formatRange(adv));
});

// Risky Mode converts flat bonuses into dice instead of adding them, so a
// projection that treats a Risky roll as a plain one is wrong twice over: too
// few dice, and a base that still counts bonuses already spent.
const RISKY_CODE =
    "?r reckless C B +10 +230 # Power · Physical · Lune · Lethal · Risky Mode · NG1 · 2768";

test("Risky Mode converts the bonus pool exactly as the bot does", () => {
    // Reproduces a real roll: Lethal +10 and a +230 plan modifier, with NG1
    // folded in, giving the bot's own line "converted 240 into 6d100,
    // remainder: +5. NG⋅1 +5 counted toward the conversion."
    const r = forRow("reckless-attack", RISKY_CODE, ["Risky Mode"]);
    assert.strictEqual(r.risky.pool, 245);
    assert.strictEqual(r.risky.dice, 6);
    assert.strictEqual(r.risky.converted, 240);
    assert.strictEqual(r.risky.remainder, 5);
    assert.strictEqual(r.risky.ng, 5, "NG1 counts toward the pool, not after it");
});

test("a Risky roll's own result falls inside its projected range", () => {
    // The roll that exposed this: 1d200 (45) + 1d100 (49) + 6d100 (172)
    // + 15 (MR·C) + 25 (WR·B) + 5 (mods·R) = 311.
    const r = forRow("reckless-attack", RISKY_CODE, ["Risky Mode"]);
    assert.ok(311 >= r.min && 311 <= r.max, "311 should be inside " + r.min + "-" + r.max);
    // Floor: every die minimal, plus ranks and the remainder.
    assert.strictEqual(r.min, 1 + 7 + 40 + 5);
    // Ceiling: a non-crit d200 and seven non-crit d100s.
    assert.strictEqual(r.max, 199 + 7 * 99 + 45);
});

test("Risky widens the range in both directions against the plain projection", () => {
    // The spent bonuses stop propping up the floor and start buying dice, so
    // the floor drops a long way and the ceiling rises.
    const plain = forRow("reckless-attack", RISKY_CODE, []);
    const risky = forRow("reckless-attack", RISKY_CODE, ["Risky Mode"]);
    assert.ok(risky.min < plain.min, "Risky's floor must be lower");
    assert.ok(risky.max > plain.max, "Risky's ceiling must be higher");
});

test("Risky applies to Sharp Attack too, and only to those two actions", () => {
    // offense.js wires the conversion into handleSharp and handleReckless only.
    const sharp = forRow("sharp-attack", "?r sharp C B +230 # x · Risky Mode · NG1", ["Risky Mode"]);
    assert.ok(sharp.risky, "Sharp supports Risky Mode");
    assert.strictEqual(sharp.risky.dice, Math.floor((230 + 5) / 40));

    // An attack cannot go Risky, so the tag must not change its projection.
    const plainAttack = forRow("attack", "?r attack A S +25 # x", []);
    const tagged = forRow("attack", "?r attack A S +25 # x", ["Risky Mode"]);
    assert.strictEqual(formatRange(tagged), formatRange(plainAttack));
    assert.ok(!tagged.risky);
});

test("a Risky pool too small for one die still leaves the remainder flat", () => {
    // Under 40 buys nothing, and the whole pool stays as a modifier.
    const r = forRow("reckless-attack", "?r reckless C B +30 # x · Risky Mode", ["Risky Mode"]);
    assert.strictEqual(r.risky.dice, 0);
    assert.strictEqual(r.risky.remainder, 30);
});

test("NG1 is detected without a regex escape that an edit could mangle", () => {
    // This exact line once held a literal backspace byte instead of \b, so the
    // NG bonus silently never counted. Pin the behaviour, not the syntax.
    const withNg = forRow("reckless-attack", "?r reckless C B +235 # x · Risky Mode · NG1", ["Risky Mode"]);
    const without = forRow("reckless-attack", "?r reckless C B +235 # x · Risky Mode", ["Risky Mode"]);
    assert.strictEqual(withNg.risky.pool, 240);
    assert.strictEqual(without.risky.pool, 235);
    assert.strictEqual(withNg.risky.dice, 6);
    assert.strictEqual(without.risky.dice, 5);
});

// --- crit chance --------------------------------------------------------------

test("a plain d100 attack crits on a nat 100 and nothing else", () => {
    for (const lookup of ["attack", "protect", "counter", "ultra-protect", "ultra-counter"]) {
        const r = forRow(lookup, "?r " + lookup + " A S # x");
        assert.strictEqual(r.critChance, 0.01, lookup);
    }
});

test("a critical attack crits when either of 2d100 reaches 85", () => {
    const r = forRow("critical-attack", "?r critical A S # x");
    // P(any 100) + P(no 100, no 1, some 85+). A natural 1 is a crit fail that
    // beats an 85+ on the other die. Rounded: binary floating point cannot hold
    // it exactly.
    assert.strictEqual(Math.round(r.critChance * 10000) / 10000, 0.2914);
});

test("a critical attack's rarer tiers carry their own odds", () => {
    const r = forRow("critical-attack", "?r critical A S # x");
    assert.match(r.critTiers[0], /\(2\.0%\)$/);
    assert.match(r.critTiers[1], /\(0\.01%\)$/);
});

test("a sharp attack's pool is both of its 2d100, because it keeps the higher", () => {
    const r = forRow("sharp-attack", "?r sharp A S # x");
    assert.strictEqual(Math.round(r.critChance * 10000) / 10000, 0.0199);
});

test("Risky dice widen a sharp attack's crit pool", () => {
    const r = forRow("sharp-attack", "?r sharp A S +80 # x · Risky Mode", ["Risky Mode"]);
    assert.strictEqual(r.risky.dice, 2);
    // 2 kept-pair dice + 2 Risky dice.
    assert.strictEqual(Math.round(r.critChance * 10000) / 10000, 0.0394);
});

test("a reckless attack counts its d200 as another crit die", () => {
    // C rank: 1 base d100 + the d200.
    const r = forRow("reckless-attack", "?r reckless C S # x");
    assert.strictEqual(Math.round(r.critChance * 10000) / 10000, 0.0199);
});

test("a reckless attack at B rank has two base d100s", () => {
    const r = forRow("reckless-attack", "?r reckless B S # x");
    assert.strictEqual(Math.round(r.critChance * 10000) / 10000, 0.0297);
});

test("a reckless attack at S counts the kept pair as two dice", () => {
    // 1 base d100 + the 2d100 kept pair + the d200 = four dice of chance.
    const r = forRow("reckless-attack", "?r reckless S S # x");
    assert.strictEqual(Math.round(r.critChance * 10000) / 10000, 0.0394);
});

test("Risky dice widen a reckless attack's crit pool too", () => {
    const r = forRow("reckless-attack", "?r reckless C S +80 # x · Risky Mode", ["Risky Mode"]);
    assert.strictEqual(r.risky.dice, 2);
    assert.strictEqual(Math.round(r.critChance * 10000) / 10000, 0.0394);
});

test("nothing that cannot crit reports a chance", () => {
    for (const [lookup, code] of [
        ["sneak-attack", "?r sneak A S # x"],
        ["stable-attack", "?r stable A S # x"],
        ["burst-attack", "?r burst A S # x"],
        ["heal", "?r heal A S # x"],
        ["power-heal", "?r powerheal A S # x"],
        ["buff", "?r buff A # x"],
        ["power-buff", "?r powerbuff A # x"],
        ["@save", "?r save 70 # x"],
        ["@mastery-check", "?r mastery A # x"],
        ["@expertise-check", "?r expertise A # x"],
    ]) {
        assert.strictEqual(forRow(lookup, code).critChance, null, lookup);
    }
});

test("formatCritChance reads as a percentage with one decimal", () => {
    assert.strictEqual(formatCritChance(0.01), "1.0%");
    assert.strictEqual(formatCritChance(0.2914), "29.1%");
    assert.strictEqual(formatCritChance(null), "");
    assert.strictEqual(formatCritChance(undefined), "");
});
