"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { RollCodeUtils } = load();
const { setRollPlanMod, setRollExtraMod } = RollCodeUtils;

// Reckless Attack as rendered for an NG+ character with Lethal picked.
const RECKLESS =
    "?r reckless <span class='masteryreplace'>A</span> S " +
    '<span class="damagepassivemod">+10 </span># ' +
    "<span class='mnamereplace'>Power</span> · Lune · Lethal · NG1 · " +
    "<span class='thrcode'>2768</span>";

test("inserts a signed modifier before the comment hash", () => {
    const out = setRollPlanMod(RECKLESS, 55);
    assert.match(out, /<span class="planmod">\+55 <\/span>#/);
});

test("adds a plus sign when the value has no explicit sign", () => {
    assert.match(setRollPlanMod(RECKLESS, "55"), /\+55/);
});

test("keeps an explicit minus sign", () => {
    assert.match(setRollPlanMod(RECKLESS, "-10"), /<span class="planmod">-10 <\/span>/);
});

test("replaces rather than appends on repeat calls", () => {
    const once = setRollPlanMod(RECKLESS, 20);
    const twice = setRollPlanMod(once, 55);
    assert.strictEqual((twice.match(/planmod/g) || []).length, 1);
    assert.match(twice, /\+55/);
    assert.doesNotMatch(twice, /\+20/);
});

test("an empty, zero or null value clears the span entirely", () => {
    const set = setRollPlanMod(RECKLESS, 55);
    for (const cleared of [setRollPlanMod(set, ""), setRollPlanMod(set, 0), setRollPlanMod(set, null)]) {
        assert.doesNotMatch(cleared, /planmod/);
        assert.strictEqual(cleared, RECKLESS);
    }
});

test("leaves the Lethal passive modifier untouched", () => {
    const out = setRollPlanMod(RECKLESS, 55);
    assert.match(out, /<span class="damagepassivemod">\+10 <\/span>/);
});

test("coexists with the Risky Mode modifier, neither clobbering the other", () => {
    // Reckless Attack can be both Risky and buffed. Two spans, both before the
    // hash, independently settable in either order.
    let html = setRollExtraMod(RECKLESS, "15");
    html = setRollPlanMod(html, 55);
    assert.match(html, /<span class="extramod">\+15 <\/span>/);
    assert.match(html, /<span class="planmod">\+55 <\/span>/);

    // Clearing one must leave the other standing.
    const noPlan = setRollPlanMod(html, "");
    assert.match(noPlan, /extramod/);
    assert.doesNotMatch(noPlan, /planmod/);

    // And the same holds with the insertion order reversed.
    let other = setRollPlanMod(RECKLESS, 55);
    other = setRollExtraMod(other, "15");
    assert.match(other, /<span class="extramod">\+15 <\/span>/);
    assert.match(other, /<span class="planmod">\+55 <\/span>/);
    const noExtra = setRollExtraMod(other, "");
    assert.match(noExtra, /planmod/);
    assert.doesNotMatch(noExtra, /extramod/);
});

test("escapes user-supplied text before it reaches innerHTML", () => {
    const out = setRollPlanMod(RECKLESS, '<img src=x onerror="alert(1)">');
    assert.doesNotMatch(out, /<img/);
});

test("a signed zero clears the span, like a bare zero", () => {
    const set = setRollPlanMod(RECKLESS, 55);
    for (const zero of ["+0", "-0", "0", " 0 "]) {
        assert.doesNotMatch(setRollPlanMod(set, zero), /planmod/);
    }
});

test("appends at the end when the roll code has no hash", () => {
    const out = setRollPlanMod("?r rush", 10);
    assert.match(out, /planmod/);
    assert.match(out, /\+10/);
});
