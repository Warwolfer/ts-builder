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
5. **No disk cache.** Server is a stateless renderer; caching is delegated to
   upstream (XenForo image proxy / CDN / browser) via an `immutable`
   `Cache-Control` header, since a given code always renders the same image.
   Only a small bounded in-memory LRU + in-flight dedupe live in-process. Zero
   persistent storage, no eviction/cleanup, nothing lost on restart.

## Chosen layout — "Design 4" (decided 2026-07-04)

The image layout is locked. Reference mockup lives at
`docs/superpowers/assets/embed-mockup-design4.html` (open in a browser; it
inlines real terrarp icons as data URIs). `src/template.js` must reproduce it:

- **Dark, transparent background.** No card fill — the whole image is
  transparent so it blends into the forum. Dark-mode styling only (no light
  variant).
- **Width 738px**, compact height. Rows stacked with a small (~5px) gap.
- **Row 1 — Masteries + Expertise:** two groups on one line (`gap:28px`). Each
  entry is a 32px circular icon (the real mastery/expertise PNG) with a 2px ring
  in the builder **role/type color** (offense `#bd4444`, defense `#ce832c`,
  support `#589edc`, alter `#6436b1`; expertise by first type: physical
  `#ce6541`, creative `#a84b72`, crafting `#d2aa49`, else `#6e51cb`). A small
  rank badge sits at the icon's bottom-right corner. Icon background transparent.
- **Row 2 — Saves + Gear:** compact pills (`Fort +30`, `Ref +15`, `Will +10`,
  `WPN A`, `ARM HEAVY B`, `ACC C`). Armor pill includes the armor **type**.
  Label and value share font-size 11px + `line-height:1` so they align.
- **Row 3 — Actions:** full-width row of compact pills, each with a
  **role-colored bottom border** (same role palette as masteries). All actions
  on one line.
- **Rank / value colors:** by builder rank color (S `#fbbf24`, A `#fb923c`,
  B `#f472b6`, C `#4ade80`, D `#60a5fa`) by default.

### Render parameter — `ranksWhite` (toggle)
The renderer MUST accept an optional flag to draw all ranks and save/gear
numbers **plain white** instead of the rank colors. Surface it in the image URL,
e.g. `/embed/{code}.webp?mono=1` (query flag; default off = colored ranks). Keep
the flag part of the cache key (`sha256(code + "|mono=" + flag)`) so the two
variants cache independently. Deliverable A's BBCode builder can later append
the flag if the user wants the white variant; default emits no flag.

## Deferred (design later, not in this spec)

- Final `EMBED_BASE` / `PUBLIC_BASE_URL` domain value.
- New repo filesystem path (default: sibling `../terrasphere-embed`).
- Whether to expose the `ranksWhite` toggle in the builder UI (the client can
  emit the flag; a UI switch for it is a later, optional nicety).

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

Node + Fastify, run under pm2. Fully stateless — no disk cache; upstream caches
(via `immutable` headers) plus a small in-memory LRU carry repeat load.

