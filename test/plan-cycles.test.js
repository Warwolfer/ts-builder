"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
const PlanCycles = require(path.join(__dirname, "..", "shared", "plan-cycles.js"));

function rows(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ uid: "r" + i, lookup: "attack" });
    return out;
}

// --- migrateStored ---------------------------------------------------------

test("the old flat shape becomes one cycle named Cycle 1", () => {
    const out = PlanCycles.migrateStored({ fingerprint: "f", rows: rows(2) });
    assert.strictEqual(out.active, 0);
    assert.strictEqual(out.cycles.length, 1);
    assert.strictEqual(out.cycles[0].name, "Cycle 1");
    assert.strictEqual(out.cycles[0].rows.length, 2);
});

test("the old shape with no rows still yields one empty cycle", () => {
    const out = PlanCycles.migrateStored({ fingerprint: "f" });
    assert.deepStrictEqual(out.cycles.map((c) => c.name), ["Cycle 1"]);
    assert.deepStrictEqual(out.cycles[0].rows, []);
});

test("a current shape passes through", () => {
    const out = PlanCycles.migrateStored({
        fingerprint: "f",
        active: 1,
        cycles: [{ name: "Cycle 1", rows: rows(1) }, { name: "Boss", rows: [] }],
    });
    assert.strictEqual(out.active, 1);
    assert.deepStrictEqual(out.cycles.map((c) => c.name), ["Cycle 1", "Boss"]);
});

test("an active index past the end is clamped", () => {
    const out = PlanCycles.migrateStored({
        fingerprint: "f", active: 9,
        cycles: [{ name: "Cycle 1", rows: [] }],
    });
    assert.strictEqual(out.active, 0);
});

test("a negative or non-numeric active becomes 0", () => {
    for (const active of [-1, "x", null, undefined, NaN]) {
        const out = PlanCycles.migrateStored({
            fingerprint: "f", active: active,
            cycles: [{ name: "Cycle 1", rows: [] }, { name: "Cycle 2", rows: [] }],
        });
        assert.strictEqual(out.active, 0, String(active));
    }
});

test("a cycle with a missing or non-string name is renamed by position", () => {
    const out = PlanCycles.migrateStored({
        fingerprint: "f", active: 0,
        cycles: [{ rows: [] }, { name: 42, rows: [] }],
    });
    assert.deepStrictEqual(out.cycles.map((c) => c.name), ["Cycle 1", "Cycle 2"]);
});

test("a cycle whose rows are not an array gets an empty list", () => {
    const out = PlanCycles.migrateStored({
        fingerprint: "f", active: 0, cycles: [{ name: "Cycle 1", rows: "nope" }],
    });
    assert.deepStrictEqual(out.cycles[0].rows, []);
});

test("junk yields null rather than throwing", () => {
    for (const bad of [null, undefined, 5, "x", [], { fingerprint: "f", cycles: [] }]) {
        assert.strictEqual(PlanCycles.migrateStored(bad), null, JSON.stringify(bad));
    }
});

test("more cycles than the cap are truncated, not refused", () => {
    const many = [];
    for (let i = 0; i < PlanCycles.MAX_CYCLES + 5; i++) many.push({ name: "Cycle " + (i + 1), rows: [] });
    const out = PlanCycles.migrateStored({ fingerprint: "f", active: 0, cycles: many });
    assert.strictEqual(out.cycles.length, PlanCycles.MAX_CYCLES);
});

// --- nextCycleName ---------------------------------------------------------

test("the next name is one above the highest Cycle N", () => {
    assert.strictEqual(PlanCycles.nextCycleName([]), "Cycle 1");
    assert.strictEqual(PlanCycles.nextCycleName([{ name: "Cycle 1" }]), "Cycle 2");
    assert.strictEqual(PlanCycles.nextCycleName([{ name: "Cycle 1" }, { name: "Cycle 7" }]), "Cycle 8");
});

test("renamed tabs do not hold the numbering back", () => {
    assert.strictEqual(PlanCycles.nextCycleName([{ name: "Boss" }, { name: "Cycle 3" }]), "Cycle 4");
    assert.strictEqual(PlanCycles.nextCycleName([{ name: "Boss" }]), "Cycle 1");
});

// --- addCycle / renameCycle / deleteCycle ----------------------------------

test("addCycle appends and does not mutate the input", () => {
    const before = [{ name: "Cycle 1", rows: rows(1) }];
    const after = PlanCycles.addCycle(before);
    assert.strictEqual(before.length, 1);
    assert.deepStrictEqual(after.map((c) => c.name), ["Cycle 1", "Cycle 2"]);
    assert.deepStrictEqual(after[1].rows, []);
});

test("addCycle refuses past the cap", () => {
    let cycles = [];
    for (let i = 0; i < PlanCycles.MAX_CYCLES; i++) cycles = PlanCycles.addCycle(cycles);
    assert.strictEqual(cycles.length, PlanCycles.MAX_CYCLES);
    assert.strictEqual(PlanCycles.addCycle(cycles), cycles);
});

test("renameCycle trims and keeps the rows", () => {
    const before = [{ name: "Cycle 1", rows: rows(2) }];
    const after = PlanCycles.renameCycle(before, 0, "  Boss  ");
    assert.strictEqual(after[0].name, "Boss");
    assert.strictEqual(after[0].rows.length, 2);
    assert.strictEqual(before[0].name, "Cycle 1");
});

test("renaming to blank keeps the old name", () => {
    const before = [{ name: "Cycle 1", rows: [] }];
    assert.strictEqual(PlanCycles.renameCycle(before, 0, "   ")[0].name, "Cycle 1");
});

test("renaming an index that is not there changes nothing", () => {
    const before = [{ name: "Cycle 1", rows: [] }];
    assert.strictEqual(PlanCycles.renameCycle(before, 5, "Boss"), before);
});

test("deleteCycle drops the cycle and moves active back when needed", () => {
    const before = [
        { name: "Cycle 1", rows: [] },
        { name: "Cycle 2", rows: [] },
        { name: "Cycle 3", rows: [] },
    ];
    assert.deepStrictEqual(PlanCycles.deleteCycle(before, 2).active, 1);
    assert.deepStrictEqual(PlanCycles.deleteCycle(before, 0).cycles.map((c) => c.name),
        ["Cycle 2", "Cycle 3"]);
});

test("the last cycle cannot be deleted", () => {
    const before = [{ name: "Cycle 1", rows: rows(1) }];
    const out = PlanCycles.deleteCycle(before, 0);
    assert.strictEqual(out.cycles, before);
});
