"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
const Pending = require(path.join(__dirname, "..", "shared", "pending-build.js"));

function fakeStorage(initial) {
    const map = Object.assign({}, initial || {});
    return {
        map: map,
        getItem: (k) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
        setItem: (k, v) => { map[k] = String(v); },
        removeItem: (k) => { delete map[k]; },
    };
}

test("a written payload reads back", () => {
    const s = fakeStorage();
    Pending.write(s, { id: "b1", customActions: [{ id: "c1", action: { v: 1 }, payload: "1abc" }] });
    const got = Pending.read(s);
    assert.strictEqual(got.id, "b1");
    assert.strictEqual(got.customActions.length, 1);
    assert.strictEqual(got.customActions[0].payload, "1abc");
});

test("nothing stored reads as null", () => {
    assert.strictEqual(Pending.read(fakeStorage()), null);
});

test("junk reads as null instead of throwing", () => {
    const s = fakeStorage({ "tsbuilder_pending_saved_build": "{not json" });
    assert.strictEqual(Pending.read(s), null);
});

test("a stored value that is not an object reads as null", () => {
    const s = fakeStorage({ "tsbuilder_pending_saved_build": '"just a string"' });
    assert.strictEqual(Pending.read(s), null);
});

test("a missing customActions reads as an empty list", () => {
    const s = fakeStorage({ "tsbuilder_pending_saved_build": JSON.stringify({ id: "b1" }) });
    assert.deepStrictEqual(Pending.read(s).customActions, []);
});

test("clear removes the key", () => {
    const s = fakeStorage();
    Pending.write(s, { id: "b1", customActions: [] });
    Pending.clear(s);
    assert.strictEqual(Pending.read(s), null);
});

test("a storage that throws never takes the page down", () => {
    const broken = {
        getItem: () => { throw new Error("blocked"); },
        setItem: () => { throw new Error("blocked"); },
        removeItem: () => { throw new Error("blocked"); },
    };
    assert.doesNotThrow(() => Pending.write(broken, { id: "x", customActions: [] }));
    assert.strictEqual(Pending.read(broken), null);
    assert.doesNotThrow(() => Pending.clear(broken));
});

test("a missing storage is tolerated", () => {
    assert.strictEqual(Pending.read(null), null);
    assert.doesNotThrow(() => Pending.write(null, { id: "x", customActions: [] }));
    assert.doesNotThrow(() => Pending.clear(null));
});
