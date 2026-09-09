"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { PlanQueue, PlanBuffs } = load();
const { resolveQueue, makeRow } = PlanQueue;

// Terse row builders. Real rows carry rollHtml and a name too, but the engine
// only reads identity, rank, tags and the three user-editable fields.
function row(lookup, opts) {
    return makeRow(Object.assign({ lookup: lookup, rankLetter: "B" }, opts || {}));
}

function totals(rows) {
    return resolveQueue(rows).map((r) => r.total);
}

function chipLabels(resolved) {
    return resolved.chips.filter((c) => c.state === "applied").map((c) => c.label);
}

test("a queue with no buffs totals zero everywhere", () => {
    assert.deepStrictEqual(totals([row("attack"), row("torment")]), [0, 0]);
});

test("a persistent buff feeds every later main action", () => {
    // Evolve reads the Metamorph rank, supplied on the Evolve row itself.
    const rows = [
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("attack", { masteryId: "power" }),
        row("heal", { masteryId: "power" }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 15, 15]);
});

test("a once buff is spent by the first eligible row and gone after", () => {
    const rows = [
        row("duelist", { rankLetter: "A", tags: ["Challenge"] }),
        row("attack"),
        row("attack"),
    ];
    assert.deepStrictEqual(totals(rows), [0, 40, 0]);
});

test("a buff added after the action it should feed does not apply", () => {
    // Order is the model. Drag it up in the UI instead.
    const rows = [row("attack"), row("duelist", { rankLetter: "A", tags: ["Challenge"] })];
    assert.deepStrictEqual(totals(rows), [0, 0]);
});

test("reordering the same rows changes the result", () => {
    const duelist = row("duelist", { rankLetter: "A", tags: ["Challenge"] });
    const attack = row("attack");
    assert.deepStrictEqual(totals([attack, duelist]), [0, 0]);
    assert.deepStrictEqual(totals([duelist, attack]), [0, 40]);
});

test("a buff whose requiresTag is absent produces nothing", () => {
    // Duelist without Challenge deals its passive damage but grants no modifier.
    const rows = [row("duelist", { rankLetter: "A" }), row("attack")];
    assert.deepStrictEqual(totals(rows), [0, 0]);
});

test("an attack-only buff does not feed a heal", () => {
    // Mark says "attacks"; Heal is mainAction but not attack.
    const rows = [row("mark", { rankLetter: "A" }), row("heal")];
    assert.deepStrictEqual(totals(rows), [0, 0]);
});

test("a mainAction buff feeds heals and buffs as well as attacks", () => {
    const rows = [row("exceed", { rankLetter: "S" }), row("buff"), row("power-heal")];
    assert.deepStrictEqual(totals(rows), [0, 30, 30]);
});

test("buffs from several sources stack on one row", () => {
    const rows = [
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("duelist", { rankLetter: "A", masteryId: "power", tags: ["Challenge"] }),
        row("reckless-attack", { masteryId: "power" }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0, 55]);
    assert.deepStrictEqual(
        chipLabels(resolveQueue(rows)[2]).sort(),
        ["Duelist · Challenge", "Evolve"],
    );
});

test("the manual modifier is added to the computed total", () => {
    const rows = [
        row("duelist", { rankLetter: "A", tags: ["Challenge"] }),
        row("attack", { manualMod: 10 }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 50]);
});

test("a manual modifier applies with no buffs present", () => {
    assert.deepStrictEqual(totals([row("attack", { manualMod: 25 })]), [25]);
});

test("a negative manual modifier subtracts", () => {
    assert.deepStrictEqual(totals([row("attack", { manualMod: -5 })]), [-5]);
});

test("a non-numeric manual modifier counts as zero rather than NaN", () => {
    assert.deepStrictEqual(totals([row("attack", { manualMod: "" })]), [0]);
    assert.deepStrictEqual(totals([row("attack", { manualMod: "abc" })]), [0]);
});

test("resolve is pure: it does not mutate the rows it is given", () => {
    const rows = [row("duelist", { rankLetter: "A", tags: ["Challenge"] }), row("attack")];
    const before = JSON.stringify(rows);
    resolveQueue(rows);
    assert.strictEqual(JSON.stringify(rows), before);
});

test("save and check pseudo-rows consume but never produce", () => {
    const rows = [row("adapt", { rankLetter: "B", tags: ["Fend"] }), row("@save")];
    assert.deepStrictEqual(totals(rows), [0, 15]);
});

test("an unknown lookup queues harmlessly and contributes nothing", () => {
    assert.deepStrictEqual(totals([row("not-an-action"), row("attack")]), [0, 0]);
});

test("makeRow fills defaults and assigns a unique id", () => {
    const a = makeRow({ lookup: "attack" });
    const b = makeRow({ lookup: "attack" });
    assert.notStrictEqual(a.uid, b.uid);
    assert.deepStrictEqual(a.tags, []);
    assert.deepStrictEqual(a.dismissed, []);
    assert.strictEqual(a.manualMod, 0);
});

test("makeRow defaults targetSelf from the buff's target", () => {
    // Mark is target "self" even though it renders a checkbox; Coordinate is not.
    assert.strictEqual(makeRow({ lookup: "mark" }).targetSelf, true);
    assert.strictEqual(makeRow({ lookup: "coordinate" }).targetSelf, false);
    // An action with no buff entry is self by default; nothing reads it.
    assert.strictEqual(makeRow({ lookup: "attack" }).targetSelf, true);
});
