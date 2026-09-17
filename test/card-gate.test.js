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
function card(icons, attrs) {
    attrs = attrs || {};
    return {
        querySelectorAll: (sel) => (sel === ".masterycircle" ? icons : []),
        querySelector: (sel) => (sel === ".masterycircle.active-glow" ? icons.find((i) => i.lit) || null : null),
        getAttribute: (name) => (Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null),
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

test("a card with no icons to offer at all (data-requires-pick) is blocked", () => {
    const c = card([], { "data-requires-pick": "1" });
    assert.strictEqual(
        addBlockedReason(c),
        "This action needs a mastery or expertise you have not chosen",
    );
});

test("data-requires-pick is cleared once an icon on the card is lit", () => {
    const c = card([icon({ lit: true })], { "data-requires-pick": "1" });
    assert.strictEqual(addBlockedReason(c), null);
});

test("a card with icons and no data-requires-pick is unaffected by the new check", () => {
    const c = card([icon({ mastery: "power" })]);
    assert.strictEqual(addBlockedReason(c), "Choose a mastery first");
});

test("onChange callbacks are stored and install is safe without a document", () => {
    let calls = 0;
    global.window.CardGate.onChange(() => { calls++; });
    assert.doesNotThrow(() => global.window.CardGate.install());
    assert.strictEqual(calls, 0);
});

test("syncRollCodes locks the roll code of an unready card and unlocks a ready one", () => {
    // A minimal document: two containers, one card each.
    function rollCode() {
        const classes = new Set();
        const attrs = new Map();
        return {
            title: "Click to copy",
            classList: {
                toggle: (name, on) => { if (on) classes.add(name); else classes.delete(name); },
                contains: (name) => classes.has(name),
            },
            setAttribute: (name, value) => { attrs.set(name, value); },
            removeAttribute: (name) => { attrs.delete(name); },
            getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
        };
    }
    function domCard(icons, code) {
        return {
            querySelectorAll: (sel) => (sel === ".masterycircle" ? icons : []),
            querySelector: (sel) => {
                if (sel === ".masterycircle.active-glow") return icons.find((i) => i.lit) || null;
                if (sel === ".rollcode") return code;
                return null;
            },
            getAttribute: () => null,
        };
    }
    const lockedCode = rollCode();
    const readyCode = rollCode();
    const containers = {
        actionsdisplay: { querySelectorAll: () => [domCard([icon({ mastery: "power" })], lockedCode)] },
        saveschecks: { querySelectorAll: () => [domCard([icon({ lit: true })], readyCode)] },
    };
    global.document = {
        getElementById: (id) => containers[id] || null,
        addEventListener: () => {},
    };

    global.window.CardGate.syncRollCodes();

    assert.strictEqual(lockedCode.classList.contains("locked"), true);
    assert.strictEqual(lockedCode.title, "Choose a mastery first");
    assert.strictEqual(readyCode.classList.contains("locked"), false);
    assert.strictEqual(readyCode.title, "Click to copy");
    assert.strictEqual(lockedCode.getAttribute("aria-disabled"), "true");
    assert.strictEqual(readyCode.getAttribute("aria-disabled"), null);
    delete global.document;
});

// The callbacks are deferred to a fresh task on purpose (resource/card-gate.js
// explains why), so every assertion about them has to wait one turn.
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

test("install binds one document listener that runs every registered callback on an icon click", async () => {
    let handler = null;
    let bindCount = 0;
    global.document = {
        addEventListener: (type, fn) => { if (type === "click") { bindCount++; handler = fn; } },
        getElementById: () => null,
    };

    let calls = 0;
    global.window.CardGate.onChange(() => { calls++; });
    global.window.CardGate.install();

    assert.strictEqual(bindCount, 1, "install should bind exactly one click listener");
    assert.ok(handler, "install should have captured the handler");

    // A click on something inside a .masterycircle runs the callbacks — but not
    // until the dispatch it arrived in has finished.
    handler({ target: { closest: (sel) => (sel === ".masterycircle" ? {} : null) } });
    assert.strictEqual(calls, 0, "the callbacks must not run inline: a later listener in the same dispatch is what lights a custom card's icon");
    await nextTask();
    assert.ok(calls > 0, "an icon click should run the registered callbacks on the next task");

    // A click elsewhere does not.
    const before = calls;
    handler({ target: { closest: () => null } });
    await nextTask();
    assert.strictEqual(calls, before, "a click outside an icon should run nothing");

    // A burst of clicks coalesces into one pass.
    const icon = { target: { closest: (sel) => (sel === ".masterycircle" ? {} : null) } };
    handler(icon);
    handler(icon);
    handler(icon);
    await nextTask();
    assert.strictEqual(calls, before + 1, "three clicks in one turn should cost one pass");

    delete global.document;
});

test("install is idempotent: a second call binds no second listener", () => {
    let bindCount = 0;
    global.document = {
        addEventListener: (type) => { if (type === "click") bindCount++; },
        getElementById: () => null,
    };

    global.window.CardGate.install();
    global.window.CardGate.install();

    assert.strictEqual(bindCount, 0, "install already ran in the previous test, so it must not bind again");

    delete global.document;
});
