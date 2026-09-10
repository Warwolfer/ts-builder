"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { actionlist, masteries: masterylist } = load();
const Calculations = global.window.CharacterCalculations;

const lethal = actionlist.find((a) => a.lookup === "lethal");
const blessed = actionlist.find((a) => a.lookup === "blessed");

function stateOf(pairs) {
    return {
        chosenMasteries: pairs.map((p) => p[0]),
        chosenMasteriesRanks: pairs.map((p) => p[1]),
    };
}

// Reported build: Aeromancy D, Arcanamancy C, Astramancy D, Speed D, Dynamism D.
// Aeromancy and Arcanamancy are defense-primary / offense-secondary, so their
// offense rank downcasts one step: Arcanamancy C counts as D, not C. Every
// offense-capable mastery here therefore lands at D, so Lethal is +5.
test("Lethal downcasts a secondary-role offense mastery", () => {
    const state = stateOf([
        ["aeromancy", 1],
        ["arcanamancy", 2],
        ["astramancy", 1],
        ["speed", 1],
        ["dynamism", 1],
    ]);
    assert.strictEqual(
        Calculations.getHighestApplicableMasteryRank(state, lethal, masterylist),
        1,
    );
});

test("Lethal uses the raw rank of a primary-role offense mastery", () => {
    const state = stateOf([
        ["arcanamancy", 2],
        ["power", 3],
    ]);
    assert.strictEqual(
        Calculations.getHighestApplicableMasteryRank(state, lethal, masterylist),
        3,
    );
});

// Ranks arrive from localStorage as strings; string compare made "10" < "2".
test("Lethal reads string ranks numerically", () => {
    const state = stateOf([["power", "4"]]);
    assert.strictEqual(
        Calculations.getHighestApplicableMasteryRank(state, lethal, masterylist),
        4,
    );
});

// Illusion Magic is listed on Lethal but has no offense role at all.
test("a mastery that cannot reach the action's role contributes nothing", () => {
    const state = stateOf([["illusion-magic", 5]]);
    assert.strictEqual(
        Calculations.getHighestApplicableMasteryRank(state, lethal, masterylist),
        0,
    );
});

test("Blessed downcasts a secondary-role support mastery", () => {
    // dark-magic is offense-primary / support-secondary.
    const state = stateOf([["dark-magic", 4]]);
    assert.strictEqual(
        Calculations.getHighestApplicableMasteryRank(state, blessed, masterylist),
        3,
    );
});
