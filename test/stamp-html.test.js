"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { stampHtml, makeStamp } = require("../scripts/stamp-version.js");

const STAMP = "20260913-143200";

test("stamps a relative script src", () => {
    const out = stampHtml('<script src="shared/state-manager.js"></script>', STAMP);
    assert.strictEqual(out, '<script src="shared/state-manager.js?v=20260913-143200"></script>');
});

test("stamps a relative stylesheet href", () => {
    const out = stampHtml('<link rel="stylesheet" href="css/app.css">', STAMP);
    assert.strictEqual(out, '<link rel="stylesheet" href="css/app.css?v=20260913-143200">');
});

test("replaces an existing stamp instead of appending a second one", () => {
    const out = stampHtml('<script src="shared/x.js?v=20200101-000000"></script>', STAMP);
    assert.strictEqual(out, '<script src="shared/x.js?v=20260913-143200"></script>');
});

test("leaves absolute URLs alone", () => {
    const html = '<link rel="shortcut icon" href="https://www.terrarp.com//favicon.ico">' +
        '<link rel="preconnect" href="https://fonts.gstatic.com">' +
        '<script src="https://cdn.example.com/lib.js"></script>';
    assert.strictEqual(stampHtml(html, STAMP), html);
});

test("leaves anchor links and images alone", () => {
    const html = '<a href="saved-builds.html">Saved</a><img src="https://terrarp.com/db/logo/logo-xs.png">';
    assert.strictEqual(stampHtml(html, STAMP), html);
});

test("stamps every asset in a page, not just the first", () => {
    const html = '<script src="a.js"></script>\n<link href="b.css" rel="stylesheet">\n<script src="c/d.js"></script>';
    const out = stampHtml(html, STAMP);
    assert.strictEqual((out.match(/\?v=20260913-143200/g) || []).length, 3);
});

test("makeStamp formats local time as YYYYMMDD-HHmmss", () => {
    const d = new Date(2026, 8, 13, 14, 32, 5); // months are 0-based: 8 = September
    assert.strictEqual(makeStamp(d), "20260913-143205");
});
