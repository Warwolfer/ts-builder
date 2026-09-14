"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
require(path.join(__dirname, "..", "shared", "dm-screen-state.js"));
const S = global.window.DmScreenState;

// Deterministic ids and clock so shapes can be asserted exactly.
function ids(prefix) {
    let n = 0;
    return () => `${prefix}${++n}`;
}
const ACTION = { v: 1, n: "Enraged Tidal Smash", d: "Reflex.", k: ["reflex"], g: [[20, "Take 40"], [null, "No damage"]] };
const OTHER = { v: 1, n: "Tide Splitter", p: [["Base", "20d20"]], k: ["fortitude"], g: [[null, "Take 2d20"]] };

test("a new screen has one cycle named Cycle 1 and stamped timestamps", () => {
    const s = S.newScreen({ id: "s1", now: 1000 });
    assert.deepStrictEqual(s, {
        v: 1, id: "s1", name: "New Screen",
        cycles: [{ id: "s1-c1", name: "Cycle 1", actions: [] }],
        createdAt: 1000, updatedAt: 1000,
    });
});

test("nextCycleName is one above the highest Cycle N, ignoring other names", () => {
    assert.strictEqual(S.nextCycleName([]), "Cycle 1");
    assert.strictEqual(S.nextCycleName([{ name: "Cycle 1" }]), "Cycle 2");
    assert.strictEqual(S.nextCycleName([{ name: "Cycle 1" }, { name: "Cycle 5" }, { name: "Boss" }]), "Cycle 6");
    assert.strictEqual(S.nextCycleName([{ name: "Boss" }]), "Cycle 1");
    assert.strictEqual(S.nextCycleName([{ name: "cycle 3" }]), "Cycle 4");
});

test("addCycle appends a new empty cycle and does not mutate the input", () => {
    const s = S.newScreen({ id: "s1", now: 1 });
    const t = S.addCycle(s, { id: "c2", now: 2 });
    assert.strictEqual(s.cycles.length, 1, "input untouched");
    assert.deepStrictEqual(t.cycles.map((c) => c.name), ["Cycle 1", "Cycle 2"]);
    assert.strictEqual(t.cycles[1].id, "c2");
    assert.strictEqual(t.updatedAt, 2);
});

test("renameCycle changes only that cycle's name and trims it", () => {
    const s = S.addCycle(S.newScreen({ id: "s1", now: 1 }), { id: "c2", now: 2 });
    const t = S.renameCycle(s, "c2", "  Boss Fight  ", 3);
    assert.deepStrictEqual(t.cycles.map((c) => c.name), ["Cycle 1", "Boss Fight"]);
    assert.strictEqual(t.updatedAt, 3);
});

test("renameCycle refuses an empty name by keeping the old one", () => {
    const s = S.newScreen({ id: "s1", now: 1 });
    const t = S.renameCycle(s, "s1-c1", "   ", 2);
    assert.strictEqual(t.cycles[0].name, "Cycle 1");
});

test("deleteCycle removes the cycle, and refuses to remove the last one", () => {
    const s = S.addCycle(S.newScreen({ id: "s1", now: 1 }), { id: "c2", now: 2 });
    const t = S.deleteCycle(s, "s1-c1", 3);
    assert.deepStrictEqual(t.cycles.map((c) => c.id), ["c2"]);
    assert.throws(() => S.deleteCycle(t, "c2", 4), /last cycle/i);
    assert.throws(() => S.deleteCycle(s, "nope", 4), /no cycle/i);
});

test("addAction stores a copy of the action under a new entry id", () => {
    const s = S.newScreen({ id: "s1", now: 1 });
    const t = S.addAction(s, "s1-c1", ACTION, { id: "a1", now: 2 });
    assert.deepStrictEqual(t.cycles[0].actions, [{ id: "a1", action: ACTION }]);
    assert.notStrictEqual(t.cycles[0].actions[0].action, ACTION, "a copy, not the same object");
    assert.strictEqual(s.cycles[0].actions.length, 0, "input untouched");
});

