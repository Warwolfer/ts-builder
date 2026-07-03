# Build Sheet — 3 Improvements Design

Date: 2026-07-03
Target page: `build-sheet.html` (+ `resource/build-sheet.js`, `resource/actions.js` unchanged, `css/app.css` / `css/build-sheet.css`)

## Open Assumptions (confirm on review)

These were chosen as defaults because the user was away when asked. Flag any to change:

1. **F1 MR value** = fixed to Hyper Sense mastery rank (mirrors how Evolve fixes MR to Metamorph). Clicking a mastery only sets the Imbue break type; it does not change MR.
2. **F1 appended text** = ` · Imbue (Elemental)` — space before paren, capitalized break type, matching existing Evolve ` · Mastery (Name)` convention.
3. **F2 reorder persistence** = persist. Reorder rewrites `state.chosenActions` order, saved to localStorage, survives reload. Side effect: build-code encoding reflects new order (cosmetic only; decodes to same action set).
4. **F3 Compact persistence** = persist via localStorage.

---

## Feature 1 — Hyper Insight mastery imbue

### Goal
Hyper Insight action currently shows only the Hyper Sense mastery icon. Make it display all of the character's non-alter masteries (like Evolve / Imbue / Attack). Clicking a mastery appends its break type to the roll code as ` · Imbue (BreakType)`, without changing MR.

### Current state
- `resource/actions.js:1453` — `hyper-insight`, `masteries: ["hyper-sense"]`, roll:
  `?r hyperinsight <span class='masteryreplace'>MR</span> # Character Name · <span class='thrcode'>Code</span>`
- `build-sheet.js:1701 getApplicableMasteries` — special all-non-alter branch for `evolve|attack|imbue`.
- `build-sheet.js:1717 generateMasteryIcons` — shows icons when roll contains `masteryreplace`; no-downcast for attack/evolve/imbue.
- `build-sheet.js:2385 clickMastery` — Evolve special branch (2426–2453) keeps MR fixed + appends suffix; normal branch sets MR to clicked rank + break type.

### Changes (all in `build-sheet.js`)
1. `getApplicableMasteries` (line 1702): add `"hyper-insight"` to the `evolve|attack|imbue` condition → returns all non-alter chosen masteries.
2. `generateMasteryIcons` (line ~1741): add `action.lookup !== "hyper-insight"` to the downcast-exclusion set so imbue-able masteries never show downcast.
3. `clickMastery` — add a `hyper-insight` branch analogous to the Evolve branch (before the normal replacement path). Behavior:
   - Detect via `cardElement.querySelector('[data-action="hyper-insight"]')`.
   - Set MR (`.masteryreplace`) to Hyper Sense rank: `getMasteryRankByLookup(state, "hyper-sense")` → `getRankLabel`.
   - Strip any existing suffix: regex ` · Imbue \([^)]+\)` on `rollCodeElement.innerHTML`.
   - If clicked mastery has `breakType`, append ` · Imbue (${capitalize(breakType)})`.
   - `return` (skip normal replacement).

### Edge cases
- Clicked mastery with `breakType: null` (alter masteries) — excluded already since only non-alter masteries render. No append.
- Hyper Sense rank 0 / not chosen — MR left as literal `MR` (same graceful fallback as Evolve when Metamorph absent).

---

## Feature 2 — Drag-to-reorder action cards

### Goal
Reorder the dynamic action cards in `#actionsdisplay` by grabbing a card's `.cardtop` and releasing at a new position. New order persists to `state.chosenActions`.

### Scope
- `#actionsdisplay` only. `#freeactiondisplay` (Attack / Rush) is a separate static container and is NOT reorderable.
- Grid layout unchanged (`app.css:1645`, 3 columns). DOM order drives grid flow, so reordering nodes reorders the grid.

