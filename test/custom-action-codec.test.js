// ts-builder/test/custom-action-codec.test.js
"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
const Codec = require(path.join(__dirname, "..", "shared", "custom-action-codec.js"));

// The DM's chart from the spec, in full.
function splitter() {
    return {
        v: 1,
        n: "Enraged Tide Splitter",
        d: "Take 20d20 damage, then make a Fortitude Save and consult the chart.",
        p: [["Base damage", "20d20"]],
        k: ["fortitude"],
        g: [
            [40, "Take an additional 20d20 damage"],
            [60, "Take an additional 12d20 damage"],
            [80, "Take an additional 10d20 damage"],
            [100, "Take an additional 8d20 damage"],
            [120, "Take an additional 6d20 damage"],
            [140, "Take an additional 4d20 damage"],
            [null, "Take an additional 2d20 damage"],
        ],
    };
}

// --- validateAction: the shapes it must accept -------------------------------

test("a full action with every field is valid", () => {
    assert.strictEqual(Codec.validateAction(splitter()), null);
});

test("a roll payload with no description and no roll types is valid", () => {
    const a = splitter();
    delete a.d;
    delete a.k;
    delete a.p;
    assert.strictEqual(Codec.validateAction(a), null);
});

test("one degree that covers everything is valid", () => {
    assert.strictEqual(Codec.validateAction({ v: 1, n: "Flat", g: [[null, "Take 10 damage"]] }), null);
});

// --- validateAction: the shapes it must refuse -------------------------------

test("a non-object is refused", () => {
    for (const bad of [null, undefined, 7, "x", []]) {
        assert.match(String(Codec.validateAction(bad)), /action/i);
    }
});

test("an unknown field is refused by name", () => {
    const a = splitter();
    a.zzz = 1;
    assert.match(Codec.validateAction(a), /zzz/);
});

test("a wrong version is refused", () => {
    const a = splitter();
    a.v = 2;
    assert.match(Codec.validateAction(a), /version/i);
});

test("an empty or overlong name is refused", () => {
    const a = splitter();
    a.n = "   ";
    assert.match(Codec.validateAction(a), /name/i);
    a.n = "x".repeat(61);
    assert.match(Codec.validateAction(a), /name/i);
});

test("an overlong description is refused", () => {
    const a = splitter();
    a.d = "x".repeat(301);
    assert.match(Codec.validateAction(a), /description/i);
});

test("a bad dice string in p is refused", () => {
    for (const bad of ["20", "d20", "0d20", "101d20", "20d1", "20d1001", "20 d 20", "20d20+5"]) {
        const a = splitter();
        a.p = [["Base damage", bad]];
        assert.match(String(Codec.validateAction(a)), /dice/i, `expected ${bad} to be refused`);
    }
});

test("a good dice string in p is accepted", () => {
    for (const good of ["1d2", "20d20", "100d1000"]) {
        const a = splitter();
        a.p = [["Base damage", good]];
        assert.strictEqual(Codec.validateAction(a), null, `expected ${good} to be accepted`);
    }
});

test("more than five dice rows are refused", () => {
    const a = splitter();
    a.p = [];
    for (let i = 0; i < 6; i++) a.p.push(["row " + i, "1d6"]);
    assert.match(Codec.validateAction(a), /five|5/i);
});

test("an unknown roll kind is refused", () => {
    const a = splitter();
    a.k = ["fortitude", "charisma"];
    assert.match(Codec.validateAction(a), /charisma/);
});

test("a repeated roll kind is refused", () => {
    const a = splitter();
    a.k = ["fortitude", "fortitude"];
    assert.match(Codec.validateAction(a), /twice|repeat/i);
});

test("an empty roll-kind list is refused", () => {
    const a = splitter();
    a.k = [];
    assert.match(Codec.validateAction(a), /roll type/i);
});

test("degrees that do not rise are refused", () => {
    const a = splitter();
    a.g = [[60, "a"], [40, "b"], [null, "c"]];
    assert.match(Codec.validateAction(a), /rise|order/i);
});

test("equal bounds are refused: rising means strictly rising", () => {
    const a = splitter();
    a.g = [[40, "a"], [40, "b"], [null, "c"]];
    assert.match(Codec.validateAction(a), /rise|order/i);
});

test("a last bound that is not null is refused", () => {
    const a = splitter();
    a.g = [[40, "a"], [60, "b"]];
    assert.match(Codec.validateAction(a), /last/i);
});

test("a null bound anywhere but last is refused", () => {
    const a = splitter();
    a.g = [[null, "a"], [60, "b"], [null, "c"]];
    assert.match(Codec.validateAction(a), /last/i);
});

test("an empty degree text is refused", () => {
    const a = splitter();
    a.g = [[40, "  "], [null, "c"]];
    assert.match(Codec.validateAction(a), /text/i);
});

test("no degrees at all is refused", () => {
    const a = splitter();
    a.g = [];
    assert.match(Codec.validateAction(a), /degree/i);
});

// --- stripForRoll ------------------------------------------------------------

