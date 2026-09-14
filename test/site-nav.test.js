"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
require(path.join(__dirname, "..", "shared", "components", "site-nav.js"));
const { SiteNav } = global.window;

test("renders the three links with relative hrefs", () => {
    const html = SiteNav.render("build-sheet.html");
    assert.match(html, /href="index\.html"[^>]*>Build Planner</);
    assert.match(html, /href="saved-builds\.html"[^>]*>Saved Builds</);
    assert.match(html, /href="dm-screen\.html"[^>]*>DM Screen</);
    assert.doesNotMatch(html, /https:\/\/terrarp\.com\/build\/index\.html/);
});

test("marks the current page active and nothing else", () => {
    const html = SiteNav.render("saved-builds.html");
    assert.match(html, /class="active"[^>]*href="saved-builds\.html"|href="saved-builds\.html"[^>]*class="active"/);
    assert.strictEqual((html.match(/class="active"/g) || []).length, 1);
});

test("the build flow pages all count as Build Planner", () => {
    for (const page of ["index.html", "mastery-selector.html", "expertise-selector.html",
                        "rank-selector.html", "action-selector.html", "build-sheet.html"]) {
        const html = SiteNav.render(page);
        assert.match(html, /class="active"[^>]*href="index\.html"|href="index\.html"[^>]*class="active"/, page);
    }
});

test("an unknown page marks nothing active", () => {
    assert.doesNotMatch(SiteNav.render("debug.html"), /class="active"/);
    assert.doesNotMatch(SiteNav.render(""), /class="active"/);
});

test("keeps the existing nav markup so app.css still applies", () => {
    const html = SiteNav.render("index.html");
    assert.match(html, /<nav id="mw-navigation" class="fixed-top">/);
    assert.match(html, /class="navbar-brand"/);
    assert.match(html, /class="nav-left"/);
    assert.match(html, /class="link"/);
});

test("mount is safe when there is no document", () => {
    assert.doesNotThrow(() => SiteNav.mount("index.html"));
});
