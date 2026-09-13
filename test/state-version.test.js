"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

// state-manager.js instantiates window.buildState at load and reads
// localStorage, so both shims must exist before the require.
function freshLoad(storedState) {
    const store = new Map();
    if (storedState !== undefined) store.set("tsbuilder_state", JSON.stringify(storedState));
    global.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: (k) => { store.delete(k); },
    };
    global.window = {};
    const file = path.join(__dirname, "..", "shared", "state-manager.js");
    delete require.cache[require.resolve(file)];
    require(file);
    return { BuildState: global.BuildState || global.window.BuildState, state: global.window.buildState, store };
}

test("a fresh state carries the current version", () => {
    const { BuildState, state } = freshLoad();
    assert.strictEqual(BuildState.STATE_VERSION, 2);
    assert.strictEqual(state.getState().stateVersion, 2);
});

test("a stored state without a version is migrated, keeps its data, and is written back stamped", () => {
    const { state, store } = freshLoad({ characterName: "Lune", chosenMasteries: ["power"] });
    const s = state.getState();
    assert.strictEqual(s.characterName, "Lune");
    assert.deepStrictEqual(s.chosenMasteries, ["power"]);
    assert.strictEqual(s.stateVersion, 2);
    assert.strictEqual(JSON.parse(store.get("tsbuilder_state")).stateVersion, 2);
});

test("migrate fills every default the stored shape lacks and never drops a stored key", () => {
    const { BuildState } = freshLoad();
    const out = BuildState.migrate({ characterName: "Lune", extraKey: 1 }, undefined);
    assert.strictEqual(out.characterName, "Lune");
    assert.strictEqual(out.extraKey, 1);
    assert.deepStrictEqual(out.chosenActions, []);
    assert.strictEqual(out.stateVersion, 2);
});

test("reset() stamps the version too", () => {
    const { state } = freshLoad({ characterName: "Lune" });
    state.reset();
    assert.strictEqual(state.getState().stateVersion, 2);
    assert.strictEqual(state.getState().characterName, "");
});
