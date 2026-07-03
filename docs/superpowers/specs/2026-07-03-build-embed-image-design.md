# Build Embed Image — Design

Date: 2026-07-03
Origin repo: `ts-builder` (static build editor)
New repo: `terrasphere-embed` (Node image server, separate git repo)

## Summary

Add a "Copy Embed" control to `build-sheet.html` that copies forum BBCode. The
BBCode references an image URL served by a new standalone Node server, which
decodes the build code and renders a compact WebP stats card (mastery icons +
ranks, expertise icons + ranks, saves, action names). Clicking the embedded
image on the forum opens the interactive builder.

Forum `[IMG]` tags issue a plain GET expecting image bytes, so a static/client
site cannot serve this — a backend endpoint is required. Server is deployed
under pm2 on a VPS (persistent process, no cold starts).

## Decisions (confirmed with user)

1. Clipboard payload = **clickable image BBCode**:
   `[URL={buildUrl}][IMG]{embedUrl}[/IMG][/URL]`.
2. Image format = **WebP**.
3. **Separate repo** for the server (`terrasphere-embed`); decode + data files
   are **vendored** (copied) into it and kept in sync manually.
4. Image content = mastery icons+ranks, expertise icons+ranks, saves, **action
   names**. **No** character name, **no** avatar (avatar URL is user-controlled
   in the build code → fetching it server-side is an SSRF/abuse vector, so it is
   excluded; the server never fetches user-supplied URLs).

## Deferred (design later, not in this spec)

- Exact visual layout / styling of the image (`src/template.js` ships a
  functional placeholder layout; a follow-up pass designs the final look).
- Final `EMBED_BASE` / `PUBLIC_BASE_URL` domain value.
- New repo filesystem path (default: sibling `../terrasphere-embed`).

---

## Deliverable A — Client "Copy Embed" (in `ts-builder`)

### Files
- Modify `build-sheet.html` — add an Embed share-option under the Build URL one
  (`build-sheet.html:248-256`).
- Modify `resource/build-sheet.js` — `generateBuildCodes()` (line ~1762) builds
  the embed BBCode; add an `EMBED_BASE` constant.

### Markup (after the existing Build URL `.share-option`)
```html
<div class="share-option">
  <label>Embed (forum BBCode):</label>
  <textarea id="embed-code" readonly></textarea>
  <button class="copy-button" data-target="embed-code">Copy</button>
</div>
```
The existing `.copy-button` handler (`build-sheet.js:2365`) already copies the
textarea named by `data-target`; no new copy logic needed.

### BBCode generation
In `generateBuildCodes(state)`:
- `buildURL` is already produced by `this.buildEncoder.generateCompactBuildCode(state)`
  and returns `"{baseURL}{code}"` with `baseURL = "https://terrarp.com/build/"`.
- Derive the raw `code` = `buildURL.slice(baseURL.length)` (or add a small
  helper on the encoder that returns the code alone — preferred, avoids string
  slicing coupling).
- Compose:
  ```js
  const embedUrl = `${EMBED_BASE}/embed/${encodeURIComponent(code)}.webp`;
  const bbcode = `[URL=${buildURL}][IMG]${embedUrl}[/IMG][/URL]`;
  ```
- Set `#embed-code` value to `bbcode`.
- `EMBED_BASE` = a top-of-file constant (client is static; domain baked in).
  Default placeholder `"https://embed.terrarp.com"` — final value TBD, single
  point of change.

### Encoder helper (preferred, avoids brittle slicing)
Add to `shared/build-encoder.js`:
```js
generateCompactBuildCodeRaw(state) {
  const baseURL = "https://terrarp.com/build/";
  return this.generateCompactBuildCode(state, baseURL).slice(baseURL.length);
}
```
Client uses this for `code`, and `generateCompactBuildCode(state)` for `buildURL`.

### Notes
- `code` may contain `|`, `%`, and other characters; `encodeURIComponent`
  makes it path-safe. The server decodes the path segment symmetrically.

---

## Deliverable B — Embed server (`terrasphere-embed`, new repo)

Node + Fastify, run under pm2. Stateless except an on-disk render cache.

### File structure
```
package.json          deps + "node --test" script
ecosystem.config.js   pm2 process config
.env.example          PORT, PUBLIC_BASE_URL, CACHE_DIR
server.js             Fastify app + routes
src/build-data.js     window-shim loader; exports decode + data
src/model.js          code -> normalized render model
src/render.js         model -> WebP buffer (satori -> resvg -> sharp)
src/template.js       satori layout (placeholder; visuals deferred)
src/icons.js          fetch + cache icon images by lookup
src/cache.js          disk cache: get/put by code hash
assets/font.ttf       bundled font for satori
vendor/               copied from ts-builder (see Vendoring)
  masteries.js expertise.js actions.js safecharacters.js
  build-encoder.js calculations.js
test/                 node --test files
README.md
```

### Dependencies
`fastify`, `satori`, `@resvg/resvg-js`, `sharp`, `dotenv`. (`satori-html`
optional if authoring layout as HTML rather than element objects.)

### Vendoring (reuse without fork of logic)
`vendor/` holds byte-copies of the six `ts-builder` files. They reference
browser globals (`window.masteries`, `window.expertise`, `window.actionlist`,
`window.charlist`), and each data file self-assigns e.g. `window.masteries =
masteries;`. `src/build-data.js` provides the shim:
```js
global.window = global.window || {};
require("../vendor/safecharacters.js"); // sets window.charlist
require("../vendor/masteries.js");      // sets window.masteries
require("../vendor/expertise.js");      // sets window.expertise
require("../vendor/actions.js");        // sets window.actionlist
// build-encoder.js / calculations.js define classes on window or as globals
```
Confirm at implementation time how `build-encoder.js` and `calculations.js`
expose their classes (they may need `global.window.BuildEncoder = ...` shim or a
small wrapper). Export a clean API:
```js
module.exports = {
  decode(code),          // -> raw decoded build object (via decodeCompactBuildCode)
  masteries, expertise, actionlist,
  calc,                  // calculations instance for saves
};
```
**Maintenance note:** when any vendored file changes in `ts-builder`, re-copy it
here. Keep a `vendor/SOURCE.md` listing source paths + the `ts-builder` commit
they were copied from.

