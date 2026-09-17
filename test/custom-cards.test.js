"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
require(path.join(__dirname, "..", "shared", "custom-action-codec.js"));
require(path.join(__dirname, "..", "shared", "components", "custom-action-card.js"));
const CustomCards = require(path.join(__dirname, "..", "resource", "custom-cards.js"));

const action = {
    v: 1,
    n: "Enraged Tide Splitter",
    d: "The tide answers.",
    p: [["Base damage", "20d20"]],
    k: ["fortitude", "mastery"],
    g: [[40, "Take an additional 20d20 damage"], [null, "Take an additional 2d20 damage"]],
};
const entry = { id: "c1", action: action, payload: "1PAYLOAD" };

const opts = {
    characterName: "Kaelo",
    threadCode: "2768",
    ng: 0,
    masteries: [{ lookup: "power", name: "Power", image: "power.png" }],
    expertise: [{ lookup: "cooking", name: "Cooking", image: "cook.png", borderColor: "#d2aa49" }],
};

test("the card is a .card carrying its local id", () => {
    const html = CustomCards.cardHtml(entry, opts);
    assert.match(html, /class="card customcard"/);
    assert.match(html, /data-custom-id="c1"/);
});

test("the card body is the shared renderer's", () => {
    const html = CustomCards.cardHtml(entry, opts);
    assert.match(html, /ca-chart/);
    assert.match(html, /\(40 or under\)/);
});

