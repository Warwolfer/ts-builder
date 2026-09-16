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

// A,B,C at indices 0,1,2. Table from the review: who is sitting where when
// which tab is deleted, and where they land afterwards. Deleting the active
// tab clamps onto a neighbor; deleting one before it shifts it down by one;
// deleting one after it leaves it exactly where it was.
test("deleteCycle keeps the sitting cycle current, not just a clamped index", () => {
    const named = ["A", "B", "C"];
    function make() {
        return named.map((name) => ({ name: name, rows: [] }));
    }
    const cases = [
        // [active index, deleted index, expected surviving cycle name]
        [0, 1, "A"], // on A, delete B -> A,C, land on A
        [0, 2, "A"], // on A, delete C -> A,B, land on A
        [1, 0, "B"], // on B, delete A -> B,C, land on B
        [1, 2, "B"], // on B, delete C -> A,B, land on B
        [2, 0, "C"], // on C, delete A -> B,C, land on C
        [2, 1, "C"], // on C, delete B -> A,C, land on C
        [1, 1, "C"], // on B, delete B -> A,C, clamped to C
        [2, 2, "B"], // on C, delete C -> A,B, clamped to B
    ];
    for (const [active, deleted, expectName] of cases) {
        const before = make();
        const out = PlanCycles.deleteCycle(before, deleted, active);
        const label = "active=" + active + " delete=" + deleted;
        assert.strictEqual(out.cycles.length, 2, label);
        assert.strictEqual(out.cycles[out.active].name, expectName, label);
    }
});

test("the last cycle cannot be deleted", () => {
    const before = [{ name: "Cycle 1", rows: rows(1) }];
    const out = PlanCycles.deleteCycle(before, 0, 0);
    assert.strictEqual(out.cycles, before);
});

test("an out-of-range delete index returns the input unchanged", () => {
    const before = [{ name: "Cycle 1", rows: [] }, { name: "Cycle 2", rows: [] }];
    const out = PlanCycles.deleteCycle(before, 5, 0);
    assert.strictEqual(out.cycles, before);
    assert.strictEqual(out.active, 0);
});

test("an out-of-range or missing active defaults to 0 rather than throwing", () => {
    const before = [{ name: "Cycle 1", rows: [] }, { name: "Cycle 2", rows: [] }];
    for (const active of [-1, 9, "x", null, undefined, NaN]) {
        // Delete index 1 (after wherever a defaulted active of 0 lands):
        // active should default to 0 and stay there, untouched by deleting
        // something after it.
        const out = PlanCycles.deleteCycle(before, 1, active);
        assert.strictEqual(out.active, 0, String(active));
    }
    // Same defaulting on the no-op path (deleting an index that isn't there).
    for (const active of [-1, 9, "x", null, undefined, NaN]) {
        const out = PlanCycles.deleteCycle(before, 5, active);
        assert.strictEqual(out.active, 0, String(active));
    }
});