### File structure
```
package.json          deps + "node --test" script
ecosystem.config.js   pm2 process config
.env.example          PORT, PUBLIC_BASE_URL
server.js             Fastify app + routes
src/build-data.js     window-shim loader; exports decode + data
src/model.js          code -> normalized render model
src/render.js         model -> WebP buffer (satori -> resvg -> sharp)
src/template.js       satori layout (reproduce "Design 4" — see Chosen layout)
src/icons.js          fetch + in-memory cache icon images by lookup
src/lru.js            bounded in-memory render cache + in-flight dedupe (no disk)
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

### `src/icons.js` — icon fetch + in-memory cache
- `getIcon(url)`: return cached bytes if present (process-lifetime in-memory
  `Map`), else `fetch(url)` (Node 18+ global fetch), store, return. Icon set is
  small and finite (mastery + expertise images), so this Map stays tiny and
  needs no eviction. No disk.
- Only URLs originating from vendored data files are ever fetched (host is
  effectively `terrarp.com`); no user input reaches here.
- Satori consumes images as data URIs or ArrayBuffers; convert accordingly.

### `src/render.js` — model → WebP
1. `satori(template(model), { width, height, fonts: [bundledFont] })` → SVG.
2. `new Resvg(svg).render().asPng()` → PNG buffer.
3. `sharp(png).webp({ quality: 82 }).toBuffer()` → WebP buffer.
Return the WebP `Buffer`. Dimensions fixed (e.g. 600×N) — final size set with
the deferred visual design; use a sensible default now.

### Caching strategy — no disk (stateless renderer)

The server persists **nothing**. It is a stateless renderer that leans on
upstream caches, which works because a given `code` always maps to the exact
same image:

- **`Cache-Control: public, max-age=31536000, immutable`** on every image
  response. This is load-bearing: it tells every downstream cache to keep the
  bytes forever and never revalidate.
- **XenForo image proxy** (forum-side) fetches each image once and serves its
  own copy to all readers. Combined with the header, the server effectively
  renders each `code` ~once, ever. Any CDN/reverse-proxy in front caches too.
- Render is cheap (~50 ms), so a cache miss anywhere upstream just costs one
  render — no disk read to lose, no eviction logic, no cleanup cron, no
  unbounded storage growth. Restarts/redeploys lose nothing (all regenerable).

### `src/lru.js` — bounded in-memory cache + in-flight dedupe
Purely to absorb bursts within a single process; dies on restart, bounded RAM.
- `key = sha256(code)` hex.
- Bounded LRU of rendered `Buffer`s, cap ~300 entries (~300 × ~30 KB ≈ ~9 MB).
- **In-flight dedupe:** a `Map<key, Promise<Buffer>>` of renders currently in
  progress; concurrent requests for the same uncached `code` await the same
  promise so it renders once. Entry removed when the promise settles.

### `server.js` — routes
- `GET /embed/:code.webp`
  1. Extract `:code` (Fastify strips the literal `.webp` suffix if the route is
     declared `"/embed/:code.webp"`; otherwise parse it off).
  2. `key = sha256(rawCode)`. LRU hit → serve buffer with headers below.
  3. Miss → via in-flight dedupe: `model.js` → `render.js` → LRU `put` → serve
     buffer.
  4. On `InvalidBuildError` or any decode/render failure → serve the static
     `assets/invalid.webp` (pre-rendered, held in memory) with status 200 so the
     forum shows a placeholder rather than a broken image. (Do not cache the
     error response as immutable — use `Cache-Control: no-store` for it, so a
     transient failure isn't pinned forever.)
  - Success response headers: `Content-Type: image/webp`,
    `Cache-Control: public, max-age=31536000, immutable`.
- `GET /health` → `200 {status:"ok"}`.

### Configuration
`.env` (via `dotenv`): `PORT` (default 8080), `PUBLIC_BASE_URL` (informational /
for absolute links if needed). No cache directory — nothing is written to disk.
`ecosystem.config.js` declares the pm2 app (`name`, `script: server.js`, `env`).

---

## Security

- **No user-URL fetch:** avatar/banner excluded; the server only fetches icon
  URLs sourced from vendored static data, keyed by lookup. Eliminates SSRF.
- **Input sanitization:** cap raw code length (e.g. ≤ 4 KB); the decoder is
  wrapped in try/catch; malformed input yields the invalid-build image, never a
  crash or unbounded work.
- **No disk writes at all.** Server is stateless; nothing derived from user
  input touches the filesystem, so there is no path-traversal or disk-fill
  surface. Cache keys (`sha256(code)`) exist only as in-memory Map keys.
- **Resource bounds:** fixed output dimensions; icon fetches cached in memory to
  avoid hammering the CDN; in-flight de-dupe (`src/lru.js`) ensures concurrent
  requests for the same uncached code render once. Bounded LRU caps RAM.

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
3. **LRU hit:** call the render path twice for one code; assert the second call
   returns from the in-memory LRU (spy/flag) and does not invoke satori.
4. **In-flight dedupe:** fire two concurrent requests for the same uncached
   code; assert satori/render runs exactly once and both get the same buffer.
5. **Immutable header on success, no-store on error:** assert the success
   response sets `Cache-Control: ...immutable` and the invalid-code response
   sets `Cache-Control: no-store`.
6. **Bad code:** `model(decode)` on junk throws `InvalidBuildError`; the route
   returns the invalid image with 200.
7. **Sanitization:** over-length / non-string code rejected before decode.
8. **Icons keyed by lookup only:** assert no code path passes build-code-derived
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
