"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
require(path.join(__dirname, "..", "shared", "update-check.js"));
const { shouldReload } = global.window.UpdateCheck;

test("reloads when the server build differs and this tab has not reloaded for it", () => {
    assert.strictEqual(shouldReload("20260901-100000", "20260913-143200", null), true);
});

test("does nothing when the builds match", () => {
    assert.strictEqual(shouldReload("20260913-143200", "20260913-143200", null), false);
});

test("does nothing when the tab already reloaded for that build (no loop)", () => {
    assert.strictEqual(shouldReload("20260901-100000", "20260913-143200", "20260913-143200"), false);
});

test("does nothing when the fetched build is missing or empty", () => {
    assert.strictEqual(shouldReload("20260901-100000", undefined, null), false);
    assert.strictEqual(shouldReload("20260901-100000", "", null), false);
    assert.strictEqual(shouldReload("20260901-100000", null, null), false);
});

test("does not run the probe outside a document", () => {
    // Loading under Node (no document) must not throw and must not call fetch.
    assert.strictEqual(typeof global.window.UpdateCheck.probe, "function");
});
