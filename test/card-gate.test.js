"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
require(path.join(__dirname, "..", "resource", "card-gate.js"));
const { addBlockedReason } = global.window.CardGate;

// The smallest thing that quacks like a card for this rule: a list of icon
// stubs, each knowing whether it is lit and what data-mastery it carries.
function icon(opts) {
    return {
        lit: !!opts.lit,
        getAttribute: (name) => (name === "data-mastery" ? opts.mastery || null : null),
    };
}
function card(icons) {
    return {
        querySelectorAll: (sel) => (sel === ".masterycircle" ? icons : []),
        querySelector: (sel) => (sel === ".masterycircle.active-glow" ? icons.find((i) => i.lit) || null : null),
    };
}

test("a card with no icons is never blocked", () => {
    assert.strictEqual(addBlockedReason(card([])), null);
});

test("mastery icons with none lit ask for a mastery", () => {
    const c = card([icon({ mastery: "power" }), icon({ mastery: "metamorph" })]);
    assert.strictEqual(addBlockedReason(c), "Choose a mastery first");
});

test("mastery icons with one lit are not blocked", () => {
    const c = card([icon({ mastery: "power", lit: true }), icon({ mastery: "metamorph" })]);
    assert.strictEqual(addBlockedReason(c), null);
});

test("save or expertise icons (no data-mastery) with none lit ask for a type", () => {
    const c = card([icon({}), icon({}), icon({})]);
    assert.strictEqual(addBlockedReason(c), "Choose a type first");
});

test("save icons with one lit are not blocked", () => {
    const c = card([icon({}), icon({ lit: true }), icon({})]);
    assert.strictEqual(addBlockedReason(c), null);
});

test("onChange callbacks are stored and install is safe without a document", () => {
    let calls = 0;
    global.window.CardGate.onChange(() => { calls++; });
    assert.doesNotThrow(() => global.window.CardGate.install());
    assert.strictEqual(calls, 0);
});
