"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { PlanBuffs, ActionFamilies, actionlist } = load();
const { table, valueFor, chargesFor } = PlanBuffs;

// Pinned against ts-discord-bot's own tables. If the bot's numbers change,
// these fail rather than the builder quietly pasting a wrong modifier.
const BOT_VALUES = {
    evolve:     { d: 10, c: 10, b: 15, a: 15, s: 20 },  // alter.js:740 EVOLVE_BONUS
    duelist:    { d: 30, c: 30, b: 40, a: 40, s: 50 },  // offense.js:1029 DUEL_DMG doubled
    mark:       { d: 10, c: 15, b: 20, a: 25, s: 30 },  // alter.js:444 MARK_BONUS
    exceed:     { d: 10, c: 15, b: 20, a: 25, s: 30 },  // alter.js:317 EXCEED_BONUS
    coordinate: { d: 5,  c: 10, b: 15, a: 20, s: 25 },  // alter.js:778 COORDINATE_BONUS
    assist:     { d: 5,  c: 5,  b: 10, a: 10, s: 15 },  // alter.js:814 ASSIST_BONUS
    adapt:      { d: 10, c: 10, b: 15, a: 15, s: 20 },  // alter.js:681 FEND_BONUS
};

test("the seed table holds exactly the seven precomputable buffs", () => {
    assert.deepStrictEqual(Object.keys(table).sort(), Object.keys(BOT_VALUES).sort());
});

test("every value matches the bot's rank table", () => {
    for (const [lookup, ranks] of Object.entries(BOT_VALUES)) {
        for (const [rank, expected] of Object.entries(ranks)) {
            assert.strictEqual(
                valueFor(table[lookup], rank.toUpperCase()), expected,
                `${lookup} at rank ${rank.toUpperCase()}`,
            );
        }
    }
});

test("Exceed alone pays out at E rank", () => {
    // EXCEED_BONUS is the only bot table with an 'e' entry.
    assert.strictEqual(valueFor(table.exceed, "E"), 5);
    assert.strictEqual(valueFor(table.evolve, "E"), 0);
});

test("every entry cites the bot source it was copied from", () => {
    for (const [lookup, entry] of Object.entries(table)) {
        assert.match(entry.source, /ts-discord-bot/, `${lookup} lacks a source`);
    }
});

test("every appliesTo names a real family", () => {
    for (const [lookup, entry] of Object.entries(table)) {
        for (const family of entry.appliesTo) {
            assert.ok(
                Object.prototype.hasOwnProperty.call(ActionFamilies, family),
                `${lookup} applies to unknown family ${family}`,
            );
        }
    }
});

test("every table key names a real action", () => {
    const known = new Set(actionlist.map((a) => a.lookup));
    for (const lookup of Object.keys(table)) {
        assert.ok(known.has(lookup), `${lookup} is not in actions.js`);
    }
});

test("required tags name a toggle the action actually renders", () => {
    // Assist has no toggle and needs none: the bot's handleAssist parses no
    // triggers, so ?r assist <MR> always grants the Assign bonus. An entry
    // requiring a tag the card cannot produce would be permanently dead.
    const toggles = global.window.actionToggleButtons || {};
    for (const [lookup, entry] of Object.entries(table)) {
        if (!entry.requiresTag) continue;
        const suffixes = (toggles[lookup] || []).map((c) => c.suffix);
        assert.ok(
            suffixes.includes(entry.requiresTag),
            `${lookup} requires tag "${entry.requiresTag}" but renders ${JSON.stringify(suffixes)}`,
        );
    }
});

test("Mark carries rank-scaled charges, three at S", () => {
    assert.strictEqual(chargesFor(table.mark, "B"), 2);
    assert.strictEqual(chargesFor(table.mark, "S"), 3);
});

test("non-charge durations report no charge count", () => {
    assert.strictEqual(chargesFor(table.evolve, "S"), null);
    assert.strictEqual(chargesFor(table.duelist, "S"), null);
});

test("selfToggle is set exactly where the Self checkbox should appear", () => {
    // Inherently self-targeted buffs render no checkbox; it would be noise.
    assert.ok(!table.evolve.selfToggle);
    assert.ok(!table.exceed.selfToggle);
    assert.ok(!table.duelist.selfToggle);
    assert.ok(!table.adapt.selfToggle);
    // Mark defaults checked; Coordinate and Assist default unchecked.
    assert.strictEqual(table.mark.selfToggle, true);
    assert.strictEqual(table.mark.target, "self");
    assert.strictEqual(table.coordinate.selfToggle, true);
    assert.strictEqual(table.coordinate.target, "other");
    assert.strictEqual(table.assist.selfToggle, true);
    assert.strictEqual(table.assist.target, "other");
});