### Mechanism (HTML5 drag-and-drop, event delegation)
- Each dynamic card gets `data-action-id="${action.lookup}"` (added in `generateActionCard`, line 1123).
- Grip = `.cardtop`. Cards are `draggable="false"` by default; on `mousedown` inside a `.cardtop`, set the parent card `draggable="true"`; clear on `dragend`/`mouseup`. This restricts drag initiation to the card header (avoids hijacking clicks on rollcode / toggles / mastery icons).
- Delegated listeners on `#actionsdisplay` (attached once at init, survive re-render since bound to the container, not cards):
  - `dragstart`: record dragged card, add `.dragging` class.
  - `dragover`: `preventDefault`; compute insertion point (before/after nearest card by pointer Y/X) and move the dragged node, OR mark a drop indicator.
  - `drop` / `dragend`: read final DOM order of `[data-action-id]`, rebuild `state.chosenActions` preserving any non-card entries (e.g. `lethal`, `focus-offense`, `blessed` that don't render as cards) by appending them in their existing relative order, then `updateState` + persist. Re-render not strictly required (DOM already reordered) but call `displayActions` to stay canonical.

### state.chosenActions rebuild detail
`chosenActions` may contain lookups that render no card (modifiers). Algorithm on drop:
1. `visibleOrder` = ordered `data-action-id`s from DOM.
2. `hidden` = chosenActions entries not in visibleOrder (keep original order).
3. New `chosenActions` = interleave: emit visible entries in new DOM order; append hidden entries at end (or keep original positions — simplest: visible-new-order first, then hidden). Persist.

(Confirm on review whether modifier lookups should keep original positions; default appends them after.)

### CSS
- `.cardtop { cursor: grab; }` ; `.card.dragging { opacity: .5; cursor: grabbing; }`
- Optional drop indicator via outline on hovered target.
- Add `user-select: none` on `.cardtop` to avoid text selection while dragging.

### Edge cases
- Single card / zero cards: no-op.
- Mobile (1 column, `app.css:2814`): vertical reorder still works with same logic.
- Re-render from other interactions (toggles) rebuilds from `state.chosenActions`, so persisted order is honored.

---

## Feature 3 — Compact toggle

### Goal
A "Compact" toggle in the Actions `selectorheader`, right side, that hides action-card descriptions (`.cardinfo`) to shrink cards.

### Changes
- `build-sheet.html:197` Actions `selectorheader`: add a toggle element to the right of `.action-filters`, e.g.
  `<div class="compact-toggle" onclick="toggleCompact(this)">Compact</div>`
  (styled like a filter tab; right-aligned via flex on the header).
- Global `toggleCompact(el)` in `build-sheet.js`: toggle `.compact` class on `#builddisplay` (common ancestor of both action containers), toggle `.active` on the button, write flag to `localStorage` (key e.g. `ts-compact`).
- On init (build sheet render / DOMContentLoaded), read localStorage flag; apply `.compact` + button `.active` if set.
- CSS: `.compact .cardinfo { display: none; }` (hides descriptions on both free and dynamic action cards). Optionally also tighten `.cardroll` — default: hide only `.cardinfo`.

### Edge cases
- Toggle state must survive `displayActions` re-render: class lives on `#builddisplay` (persists across inner re-render), so cards re-rendered while compact stay compact. No per-card work needed.

---

## Non-goals / YAGNI
- No reorder of free actions (Attack/Rush).
- No drag handle icon graphic (cursor change only) unless requested.
- No compaction of stats/saves cards — action cards only.
- No new dependencies; vanilla JS + native DnD.

## Test plan (manual)
1. F1: build with Hyper Sense + 2 other non-alter masteries + Hyper Insight. Confirm all non-alter masteries show as icons; clicking each appends correct ` · Imbue (BreakType)`; MR stays Hyper Sense rank; re-clicking swaps break type without duplicating suffix.
2. F2: reorder cards; verify order sticks after a toggle interaction and after reload; verify free actions unaffected; verify build code still decodes to same actions.
3. F3: toggle Compact; descriptions hide on all action cards; reload keeps state; cards re-rendered (e.g. after mastery click) remain compact.
