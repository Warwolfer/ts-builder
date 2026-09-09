"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { actionlist } = load();

const MAIN_ACTIONS = [
    "attack", "protect", "counter", "ultra-protect", "ultra-counter",
    "stable-attack", "burst-attack", "sneak-attack", "critical-attack",
    "sharp-attack", "reckless-attack",
    "heal", "power-heal", "buff", "power-buff",
];

function lookupsWithUse(tag) {
    return actionlist
        .filter((a) => Array.isArray(a.use) && a.use.includes(tag))
        .map((a) => a.lookup)
        .sort();
}

test('use:"main" marks exactly the fifteen Main Actions', () => {
    assert.deepStrictEqual(lookupsWithUse("main"), [...MAIN_ACTIONS].sort());
});

test("every action whose dice formula ends in 'other bonuses' is a Main Action", () => {
    // The roll shape "MR + WR + other bonuses" is what makes a +X modifier
    // meaningful, so it is an independent check on the same set.
    const byDice = actionlist
        .filter((a) => /other bonuses/i.test(a.dice || ""))
        .map((a) => a.lookup)
        .sort();
    assert.deepStrictEqual(byDice, [...MAIN_ACTIONS].sort());
});

test("no action declares both main and a non-main slot it cannot occupy", () => {
    // "special" and "free" qualify a main action; "passive" and "bonus" cannot
    // coexist with "main" because they are different slots.
    for (const a of actionlist) {
        const use = a.use || [];
        if (!use.includes("main")) continue;
        assert.ok(
            !use.includes("passive") && !use.includes("bonus"),
            `${a.lookup} declares main alongside passive/bonus: ${JSON.stringify(use)}`,
        );
    }
});
