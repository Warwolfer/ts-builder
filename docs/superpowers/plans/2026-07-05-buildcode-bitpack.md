# Build Code Bit-Packing (v1 packed format) — Plan

> TDD. Tests first (this plan ships the failing tests), implementation after.

**Goal:** Shrink the builder's compact build code by bit-packing the numeric
game-data fields, while keeping old codes fully decodable.

**Measured savings (simulation):**
- Lune reference (6m/6e/11a + char data): 208 → 145 chars (~30%)
- minimal (1 mastery): 28 → 13 (~54%)
- 6m/6e/4a, no char data: 88 → 36 (~59%)

## Scope — the fields packed

Indices 0–9 of the compact string (all numeric):
- mastery IDs + mastery ranks
- expertise IDs + expertise ranks
- armor type + armor rank, accessory type + accessory rank, weapon rank
  (equipment ranks)
- action IDs

Char data (index 10: name/race/title/thread/note/banner/avatar/ng) stays **text**,
appended after the packed bytes. It's already compact and free-form.

## Format — v1 packed

A packed code is: `"!" + base64url( gameBytes ++ charDataUtf8 )`

- Leading `"!"` marker — not in the base64url alphabet (`[A-Za-z0-9_-]`) and
  distinct from the embedcode `"~"` marker. Its presence selects the packed
  decode path; absence = legacy CSV decode path (all existing codes).
- `gameBytes` — bit-packed, byte-aligned (trailing bits zero-padded):
  | field | bits | notes |
  |-------|------|-------|
  | version | 4 | = 1 |
  | mastery count | 3 | 0–7 |
  | per mastery: id | 6 | max mastery id 41 |
  | per mastery: rank | 3 | 0–7 |
  | expertise count | 3 | 0–7 |
  | per expertise: id | 6 | max expertise id 32 |
  | per expertise: rank | 3 | |
  | armor type | 2 | index into [null,heavy,medium,light] |
  | armor rank | 3 | |
  | accessory type | 2 | index into [null,combat,utility,magic] |
  | accessory rank | 3 | |
  | weapon rank | 3 | |
  | action count | 5 | 0–31 |
  | per action: id | 9 | max action id 71 (fits 9 bits, room to 511) |
- `charDataUtf8` — the exact same `&`-joined char-data string the current encoder
  builds (index 10), as UTF-8 bytes. Empty when no char data.

**No length prefix needed:** the bit reader consumes an exact bit count derived
from the counts it reads; `gameByteLen = ceil(bitsRead / 8)`. Char data =
`bytes.slice(gameByteLen)`.

Unlike the embedcode, the build code packer does **not** drop `attack`/`rush`
and does **not** abbreviate — it must round-trip the builder state exactly.

## Backward compatibility + rollout

- **Old codes: never break.** They have no `!` prefix → legacy decode, untouched.
- **New `!` codes only decode on updated decoders.** Every place a build code is
  pasted must ship the v1 decoder before the encoder emits `!` codes:
  1. Phase 1 — deploy decoder that reads BOTH formats everywhere (terrarp.com
     build page's `build-encoder.js`, this repo, ts-embed vendor, any bot).
  2. Phase 2 — flip the encoder to emit packed codes.
- Encoder gains an opt-in: `generateCompactBuildCode(state, baseURL, { pack:true })`.
  Default stays legacy until Phase 2, so nothing changes until deliberately
  flipped. `decodeBuildString` auto-detects (`!` → packed) from day one.

## File structure

- `shared/buildpack.js` — new. Pure codec: `packGameData(state, refs)`,
  `unpackGameData(bytes, refs)`, bit reader/writer, base64url helpers, the
  ARMOR/ACCESSORY tables, `MARKER = "!"`, `VERSION = 1`. Browser (`window.BuildPack`)
  + Node (`module.exports`), same dual-export pattern as `shared/embedcode.js`.
- `shared/build-encoder.js` — modify:
  - `generateCompactBuildCode`: when `opts.pack`, emit `MARKER + base64url(gameBytes ++ charDataUtf8)`.
  - `decodeBuildString`: if code starts with `MARKER`, route to the packed path;
    else existing legacy path.
- `test/buildcode-pack.test.js` — new. `node --test`, self-contained `window`
  shim (no jsdom), loads data files + encoder + buildpack via `require`.
- `test/helpers/load.js` — new. Sets `global.window`, `btoa`/`atob`, requires the
  browser-style files, returns `{ BuildEncoder, BuildPack, masteries, expertise, actionlist }`.
- `package.json` — new minimal, `"test": "node --test"`, no deps.

## Reference

First real code supplied by the user (Lune, 6m/6e/11a, full char data):
```
MzgsMjIsMTQsMTEsMjQsM3wyMjIyMjJ8NywxMywzMCwzLDgsMnwyMjIyMjJ8aHwzfGN8MnwzfDMsNCw1LDEyLDEzLDE4LDI1LDI2LDU0LDU1LDcxfG46THVuZSZyOkh1bWFuJnQ64p2uX0FsZV9RdWVlbl/ina8mYzoyNzA2JmI6MTM1LmpwZz8xNzcyOTEwOTc3JmE6aHR0cHMlM0ElMkYlMkZ0ZXJyYXJwLmNvbSUyRmRhdGElMkZhdmF0YXJzJTJGbSUyRjAlMkYxMzUuanBnJTNGMTc3MTMyMjc3MCZuZzox
```
Decodes to: masteries [metamorph, animancy, power, astramancy, harmonic-magic,
beast-arts] all rank 2; expertise [music, culinary, society, endurance,
theatrics, coordination] all rank 2; armor heavy r3; accessory combat r2; weapon
r3; 11 actions [range, protect, ultra-protect, stable-attack, burst-attack,
lethal, buff, power-buff, anatomy, adapt, evolve].

## Test cases (write first, must FAIL before implementation)

1. **Legacy baseline:** `decode(REF)` returns the field values above. (Guards
   against regressions; passes today.)
2. **Marker routing:** a packed code starts with `!`; a legacy code does not.
3. **Round-trip identity:** for a set of states (minimal; the REF-decoded state;
   6m/6e; equipment-only; actions incl attack/rush; empty char data),
   `decode(pack(state))` deep-equals `decode(legacy(state))` on all game fields
   AND char fields.
4. **Shorter:** packed code length < legacy code length for REF and for the
   6m/6e/no-char build.
5. **Equipment ranks preserved:** armor/accessory/weapon type+rank survive
   pack→unpack exactly, including null types.
6. **attack/rush retained:** unlike embedcode, packed build code keeps them.
7. **Reference packs + round-trips:** `decode(pack(decode(REF)))` deep-equals
   `decode(REF)`.
8. **Old code still decodes with the new decoder deployed** (Phase-1 safety):
   `decode(REF)` unchanged after the packed path exists.

## Non-goals

- Not touching char-data encoding further (done in prior commits).
- Not changing the embedcode (separate, embed-only).
- Not flipping the encoder default this change (Phase 2, gated on rollout).