### `src/model.js` — normalized render model
Input: raw `code` string. Steps:
1. Sanitize (see Security). Reject → throw `InvalidBuildError`.
2. `const build = buildData.decode(decodeURIComponent(code));`
3. Map to:
```js
{
  masteries: [{ lookup, image, rank }],   // rank as letter (getRankLabel)
  expertise: [{ lookup, image, rank }],
  saves:     { fortitude, reflex, ... },  // from calculations
  actions:   [ "Heal", "Empower", ... ],  // action.name for each chosenAction card
  equipment: { weapon, armor, accessory } // rank letters, if present
}
```
Icons: `image` fields come from the vendored data objects (mastery/expertise
`.image` = terrarp CDN URL), keyed by lookup — never from the build code.
Saves computed via the vendored `calculations` module (same logic as the app,
so the image matches the sheet).

### `src/icons.js` — icon fetch + cache
- `getIcon(url)`: return cached bytes if present (in-memory Map + disk under
  `CACHE_DIR/icons/`), else `fetch(url)` (Node 18+ global fetch), store, return.
- Only URLs originating from vendored data files are ever fetched (host is
  effectively `terrarp.com`); no user input reaches here.
- Satori consumes images as data URIs or ArrayBuffers; convert accordingly.

### `src/render.js` — model → WebP
1. `satori(template(model), { width, height, fonts: [bundledFont] })` → SVG.
2. `new Resvg(svg).render().asPng()` → PNG buffer.
3. `sharp(png).webp({ quality: 82 }).toBuffer()` → WebP buffer.
Return the WebP `Buffer`. Dimensions fixed (e.g. 600×N) — final size set with
the deferred visual design; use a sensible default now.

### `src/cache.js` — disk cache
- Key = `sha256(code)` hex (avoids filesystem-unsafe chars from raw code).
- `get(key)` → Buffer | null; `put(key, buffer)` → write `CACHE_DIR/{key}.webp`.
- Deterministic input → safe to cache forever.

### `server.js` — routes
- `GET /embed/:code.webp`
  1. Extract `:code` (Fastify strips the literal `.webp` suffix if the route is
     declared `"/embed/:code.webp"`; otherwise parse it off).
  2. `key = sha256(rawCode)`. Cache hit → stream file with headers below.
  3. Miss → `model.js` → `render.js` → `cache.put` → serve buffer.
  4. On `InvalidBuildError` or any decode/render failure → serve the static
     `assets/invalid.webp` (pre-rendered) with status 200 so the forum shows a
     placeholder rather than a broken image.
  - Response headers: `Content-Type: image/webp`,
    `Cache-Control: public, max-age=31536000, immutable`.
- `GET /health` → `200 {status:"ok"}`.

### Configuration
`.env` (via `dotenv`): `PORT` (default 8080), `PUBLIC_BASE_URL` (informational /
for absolute links if needed), `CACHE_DIR` (default `./cache`). `ecosystem.config.js`
declares the pm2 app (`name`, `script: server.js`, `env`).

---

## Security

- **No user-URL fetch:** avatar/banner excluded; the server only fetches icon
  URLs sourced from vendored static data, keyed by lookup. Eliminates SSRF.
- **Input sanitization:** cap raw code length (e.g. ≤ 4 KB); the decoder is
  wrapped in try/catch; malformed input yields the invalid-build image, never a
  crash or unbounded work.
- **No secrets, no writes outside `CACHE_DIR`.** Cache filenames are sha256
  hex — no path traversal from user input.
- **Resource bounds:** fixed output dimensions; icon fetches cached to avoid
  hammering the CDN; consider a small in-flight de-dupe so concurrent requests
  for the same uncached code render once.

## Error Handling

| Case | Behavior |
|------|----------|
| Undecodable / malformed code | 200 + `assets/invalid.webp` |
| Icon fetch failure | Render with a placeholder glyph for that icon; still return card |
| Render exception | 200 + `assets/invalid.webp`; log error |
| `/health` | 200 always while process up |

## Testing (`node --test`, in `terrasphere-embed`)

1. **Decode reuse:** feed a known-good code (captured from the live app) →
   assert `model.masteries` lookups/ranks, `saves`, and `actions` match expected.
2. **Render output:** `render(model)` returns a Buffer whose bytes start with
   `RIFF....WEBP` (WebP magic).
3. **Cache hit:** call the render path twice for one code; assert the second
   call reads from disk (spy/flag) and does not invoke satori.
4. **Bad code:** `model(decode)` on junk throws `InvalidBuildError`; the route
   returns the invalid image with 200.
5. **Sanitization:** over-length / non-string code rejected before decode.
6. **Icons keyed by lookup only:** assert no code path passes build-code-derived
   strings into `getIcon`.

Client side (Deliverable A) has no test runner in `ts-builder`; verify manually
that the Embed textarea holds well-formed BBCode and Copy works, plus a headless
string-assembly check in the existing jsdom harness style if desired.

## Build Order

1. Deliverable A (client button) — independently shippable; produces BBCode even
   before the server exists (image 404s until B is deployed, but the copy flow
   works and can be verified).
2. Deliverable B (server) — its own repo, own plan.

Each deliverable gets its own implementation plan.
