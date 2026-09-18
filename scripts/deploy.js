// scripts/deploy.js — push the builder to the web host over FTP.
//
// Replaces the by-hand routine of: run the tests, run the stamp, open an FTP
// client, and drag the public files into the folder it opens on. The order
// matters and is easy to get wrong by hand — an unstamped upload leaves every
// browser and Cloudflare on the previous build (see scripts/serve.js).
//
//   pnpm ship                # test, stamp, upload
//   pnpm ship --dry-run      # test, stamp, list what WOULD upload, no connection
//
// Credentials come from .env.deploy in the repo root, which .gitignore keeps
// out of every commit:
//
//   FTP_HOST=example.com
//   FTP_USER=someone
//   FTP_PASS=secret
//
// Only the public files go up. Tests, docs, scripts, package files and
// debug.html stay home. The list is explicit rather than "everything git
// tracks", so adding a new tool or doc to the repo never puts it on the site.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const ftp = require("basic-ftp");
const stamp = require("./stamp-version");

const ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.deploy");

// What the site is made of, in the order it must go up. Assets first, HTML
// next, version.json last: an HTML file that lands before the JS it points at
// lets Cloudflare cache the OLD JS under the NEW ?v= URL for up to two hours,
// and version.json is what tells a stale page to reload, so it goes up only
// once everything it would reload into is in place. (See CLAUDE.md, Cache
// busting.) Root HTML files are found by pattern so a new page ships without
// editing this list; directories are named on purpose.
const PUBLIC_DIRS = ["shared", "resource", "css"];
const LAST_FILE = "version.json";
const EXCLUDED_HTML = new Set(["debug.html"]);

/** KEY=VALUE lines, # comments, blank lines. Nothing fancier is needed. */
function readEnvFile(file) {
    if (!fs.existsSync(file)) {
        throw new Error(
            `Missing ${path.relative(ROOT, file)}.\n` +
            "Create it with FTP_HOST, FTP_USER and FTP_PASS, one per line. " +
            "It is gitignored."
        );
    }
    const out = {};
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    for (const key of ["FTP_HOST", "FTP_USER", "FTP_PASS"]) {
        if (!out[key]) throw new Error(`${path.relative(ROOT, file)} has no ${key}.`);
    }
    return out;
}

function publicHtmlFiles() {
    return fs.readdirSync(ROOT)
        .filter((f) => f.endsWith(".html") && !EXCLUDED_HTML.has(f))
        .sort();
}

/** Runs a command with inherited stdio; throws on a non-zero exit. */
function run(cmd, args) {
    const result = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: true });
    if (result.status !== 0) {
        throw new Error(`${cmd} ${args.join(" ")} exited with ${result.status}`);
    }
}

/** The upload plan, in order. Each step is [label, kind, name]. */
function uploadPlan() {
    const plan = [];
    for (const dir of PUBLIC_DIRS) plan.push({ kind: "dir", name: dir });
    for (const html of publicHtmlFiles()) plan.push({ kind: "file", name: html });
    plan.push({ kind: "file", name: LAST_FILE });
    return plan;
}

function label(step) {
    return step.kind === "dir" ? `${step.name}/` : step.name;
}

async function upload(env, plan) {
    const client = new ftp.Client();
    try {
        await client.access({
            host: env.FTP_HOST,
            user: env.FTP_USER,
            password: env.FTP_PASS,
            secure: false,
        });
        // The account opens on the web root, so paths are relative to it.
        for (const step of plan) {
            if (step.kind === "dir") {
                await client.uploadFromDir(path.join(ROOT, step.name), step.name);
            } else {
                await client.uploadFrom(path.join(ROOT, step.name), step.name);
            }
            console.log(`  ${label(step)}`);
        }
    } finally {
        client.close();
    }
}

async function main() {
    const dryRun = process.argv.includes("--dry-run");

    // Read credentials first, so a missing file fails before the tests
    // spend their time.
    const env = readEnvFile(ENV_FILE);

    console.log("== tests");
    run("node", ["--test"]);

    console.log("== stamp");
    const build = stamp.run();
    console.log(`   ${build}`);

    const plan = uploadPlan();

    if (dryRun) {
        console.log("== would upload, in this order (dry run, no connection made)");
        for (const step of plan) console.log(`  ${label(step)}`);
        return;
    }

    console.log(`== uploading to ${env.FTP_HOST} as ${env.FTP_USER}`);
    await upload(env, plan);
    console.log(`== done, build ${build} is live`);
}

main().catch((err) => {
    console.error(`deploy failed: ${err.message}`);
    process.exit(1);
});