test("the roll code puts the payload first and the name in the comment", () => {
    const html = CustomCards.rollCodeHtml(entry, opts);
    assert.match(html, /\?r custom 1PAYLOAD <span class='customkind'>type<\/span>/);
    assert.match(html, /# Enraged Tide Splitter · <span class='customtype'>Type<\/span> · Kaelo · <span class='thrcode'>2768<\/span>/);
});

test("an unset thread code keeps the placeholder the stamper looks for", () => {
    const html = CustomCards.rollCodeHtml(entry, { ...opts, threadCode: "" });
    assert.match(html, /<span class='thrcode'>Thread Code<\/span>/);
});

test("an unset character name keeps the placeholder", () => {
    const html = CustomCards.rollCodeHtml(entry, { ...opts, characterName: "" });
    assert.match(html, / · Character Name · /);
});

test("NG1 is stamped into the comment for an NG+ character", () => {
    const html = CustomCards.rollCodeHtml(entry, { ...opts, ng: 1 });
    assert.match(html, / · NG1 · <span class='thrcode'>/);
});

test("NG1 is absent for everyone else", () => {
    assert.doesNotMatch(CustomCards.rollCodeHtml(entry, opts), /NG1/);
});

test("only the kinds the action allows get icons", () => {
    const html = CustomCards.iconsHtml(action, opts);
    assert.match(html, /data-kind="fortitude"/);
    assert.match(html, /data-kind="mastery"/);
    assert.doesNotMatch(html, /data-kind="reflex"/);
    assert.doesNotMatch(html, /data-kind="will"/);
    assert.doesNotMatch(html, /data-kind="expertise"/);
});

test("a mastery kind draws one icon per chosen mastery", () => {
    const html = CustomCards.iconsHtml(action, opts);
    assert.match(html, /data-kind="mastery" data-lookup="power"/);
    assert.match(html, /src='power\.png'/);
});

test("an expertise kind draws one icon per chosen expertise, with its colour", () => {
    const html = CustomCards.iconsHtml({ ...action, k: ["expertise"] }, opts);
    assert.match(html, /data-kind="expertise" data-lookup="cooking"/);
    assert.match(html, /border-color: #d2aa49/);
});

test("icons are .masterycircle so the roll-code gate blocks the card", () => {
    const html = CustomCards.iconsHtml(action, opts);
    assert.match(html, /class='display masterycircle(?: |')/);
});

test("a save icon carries its aci- class, the way the built-in Saves card does", () => {
    // .aci-fortitude / .aci-reflex / .aci-will is what paints the red border in
    // css/app.css. It is the icon's own colour, not a selected state, so
    // without it a custom card's save icons read as a different control.
    const html = CustomCards.iconsHtml(
        { ...action, k: ["fortitude", "reflex", "will"] },
        opts,
    );
    assert.match(html, /class='display masterycircle aci-fortitude'/);
    assert.match(html, /class='display masterycircle aci-reflex'/);
    assert.match(html, /class='display masterycircle aci-will'/);
});

test("no data-mastery attribute, so the gate asks for a type and plan mode skips the card", () => {
    assert.doesNotMatch(CustomCards.iconsHtml(action, opts), /data-mastery/);
});

test("an action with no k gets every save plus the character's checks", () => {
    const html = CustomCards.iconsHtml({ ...action, k: undefined }, opts);
    for (const kind of ["fortitude", "reflex", "will"]) {
        assert.match(html, new RegExp('data-kind="' + kind + '"'));
    }
    assert.match(html, /data-kind="mastery"/);
    assert.match(html, /data-kind="expertise"/);
});

test("a mastery kind with no masteries chosen draws nothing for it", () => {
    const html = CustomCards.iconsHtml({ ...action, k: ["mastery"] }, { ...opts, masteries: [] });
    assert.doesNotMatch(html, /masterycircle/);
});

test("the name is escaped everywhere it appears", () => {
    const nasty = { id: "c2", action: { ...action, n: '"><img src=x>' }, payload: "1P" };
    const html = CustomCards.cardHtml(nasty, opts);
    assert.doesNotMatch(html, /<img src=x>/);
});

test("the character name is escaped", () => {
    const html = CustomCards.rollCodeHtml(entry, { ...opts, characterName: "<b>K" });
    assert.doesNotMatch(html, /<b>K/);
});

test("two actions with the same fields are the same action", () => {
    assert.strictEqual(CustomCards.sameAction(action, JSON.parse(JSON.stringify(action))), true);
});

test("a different degree text makes a different action", () => {
    const other = { ...action, g: [[40, "changed"], [null, "Take an additional 2d20 damage"]] };
    assert.strictEqual(CustomCards.sameAction(action, other), false);
});

test("a different description makes a different action", () => {
    assert.strictEqual(CustomCards.sameAction(action, { ...action, d: "other" }), false);
});

test("key order does not matter", () => {
    const reordered = { g: action.g, k: action.k, p: action.p, d: action.d, n: action.n, v: 1 };
    assert.strictEqual(CustomCards.sameAction(action, reordered), true);
});

test("a screen code is refused with the spec's wording", () => {
    assert.strictEqual(
        CustomCards.screenRefusal(),
        "That is a DM Screen code. Open it on the DM Screen page.",
    );
});

test("dedupe keeps what is new and counts what is not", () => {
    const other = { ...action, n: "Another" };
    const out = CustomCards.dedupe([action, other], [{ id: "c1", action: action, payload: "1P" }]);
    assert.strictEqual(out.fresh.length, 1);
    assert.strictEqual(out.fresh[0].n, "Another");
    assert.strictEqual(out.skipped, 1);
});

test("dedupe also catches duplicates inside one pasted list", () => {
    const out = CustomCards.dedupe([action, JSON.parse(JSON.stringify(action))], []);
    assert.strictEqual(out.fresh.length, 1);
    assert.strictEqual(out.skipped, 1);
});

test("dedupe with nothing to skip reports zero", () => {
    const out = CustomCards.dedupe([action], []);
    assert.strictEqual(out.fresh.length, 1);
    assert.strictEqual(out.skipped, 0);
});

test("isWellFormedEntry accepts a real entry", () => {
    assert.strictEqual(CustomCards.isWellFormedEntry(entry), true);
});

test("isWellFormedEntry rejects an entry with no action", () => {
    assert.strictEqual(CustomCards.isWellFormedEntry({ id: "c1" }), false);
});

test("isWellFormedEntry rejects a null action", () => {
    assert.strictEqual(CustomCards.isWellFormedEntry({ id: "c1", action: null, payload: "1P" }), false);
});

test("isWellFormedEntry rejects an action missing g", () => {
    assert.strictEqual(
        CustomCards.isWellFormedEntry({ id: "c1", action: { n: "Hit" }, payload: "1P" }),
        false,
    );
});

test("isWellFormedEntry rejects an action whose g is not an array", () => {
    assert.strictEqual(
        CustomCards.isWellFormedEntry({ id: "c1", action: { n: "Hit", g: "nope" }, payload: "1P" }),
        false,
    );
});

test("isWellFormedEntry rejects a non-string n", () => {
    assert.strictEqual(
        CustomCards.isWellFormedEntry({ id: "c1", action: { n: 5, g: [] }, payload: "1P" }),
        false,
    );
});

test("isWellFormedEntry rejects a bare null entry", () => {
    assert.strictEqual(CustomCards.isWellFormedEntry(null), false);
});

test("isWellFormedEntry rejects an entry missing payload", () => {
    assert.strictEqual(CustomCards.isWellFormedEntry({ id: "c1", action: action }), false);
});

test("cardHtml flags a card with no icons to offer as needing a pick", () => {
    const html = CustomCards.cardHtml(
        { id: "c3", action: { ...action, k: ["mastery"] }, payload: "1P" },
        { ...opts, masteries: [] },
    );
    assert.match(html, /data-requires-pick="1"/);
    assert.match(html, /customcard-needspick/);
});

test("cardHtml does not flag a card that has at least one icon", () => {
    const html = CustomCards.cardHtml(entry, opts);
    assert.doesNotMatch(html, /data-requires-pick/);
});

test("dedupe ignores malformed existing entries instead of throwing", () => {
    const out = CustomCards.dedupe([action], [
        { id: "bad" },
        { id: "worse", action: null },
        { id: "ok", action: action },
    ]);
    assert.strictEqual(out.fresh.length, 0);
    assert.strictEqual(out.skipped, 1);
});

// --- the card wears the built-in action card's skeleton ---------------------
// Matching it element for element is what gives the card the same padding,
// title weight and type pill as its neighbours, and what lets Compact's
// .cardinfo rule and Plan's .cardinfo / .masteryicon rules apply to it.

test("the card uses the same header skeleton as a built-in action card", () => {
    const html = CustomCards.cardHtml(entry, opts);
    assert.match(html, /<div class="cardtop"><div class="cardtopleft"><div class="cardtitle">Enraged Tide Splitter<\/div>/);
    assert.match(html, /<div class="filler"><\/div><p class="type">/);
});

test("the description, dice and chart live in .cardinfo", () => {
    const html = CustomCards.cardHtml(entry, opts);
    const info = html.slice(html.indexOf('<div class="cardinfo">'));
    assert.match(info, /ca-card-desc/);
    assert.match(info, /ca-card-dice/);
    assert.match(info, /ca-chart/);
});

test("the icon row carries .masteryicon so the shared rules reach it", () => {
    assert.match(CustomCards.cardHtml(entry, opts), /class="masteryicon customicons"/);
});

test("the type pill names the rolls the action allows", () => {
    const html = CustomCards.cardHtml(entry, opts);
    assert.match(html, /<p class="type">Fortitude \/ Mastery Check<\/p>/);
});

test("one allowed kind gives the pill that kind's label", () => {
    const one = { id: "c9", action: { ...action, k: ["expertise"] }, payload: "1P" };
    assert.match(CustomCards.cardHtml(one, opts), /<p class="type">Expertise Check<\/p>/);
});

test("an action that allows everything just says Custom", () => {
    for (const k of [undefined, ["fortitude", "reflex", "will", "mastery", "expertise"]]) {
        const any = { id: "c8", action: { ...action, k }, payload: "1P" };
        assert.match(CustomCards.cardHtml(any, opts), /<p class="type">Custom<\/p>/, String(k));
    }
});

test("the title in the pill and the header is escaped", () => {
    const nasty = { id: "c7", action: { ...action, n: '"><img src=x>' }, payload: "1P" };
    assert.doesNotMatch(CustomCards.cardHtml(nasty, opts), /<img src=x>/);
});
