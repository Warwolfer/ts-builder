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

// Runs the module against a stubbed browser and reports how many times it
// reloaded and what guard value it left behind. Loaded fresh each time so
// the module-level `installed`-style state cannot leak between scenarios.
async function runProbe({ current, server, status = 200, seen = null, setItemThrows = false, netError = false }) {
    let reloads = 0;
    let stored = seen;
    global.window = { TS_BUILD: current };
    global.location = { reload: () => { reloads++; } };
    global.sessionStorage = {
        getItem: () => stored,
        setItem: (k, v) => { if (setItemThrows) throw new Error("quota"); stored = v; },
    };
    global.fetch = () => netError
        ? Promise.reject(new Error("offline"))
        : Promise.resolve({ ok: status === 200, json: () => Promise.resolve({ build: server }) });
    global.document = { readyState: "complete", addEventListener: () => {} };
    const file = path.join(__dirname, "..", "shared", "update-check.js");
    delete require.cache[require.resolve(file)];
    require(file);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    delete global.location;
    delete global.sessionStorage;
    delete global.fetch;
    delete global.document;
    return { reloads, stored };
}

test("probe: same build reloads nothing", async () => {
    assert.deepStrictEqual(await runProbe({ current: "A", server: "A" }), { reloads: 0, stored: null });
});

test("probe: newer build reloads once and records the guard", async () => {
    assert.deepStrictEqual(await runProbe({ current: "A", server: "B" }), { reloads: 1, stored: "B" });
});

test("probe: guard already set for that build reloads nothing (no loop on a half upload)", async () => {
    assert.deepStrictEqual(await runProbe({ current: "A", server: "B", seen: "B" }), { reloads: 0, stored: "B" });
});

test("probe: a non-OK response reloads nothing", async () => {
    assert.deepStrictEqual(await runProbe({ current: "A", server: "B", status: 404 }), { reloads: 0, stored: null });
});

test("probe: a network error reloads nothing", async () => {
    assert.deepStrictEqual(await runProbe({ current: "A", server: "B", netError: true }), { reloads: 0, stored: null });
});

test("probe: when the guard cannot be written it does not reload", async () => {
    assert.deepStrictEqual(await runProbe({ current: "A", server: "B", setItemThrows: true }), { reloads: 0, stored: null });
});
