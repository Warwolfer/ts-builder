"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { DOMUtils, RollCodeUtils, actionToggleButtons } = load();
const { insertRollTag, removeRollTag, setRollExtraMod } = RollCodeUtils;

const RISKY_ACTIONS = ["reckless-attack", "sharp-attack"];

// The roll code as rendered for Reckless Attack on an NG+ character that has
// picked Lethal, with the Lethal +10 already substituted into the passive span.
const RECKLESS_HTML =
    "?r reckless <span class='masteryreplace'>MR</span> B " +
    '<span class="damagepassivemod">+10 </span># ' +
    "<span class='mnamereplace'>Mastery</span> · " +
    "<span class='breaktype'>Break-Type</span> · Lune · Lethal · NG1 · " +
    "<span class='thrcode'>2768</span>";

function asText(html) {
    return html.replace(/<\/?span[^>]*>/g, "");
}

test("both risky-mode actions declare the same Risky toggle", () => {
    for (const lookup of RISKY_ACTIONS) {
        const entry = (actionToggleButtons[lookup] || []).find(
            (c) => c.onclick === "toggleRisky",
        );
        assert.ok(entry, `${lookup} should have a Risky toggle`);
        assert.strictEqual(entry.suffix, "Risky Mode");
        assert.strictEqual(entry.hasInput, true, `${lookup} Risky needs a modifier input`);
        assert.strictEqual(entry.beforeThreadCode, true);
    }
    // One shared declaration, so the two can never drift apart.
    assert.strictEqual(
        actionToggleButtons["reckless-attack"],
        actionToggleButtons["sharp-attack"],
    );
});

test("every toggle with an input names its update handler", () => {
    for (const [lookup, configs] of Object.entries(actionToggleButtons)) {
        for (const config of configs) {
            if (!config.hasInput) continue;
            assert.strictEqual(
                typeof config.updateFunction,
                "string",
                `${lookup}/${config.suffix} has an input but no updateFunction`,
            );
        }
    }
});

test("a multi-word suffix slugs to one valid class name", () => {
    // ".risky mode-input" is a two-part selector that can never match.
    assert.strictEqual(DOMUtils.slugify("Risky Mode"), "risky-mode");
    assert.strictEqual(DOMUtils.slugify("Release"), "release");
});

test("Risky Mode tag lands before the thread code", () => {
    const tagged = insertRollTag(RECKLESS_HTML, "Risky Mode");
    assert.strictEqual(
        asText(tagged),
        "?r reckless MR B +10 # Mastery · Break-Type · Lune · Lethal · NG1 · Risky Mode · 2768",
    );
});

test("removing the Risky Mode tag restores the original roll code", () => {
    const tagged = insertRollTag(RECKLESS_HTML, "Risky Mode");
    assert.strictEqual(removeRollTag(tagged, "Risky Mode"), RECKLESS_HTML);
});

test("inserting the same tag twice is a no-op", () => {
    const once = insertRollTag(RECKLESS_HTML, "Risky Mode");
    assert.strictEqual(insertRollTag(once, "Risky Mode"), once);
});

test("extra mod is appended after the passive mod, not over it", () => {
    const html = setRollExtraMod(RECKLESS_HTML, "30");
    assert.strictEqual(
        asText(html),
        "?r reckless MR B +10 +30 # Mastery · Break-Type · Lune · Lethal · NG1 · 2768",
    );
});

test("extra mod keeps an explicit sign and accepts dice", () => {
    assert.match(asText(setRollExtraMod(RECKLESS_HTML, "+30")), /B \+10 \+30 #/);
    assert.match(asText(setRollExtraMod(RECKLESS_HTML, "-5")), /B \+10 -5 #/);
    assert.match(asText(setRollExtraMod(RECKLESS_HTML, "1d100 +30")), /B \+10 \+1d100 \+30 #/);
});

test("extra mod is escaped before it reaches innerHTML", () => {
    const html = setRollExtraMod(RECKLESS_HTML, '<img src=x onerror="boom">');
    assert.ok(!html.includes("<img"), "raw markup must not survive");
    assert.match(html, /&lt;img/);
});

test("extra mod works when there is no passive mod", () => {
    const bare =
        "?r sharp <span class='masteryreplace'>MR</span> B " +
        '<span class="damagepassivemod"></span># ' +
        "<span class='thrcode'>2768</span>";
    assert.strictEqual(asText(setRollExtraMod(bare, "40")), "?r sharp MR B +40 # 2768");
});

test("re-typing replaces the previous extra mod rather than stacking", () => {
    const once = setRollExtraMod(RECKLESS_HTML, "30");
    assert.match(asText(setRollExtraMod(once, "70")), /B \+10 \+70 #/);
});

test("clearing the extra mod restores the original roll code", () => {
    const once = setRollExtraMod(RECKLESS_HTML, "30");
    assert.strictEqual(setRollExtraMod(once, ""), RECKLESS_HTML);
});
