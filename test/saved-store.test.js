"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
require(path.join(__dirname, "..", "shared", "saved-builds-store.js"));
const { SavedBuildsStore, SavedScreensStore, SavedStoreInternals } = global.window;

// A stand-in for an IDBDatabase during onupgradeneeded: remembers which
// stores exist and records what was created.
function fakeDb(existing) {
    const names = new Set(existing);
    const created = [];
    return {
        objectStoreNames: { contains: (n) => names.has(n) },
        createObjectStore: (name, opts) => { names.add(name); created.push([name, opts]); },
        created,
    };
}

test("the database is at version 2 with two stores", () => {
    assert.strictEqual(SavedStoreInternals.DB_VERSION, 2);
    assert.deepStrictEqual(SavedStoreInternals.STORES, ["saved-builds", "saved-screens"]);
});

test("upgrading a fresh database creates both stores keyed by id", () => {
    const db = fakeDb([]);
    SavedStoreInternals.ensureStores(db);
    assert.deepStrictEqual(db.created, [
        ["saved-builds", { keyPath: "id" }],
        ["saved-screens", { keyPath: "id" }],
    ]);
});

test("upgrading from version 1 adds only the missing store and leaves saved builds alone", () => {
    const db = fakeDb(["saved-builds"]);
    SavedStoreInternals.ensureStores(db);
    assert.deepStrictEqual(db.created, [["saved-screens", { keyPath: "id" }]]);
});

test("upgrading an already-current database creates nothing", () => {
    const db = fakeDb(["saved-builds", "saved-screens"]);
    SavedStoreInternals.ensureStores(db);
    assert.deepStrictEqual(db.created, []);
});

test("SavedBuildsStore keeps its whole surface", () => {
    for (const name of ["getAll", "save", "delete", "generateId", "formatTimestamp", "computeDefaultName"]) {
        assert.strictEqual(typeof SavedBuildsStore[name], "function", name);
    }
});

test("SavedScreensStore has the same CRUD surface plus generateId", () => {
    for (const name of ["getAll", "save", "delete", "generateId"]) {
        assert.strictEqual(typeof SavedScreensStore[name], "function", name);
    }
});

test("generateId is shared and unique", () => {
    const a = SavedBuildsStore.generateId();
    const b = SavedScreensStore.generateId();
    assert.match(a, /^\d+-[a-z0-9]+$/);
    assert.notStrictEqual(a, b);
});

test("computeDefaultName still behaves as before", () => {
    assert.strictEqual(SavedBuildsStore.computeDefaultName({ threadName: "Night Watch", note: "" }), "Night Watch");
    assert.strictEqual(SavedBuildsStore.computeDefaultName({ threadCode: "2768", note: "alt" }), "2768 - alt");
    assert.match(SavedBuildsStore.computeDefaultName({ createdAt: 0 }), /^Unnamed Build /);
});
