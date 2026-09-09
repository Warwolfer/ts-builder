"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { ActionFamilies, actionlist } = load();

test("mainAction is exactly attack + heal + buff", () => {
    assert.deepStrictEqual(
        [...ActionFamilies.mainAction].sort(),
        [...ActionFamilies.attack, ...ActionFamilies.heal, ...ActionFamilies.buff].sort(),
    );
});

test('mainAction matches use:"main" in actions.js', () => {
    // The pin that makes the data fix pay off: add a main action to actions.js
    // and forget this list, and the test fails instead of Evolve silently
    // under-applying into a roll code already pasted into a thread.
    assert.deepStrictEqual(
        [...ActionFamilies.mainAction].sort(),
        actionlist
            .filter((a) => (a.use || []).includes("main"))
            .map((a) => a.lookup)
            .sort(),
    );
});

test("every real-action family member names an action in actions.js", () => {
    const known = new Set(actionlist.map((a) => a.lookup));
    for (const family of ["attack", "heal", "buff", "mainAction"]) {
        for (const lookup of ActionFamilies[family]) {
            assert.ok(known.has(lookup), `${family} names unknown action ${lookup}`);
        }
    }
});

test("pseudo-lookups are @-prefixed so they cannot collide with real actions", () => {
    const known = new Set(actionlist.map((a) => a.lookup));
    for (const family of ["save", "masteryCheck", "expertiseCheck"]) {
        for (const lookup of ActionFamilies[family]) {
            assert.match(lookup, /^@/, `${family} member ${lookup} must be @-prefixed`);
            assert.ok(!known.has(lookup), `${lookup} collides with a real action`);
        }
    }
});

test("familiesOf reports every family a lookup belongs to", () => {
    // Reckless Attack is both, which is why the engine matches on any family.
    assert.deepStrictEqual(
        ActionFamilies.familiesOf("reckless-attack").sort(),
        ["attack", "mainAction"],
    );
    assert.deepStrictEqual(
        ActionFamilies.familiesOf("heal").sort(),
        ["heal", "mainAction"],
    );
    assert.deepStrictEqual(ActionFamilies.familiesOf("@save"), ["save"]);
    assert.deepStrictEqual(ActionFamilies.familiesOf("torment"), []);
});
