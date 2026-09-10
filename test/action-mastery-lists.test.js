"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { actionlist, masteries: masterylist } = load();

// An action in one of the three role categories must be offered to exactly the
// masteries that can reach that role — primary or secondary — and to no others.
// Both directions matter: a missing mastery hides the action from a character
// entitled to it, and an extra one offers an action whose passive bonus scales
// off a role that mastery does not have, so it silently computes to +0.
//
// The other categories are deliberately exempt: `basic` and `utility` actions
// use the ["all"] sentinel, and each `alter` action belongs to one specific
// alter mastery rather than to the role as a whole.
const ROLE_CATEGORIES = ["offense", "defense", "support"];

function masteriesForRole(role) {
    return masterylist
        .filter((m) => m.primaryRole === role || m.secondaryRole === role)
        .map((m) => m.lookup);
}

for (const role of ROLE_CATEGORIES) {
    test(`every ${role} action lists exactly the ${role}-capable masteries`, () => {
        const expected = masteriesForRole(role);
        const offenders = [];

        for (const action of actionlist.filter((a) => a.category === role)) {
            const have = new Set(action.masteries || []);
            const missing = expected.filter((k) => !have.has(k));
            const extra = [...have].filter((k) => !expected.includes(k));
            if (missing.length || extra.length) {
                offenders.push(
                    `${action.lookup}: missing [${missing.join(", ")}] extra [${extra.join(", ")}]`,
                );
            }
        }

        assert.deepStrictEqual(offenders, [], "\n" + offenders.join("\n"));
    });
}

// The two masteries the lists actually got wrong, pinned by name so a
// regression names itself instead of showing up as an anonymous diff.
test("Illusion Magic is a defense/support mastery, never offense", () => {
    const mastery = masterylist.find((m) => m.lookup === "illusion-magic");
    assert.strictEqual(mastery.primaryRole, "defense");
    assert.strictEqual(mastery.secondaryRole, "support");

    for (const action of actionlist.filter((a) => a.category === "offense")) {
        assert.ok(
            !action.masteries.includes("illusion-magic"),
            `${action.lookup} should not offer illusion-magic`,
        );
    }
});

test("Alchemy is a support/defense mastery, never offense", () => {
    const mastery = masterylist.find((m) => m.lookup === "alchemy");
    assert.strictEqual(mastery.primaryRole, "support");
    assert.strictEqual(mastery.secondaryRole, "defense");

    for (const action of actionlist.filter((a) => a.category === "offense")) {
        assert.ok(
            !action.masteries.includes("alchemy"),
            `${action.lookup} should not offer alchemy`,
        );
    }
});
