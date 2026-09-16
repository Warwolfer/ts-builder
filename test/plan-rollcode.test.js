"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { RollCodeUtils } = load();
const { setRollPlanMod, setRollExtraMod, setThreadCode } = RollCodeUtils;

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

// setThreadCode keeps a queued row's thread code current. A queue row is
// otherwise a frozen snapshot of the card, but the thread code is one
// page-level field, not card state - so a row rendered before the code was
// typed has to pick it up on the next render rather than keep a stale one.
//
// Its contract has to match updateThreadCode in resource/build-sheet.js, which
// is what stamps the same span everywhere else on the page.

// Both quote styles occur in real data: resource/actions.js uses single quotes
// 60 times and build-sheet.html uses double quotes, so neither may be dropped.
const THREAD_SQ = "?r attack A S # Power · Lune · <span class='thrcode'>2768</span>";
const THREAD_DQ = '?r attack A S # Power · Lune · <span class="thrcode">2768</span>';

function thrcodeText(html) {
    const m = html.match(/thrcode['"]>([^<]*)</);
    return m ? m[1] : null;
}

test("setThreadCode replaces the span's text, in either quote style", () => {
    assert.strictEqual(thrcodeText(setThreadCode(THREAD_SQ, "9001")), "9001");
    assert.strictEqual(thrcodeText(setThreadCode(THREAD_DQ, "9001")), "9001");
});

test("setThreadCode falls back to the placeholder for an absent value", () => {
    // updateThreadCode writes "Thread Code" when the input is empty, so an
    // emptied field must read the same in the queue as it does on the cards.
    for (const empty of ["", null, undefined]) {
        assert.strictEqual(thrcodeText(setThreadCode(THREAD_DQ, empty)), "Thread Code");
    }
});

test("setThreadCode escapes a user-typed value before it reaches innerHTML", () => {
    // The thread code is free text typed into #threadcodereplace and this
    // result is assigned as innerHTML.
    const out = setThreadCode(THREAD_DQ, '<img src=x onerror="alert(1)">');
    assert.doesNotMatch(out, /<img/);
    assert.match(out, /&lt;img/);
});

test("setThreadCode leaves a roll code with no thread-code span untouched", () => {
    // Rush and the free actions have no thrcode span; mangling them would be
    // worse than doing nothing.
    const noSpan = "?r rush # Lune";
    assert.strictEqual(setThreadCode(noSpan, "9001"), noSpan);
});

test("setThreadCode replaces rather than accumulates on repeat calls", () => {
    const once = setThreadCode(THREAD_DQ, "1111");
    const twice = setThreadCode(once, "2222");
    assert.strictEqual(thrcodeText(twice), "2222");
    assert.strictEqual((twice.match(/thrcode/g) || []).length, 1);
});

test("setThreadCode fills an empty span and overwrites the placeholder", () => {
    const emptySpan = '?r attack # <span class="thrcode"></span>';
    assert.strictEqual(thrcodeText(setThreadCode(emptySpan, "9001")), "9001");
    const placeholder = '?r attack # <span class="thrcode">Thread Code</span>';
    assert.strictEqual(thrcodeText(setThreadCode(placeholder, "9001")), "9001");
});

test("setThreadCode does not disturb the other modifier spans", () => {
    // damagepassivemod, extramod and planmod each belong to a different
    // feature; the thread code sits in the comment half and must not reach them.
    let html = setRollExtraMod(THREAD_DQ, "15");
    html = setRollPlanMod(html, 55);
    const out = setThreadCode(html, "9001");
    assert.match(out, /<span class="extramod">\+15 <\/span>/);
    assert.match(out, /<span class="planmod">\+55 <\/span>/);
    assert.strictEqual(thrcodeText(out), "9001");
});

test("a Cycle N name appends CN to the thread code", () => {
    assert.strictEqual(RollCodeUtils.withCycleSuffix("2768", "Cycle 1"), "2768C1");
    assert.strictEqual(RollCodeUtils.withCycleSuffix("2768", "Cycle 2"), "2768C2");
    assert.strictEqual(RollCodeUtils.withCycleSuffix("2768", "Cycle 12"), "2768C12");
});

test("an existing trailing suffix is replaced, not stacked", () => {
    assert.strictEqual(RollCodeUtils.withCycleSuffix("2768C1", "Cycle 2"), "2768C2");
    assert.strictEqual(RollCodeUtils.withCycleSuffix("2768C12", "Cycle 3"), "2768C3");
});

test("a name that is not exactly Cycle N adds nothing", () => {
    for (const name of ["Boss", "cycle 1", "Cycle", "Cycle one", "Cycle 1a", "", null]) {
        assert.strictEqual(RollCodeUtils.withCycleSuffix("2768", name), "2768", String(name));
    }
});

test("a name that is not Cycle N leaves an existing suffix alone", () => {
    assert.strictEqual(RollCodeUtils.withCycleSuffix("2768C1", "Boss"), "2768C1");
});

test("no thread code means nothing to suffix", () => {
    assert.strictEqual(RollCodeUtils.withCycleSuffix("", "Cycle 1"), "");
    assert.strictEqual(RollCodeUtils.withCycleSuffix(null, "Cycle 1"), "");
    assert.strictEqual(RollCodeUtils.withCycleSuffix(undefined, "Cycle 1"), "");
});

test("surrounding whitespace in the name is tolerated", () => {
    assert.strictEqual(RollCodeUtils.withCycleSuffix("2768", "  Cycle 1  "), "2768C1");
});
