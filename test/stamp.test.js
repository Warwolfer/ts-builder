// test/stamp.test.js
//
// Fails whenever an upload would be unstamped: every local .js/.css asset in
// every root HTML file must carry ?v=<stamp>, all stamps must agree, and they
// must match shared/app-version.js and version.json.
"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { htmlFiles, ROOT } = require("../scripts/stamp-version.js");

// Any local .js/.css reference in a script/link tag, stamped or not.
const ANY_ASSET_RE =
    /(?:<script[^>]*\ssrc|<link[^>]*\shref)="([^"#:?]+\.(?:js|css))(\?v=([^"]*))?"/g;

function stampsIn(html) {
    const found = [];
    let m;
    while ((m = ANY_ASSET_RE.exec(html)) !== null) {
        found.push({ file: m[1], stamp: m[3] || null });
    }
    return found;
}

test("every local asset in every root HTML file is stamped with one shared stamp", () => {
    const stamps = new Set();
    const unstamped = [];
    for (const file of htmlFiles()) {
        const html = fs.readFileSync(file, "utf8");
        for (const a of stampsIn(html)) {
            if (!a.stamp) unstamped.push(`${path.basename(file)}: ${a.file}`);
            else stamps.add(a.stamp);
        }
    }
    assert.deepStrictEqual(unstamped, [], "run `pnpm run stamp` before committing HTML changes");
    assert.strictEqual(stamps.size, 1, `expected one stamp across all pages, got: ${[...stamps].join(", ")}`);
});

test("shared/app-version.js and version.json carry the same stamp as the pages", () => {
    const html = fs.readFileSync(path.join(ROOT, "build-sheet.html"), "utf8");
    const pageStamp = stampsIn(html).find((a) => a.stamp).stamp;

    const appVersion = fs.readFileSync(path.join(ROOT, "shared", "app-version.js"), "utf8");
    assert.match(appVersion, new RegExp(`window\\.TS_BUILD = "${pageStamp}";`));

    const json = JSON.parse(fs.readFileSync(path.join(ROOT, "version.json"), "utf8"));
    assert.strictEqual(json.build, pageStamp);
});

test("the stamp looks like YYYYMMDD-HHmmss", () => {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, "version.json"), "utf8"));
    assert.match(json.build, /^\d{8}-\d{6}$/);
});
