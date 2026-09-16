"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

const Card = require(path.join(__dirname, "..", "shared", "components", "custom-action-card.js"));

const splitter = {
    v: 1,
    n: "Enraged Tide Splitter",
    d: "The tide answers.",
    p: [["Base damage", "20d20"]],
    k: ["fortitude"],
    g: [
        [40, "Take an additional 20d20 damage"],
        [60, "Take an additional 12d20 damage"],
        [null, "Take an additional 2d20 damage"],
    ],
};

test("the chart labels every band from its neighbours", () => {
    const html = Card.chartHtml(splitter);
    assert.match(html, /<b>\(40 or under\)<\/b>/);
    assert.match(html, /<b>\(41-60\)<\/b>/);
    assert.match(html, /<b>\(61\+\)<\/b>/);
});

test("the body carries name, description and the pre-roll dice", () => {
    const html = Card.bodyHtml(splitter);
    assert.match(html, /ca-card-title">Enraged Tide Splitter</);
    assert.match(html, /ca-card-desc">The tide answers\./);
    assert.match(html, /ca-card-dice">Base damage: 20d20</);
});

test("a kind badge shows the save icon and the label", () => {
    const html = Card.kindBadge("fortitude");
    assert.match(html, /<img src="https:\/\/terrarp\.com\/db\/tool\/fortitude\.png" alt="">/);
    assert.match(html, /Fortitude</);
});

test("a check badge has a label but no icon", () => {
    const html = Card.kindBadge("mastery");
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /Mastery Check</);
});

test("an unknown kind falls back to its own name, escaped", () => {
    assert.match(Card.kindBadge("<b>x"), /&lt;b&gt;x/);
});

test("every field is escaped", () => {
    const html = Card.bodyHtml({
        v: 1,
        n: '<script>"x"',
        d: "a & b",
        p: [["<i>", "1d6"]],
        g: [[null, "<hr>"]],
    });
    assert.doesNotMatch(html, /<script>|<i>|<hr>/);
    assert.match(html, /&lt;script&gt;&quot;x&quot;/);
    assert.match(html, /a &amp; b/);
});

test("optional parts are simply absent", () => {
    const html = Card.bodyHtml({ v: 1, n: "Bare", g: [[null, "nothing"]] });
    assert.doesNotMatch(html, /ca-card-desc/);
    assert.doesNotMatch(html, /ca-card-dice/);
    assert.doesNotMatch(html, /ca-kind-badges/);
});

test("a dice row with no label prints just the dice", () => {
    const html = Card.bodyHtml({ v: 1, n: "Bare", p: [["", "20d20"]], g: [[null, "x"]] });
    assert.match(html, /ca-card-dice">20d20</);
});

test("detailHtml is the body without the title or the kind badges", () => {
    const html = Card.detailHtml(splitter);
    assert.doesNotMatch(html, /ca-card-title/);
    assert.doesNotMatch(html, /ca-kind-badge/);
    assert.match(html, /ca-card-desc">The tide answers\./);
    assert.match(html, /ca-card-dice">Base damage: 20d20/);
    assert.match(html, /ca-chart/);
});

test("detailHtml drops the description when there is none", () => {
    const html = Card.detailHtml({ v: 1, n: "Bare", g: [[null, "x"]] });
    assert.doesNotMatch(html, /ca-card-desc/);
    assert.match(html, /ca-chart/);
});
