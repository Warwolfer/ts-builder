"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { actionlist, masteries: masterylist } = load();

// An action's `masteries` list must offer the action to every mastery that can
// reach that role, i.e. both primary-role and secondary-role masteries.
function masteriesForRole(role) {
    return masterylist
        .filter((m) => m.primaryRole === role || m.secondaryRole === role)
        .map((m) => m.lookup);
}

test("every offense action is offered to secondary-role offense masteries", () => {
    const expected = masteriesForRole("offense");
    const offenders = [];

    for (const action of actionlist.filter((a) => a.category === "offense")) {
        const have = new Set(action.masteries || []);
        const missing = expected.filter((k) => !have.has(k));
        if (missing.length) offenders.push(`${action.lookup}: missing ${missing.join(", ")}`);
    }

    assert.deepStrictEqual(offenders, [], offenders.join("\n"));
});

test("Lethal and Swift are available without an offense-primary mastery", () => {
    // aeromancy is defense-primary / offense-secondary: the reported repro.
    for (const lookup of ["lethal", "swift"]) {
        const action = actionlist.find((a) => a.lookup === lookup);
        assert.ok(action, `${lookup} action missing`);
        assert.ok(
            action.masteries.includes("aeromancy"),
            `${lookup} should be pickable with aeromancy (offense-secondary)`,
        );
    }
});
