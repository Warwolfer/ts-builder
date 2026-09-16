// scripts/serve.js — a local dev server that never lets the browser cache.
//
// `python -m http.server` sends no Cache-Control, so a browser is free to keep
// index.html and build-sheet.html on its own heuristics. A kept HTML file still
// points every asset at the OLD `?v=` stamp, so the whole page silently stays
// on the previous build while the files on disk are current. That has already
// cost two rounds of "it still is not fixed" on work that was fixed.
//
// This sends `Cache-Control: no-store` on everything, so what you see is always
// what is on disk.
//
//   pnpm run serve            # http://localhost:3001
//   pnpm run serve -- 8080    # another port
//
// It is a dev tool only. Nothing on terrarp.com runs this.

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2]) || 3001;

const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
};

// A request path is attacker-shaped by definition: it can carry "..", a leading
// slash or a URL-encoded separator. Resolve it and then require the result to
// still sit inside ROOT, rather than trying to spot bad input by pattern.
function resolveWithin(urlPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
    } catch (e) {
        return null;
    }
    if (decoded.endsWith("/")) decoded += "index.html";
    const full = path.resolve(ROOT, "." + path.posix.normalize(decoded));
    if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
    return full;
}

http.createServer(function (req, res) {
    const file = resolveWithin(req.url || "/");
    if (!file) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden");
        return;
    }

    fs.readFile(file, function (err, body) {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
            res.end("Not found: " + req.url);
            return;
        }
        res.writeHead(200, {
            "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
            // The whole point of this file.
            "Cache-Control": "no-store, must-revalidate",
        });
        res.end(body);
    });
}).listen(PORT, function () {
    console.log("Serving " + ROOT);
    console.log("  http://localhost:" + PORT + "/build-sheet.html");
    console.log("Cache-Control: no-store on every response.");
});