test("updateAction replaces the action in place, keeping the entry id and order", () => {
    let s = S.newScreen({ id: "s1", now: 1 });
    s = S.addAction(s, "s1-c1", ACTION, { id: "a1", now: 2 });
    s = S.addAction(s, "s1-c1", OTHER, { id: "a2", now: 3 });
    const edited = Object.assign({}, ACTION, { n: "Calmer Smash" });
    const t = S.updateAction(s, "s1-c1", "a1", edited, 4);
    assert.deepStrictEqual(t.cycles[0].actions.map((e) => [e.id, e.action.n]),
        [["a1", "Calmer Smash"], ["a2", "Tide Splitter"]]);
    assert.strictEqual(t.updatedAt, 4);
});

test("deleteAction removes just that entry", () => {
    let s = S.newScreen({ id: "s1", now: 1 });
    s = S.addAction(s, "s1-c1", ACTION, { id: "a1", now: 2 });
    s = S.addAction(s, "s1-c1", OTHER, { id: "a2", now: 3 });
    const t = S.deleteAction(s, "s1-c1", "a1", 4);
    assert.deepStrictEqual(t.cycles[0].actions.map((e) => e.id), ["a2"]);
});

test("copyAction clones an action into another cycle with a fresh id", () => {
    let s = S.newScreen({ id: "s1", now: 1 });
    s = S.addCycle(s, { id: "c2", now: 2 });
    s = S.addAction(s, "s1-c1", ACTION, { id: "a1", now: 3 });
    const t = S.copyAction(s, "s1-c1", "a1", "c2", { id: "a9", now: 4 });
    assert.strictEqual(t.cycles[0].actions.length, 1, "source keeps its copy");
    assert.deepStrictEqual(t.cycles[1].actions, [{ id: "a9", action: ACTION }]);
    assert.notStrictEqual(t.cycles[1].actions[0].action, t.cycles[0].actions[0].action);
});

test("cycleActions returns the bare actions in order, ready for encodeList", () => {
    let s = S.newScreen({ id: "s1", now: 1 });
    s = S.addAction(s, "s1-c1", ACTION, { id: "a1", now: 2 });
    s = S.addAction(s, "s1-c1", OTHER, { id: "a2", now: 3 });
    assert.deepStrictEqual(S.cycleActions(s, "s1-c1"), [ACTION, OTHER]);
    assert.deepStrictEqual(S.cycleActions(s, "nope"), []);
});

test("withNewIds regenerates every id and keeps everything else", () => {
    let s = S.newScreen({ id: "s1", now: 1 });
    s = S.addCycle(s, { id: "c2", now: 2 });
    s = S.addAction(s, "s1-c1", ACTION, { id: "a1", now: 3 });
    s = S.renameScreen(s, "Night Watch", 4);
    const t = S.withNewIds(s, { idFn: ids("new"), now: 9 });
    assert.strictEqual(t.id, "new1");
    assert.deepStrictEqual(t.cycles.map((c) => c.id), ["new2", "new3"]);
    assert.strictEqual(t.cycles[0].actions[0].id, "new4");
    assert.strictEqual(t.name, "Night Watch");
    assert.deepStrictEqual(t.cycles[0].actions[0].action, ACTION);
    assert.strictEqual(t.createdAt, 9);
    assert.strictEqual(t.updatedAt, 9);
});

test("renameScreen trims and refuses empty", () => {
    const s = S.newScreen({ id: "s1", now: 1 });
    assert.strictEqual(S.renameScreen(s, "  Raid  ", 2).name, "Raid");
    assert.strictEqual(S.renameScreen(s, "", 2).name, "New Screen");
});

test("findCycle and findAction return null for unknown ids", () => {
    const s = S.addAction(S.newScreen({ id: "s1", now: 1 }), "s1-c1", ACTION, { id: "a1", now: 2 });
    assert.strictEqual(S.findCycle(s, "s1-c1").name, "Cycle 1");
    assert.strictEqual(S.findCycle(s, "x"), null);
    assert.strictEqual(S.findAction(S.findCycle(s, "s1-c1"), "a1").action.n, "Enraged Tidal Smash");
    assert.strictEqual(S.findAction(S.findCycle(s, "s1-c1"), "x"), null);
});