test("stripForRoll keeps the name, the pre-dice and the chart, and drops the rest", () => {
    assert.deepStrictEqual(Codec.stripForRoll(splitter()), {
        v: 1,
        n: "Enraged Tide Splitter",
        p: [["Base damage", "20d20"]],
        g: splitter().g,
    });
});

test("stripForRoll omits p entirely when there are no pre-dice", () => {
    const a = splitter();
    delete a.p;
    assert.deepStrictEqual(Object.keys(Codec.stripForRoll(a)), ["v", "n", "g"]);
});

test("a stripped action is still valid", () => {
    assert.strictEqual(Codec.validateAction(Codec.stripForRoll(splitter())), null);
});

// --- matchDegree -------------------------------------------------------------

test("matchDegree picks the first bound the total does not exceed", () => {
    const g = splitter().g;
    assert.strictEqual(Codec.matchDegree(g, 1), 0);
    assert.strictEqual(Codec.matchDegree(g, 40), 0);
    assert.strictEqual(Codec.matchDegree(g, 41), 1);
    assert.strictEqual(Codec.matchDegree(g, 60), 1);
    assert.strictEqual(Codec.matchDegree(g, 129), 5);
    assert.strictEqual(Codec.matchDegree(g, 141), 6);
    assert.strictEqual(Codec.matchDegree(g, 9999), 6);
});

test("matchDegree handles a total at or below zero", () => {
    assert.strictEqual(Codec.matchDegree(splitter().g, 0), 0);
    assert.strictEqual(Codec.matchDegree(splitter().g, -30), 0);
});

// --- rangeLabel --------------------------------------------------------------

test("rangeLabel names the first, middle and last bands", () => {
    const g = splitter().g;
    assert.strictEqual(Codec.rangeLabel(g, 0), "(40 or under)");
    assert.strictEqual(Codec.rangeLabel(g, 1), "(41-60)");
    assert.strictEqual(Codec.rangeLabel(g, 5), "(121-140)");
    assert.strictEqual(Codec.rangeLabel(g, 6), "(141+)");
});

test("a single all-covering degree is labelled (any)", () => {
    assert.strictEqual(Codec.rangeLabel([[null, "x"]], 0), "(any)");
});

// --- diceIn ------------------------------------------------------------------

test("diceIn finds every dice expression in a degree text", () => {
    assert.deepStrictEqual(Codec.diceIn("Take an additional 4d20 damage"),
        [{ count: 4, sides: 20, raw: "4d20" }]);
    assert.deepStrictEqual(Codec.diceIn("2d6 fire and 1d20 cold"),
        [{ count: 2, sides: 6, raw: "2d6" }, { count: 1, sides: 20, raw: "1d20" }]);
});

test("diceIn finds nothing in a text with no dice", () => {
    assert.deepStrictEqual(Codec.diceIn("No damage"), []);
    assert.deepStrictEqual(Codec.diceIn("Your armour is hardened"), []);
});

test("diceIn ignores a dice expression glued to a word", () => {
    assert.deepStrictEqual(Codec.diceIn("take 20d20damage"), []);
    assert.deepStrictEqual(Codec.diceIn("x20d20"), []);
});

test("diceIn drops counts and sides outside the safe range", () => {
    assert.deepStrictEqual(Codec.diceIn("0d20 and 101d20 and 5d1 and 5d1001"), []);
    assert.deepStrictEqual(Codec.diceIn("100d1000"), [{ count: 100, sides: 1000, raw: "100d1000" }]);
});

test("diceIn is case-insensitive and reports the text as written", () => {
    assert.deepStrictEqual(Codec.diceIn("Take 4D20"), [{ count: 4, sides: 20, raw: "4D20" }]);
});

test("diceIn tolerates a missing or non-string argument", () => {
    assert.deepStrictEqual(Codec.diceIn(null), []);
    assert.deepStrictEqual(Codec.diceIn(undefined), []);
    assert.deepStrictEqual(Codec.diceIn(7), []);
});

// --- validateScreen ----------------------------------------------------------

function screen() {
    return {
        v: 1,
        id: "1757000000000-ab12",
        name: "Night Watch",
        cycles: [{ id: "c1", name: "Cycle 1", actions: [{ id: "a1", action: splitter() }] }],
        createdAt: 1757000000000,
        updatedAt: 1757000000000,
    };
}

test("a screen with one cycle and one action is valid", () => {
    assert.strictEqual(Codec.validateScreen(screen()), null);
});

test("a screen with no cycles is refused", () => {
    const s = screen();
    s.cycles = [];
    assert.match(Codec.validateScreen(s), /cycle/i);
});

test("a screen carrying an invalid action is refused, and the reason names the action", () => {
    const s = screen();
    s.cycles[0].actions[0].action.n = "";
    assert.match(Codec.validateScreen(s), /name/i);
});

test("a screen with an unnamed cycle is refused", () => {
    const s = screen();
    s.cycles[0].name = "";
    assert.match(Codec.validateScreen(s), /cycle/i);
});
