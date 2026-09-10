# Plan Mode — Design

Date: 2026-09-10
Status: Approved design, ready for implementation planning

## Problem

The build sheet shows every action a character can take, but planning a turn
means holding a sequence in your head: which buffs you activate, in what
order, and what numeric modifier each contributes to the attack at the end.

The Discord bot deliberately does not help here. `getPassiveModifiers()` in
`ts-discord-bot/helpers.js:295` is documented "Does NOT calculate bonuses -
users add bonuses manually as modifiers". The bot owns the authoritative rank
tables but never applies one buff to a later roll.

So a player planning "Evolve, Torment, Duelist·Challenge, Reckless Attack"
today has to look up two rank curves, add them, and hand-type the total into
the Reckless Attack roll code before pasting it.

Plan Mode makes the build sheet do that.

## Scope

Plan Mode is a third view state of the existing action cards. In it:

- Cards shrink to title, type, mastery icons and toggles, and gain an `Add`
  button.
- `Add` snapshots the card as configured into an ordered queue.
- The queue shows each entry's name, mastery, computed modifier and roll
  code, one click to copy.
- Modifiers from earlier queue entries are computed and spliced into later
  entries' roll codes automatically, from a curated table.

Out of scope this iteration: projected result ranges (the row model carries
`dice` so it can be added later), and a "copy all" button (pasting is
one-by-one by design).

## Architecture

### Placement

Plan Mode lives on `build-sheet.html`, not a separate page. A card's usable
state exists only in its DOM: `clickMastery()` splices the rank letter into
`.masteryreplace`, and roughly forty toggle handlers splice tags and
modifiers into `.rollcode` through `RollCodeUtils`. There is no serialized
model of "this card, configured". A second page would have to re-include
`resource/build-sheet.js` wholesale, gaining nothing, or duplicate that logic
and let the two copies drift.

The size concern is real but misdirected: `build-sheet.html` is 294 lines.
`resource/build-sheet.js` is 3143. So all new code goes in new files and
`build-sheet.js` gains only an init hook.

### Files

New:

| File | Responsibility |
| --- | --- |
| `resource/plan-buffs.js` | Buff table. Data only, no logic. |
| `shared/plan-queue.js` | Pure resolve engine. No DOM. Unit-tested. |
| `resource/plan-mode.js` | DOM controller: Add buttons, snapshot, rail, persistence. |
| `css/plan-mode.css` | Plan card and rail styling. |
| `resource/action-families.js` | Family definitions. Receives three arrays moved out of `BuildSheet`. |

Edited:

| File | Change |
| --- | --- |
| `shared/rollcode-utils.js` | Add `setRollPlanMod()`. |
| `resource/build-sheet.js` | Read families from `action-families.js`; one init hook. |
| `build-sheet.html` | Script and link tags, `Plan` button, empty rail element. |

### Targeted extraction

`this.attackActions`, `this.healActions` and `this.buffActions` currently sit
in the `BuildSheet` constructor (`resource/build-sheet.js:39-43`). The pure
engine needs them and cannot construct a `BuildSheet`, which requires a live
`window`. Move the three arrays to `resource/action-families.js`
(`window.ActionFamilies`) and have both consumers read from there.

A mechanical move of fifteen lines with no behaviour change. In scope because
it is the seam this feature needs, not general refactoring.

## The Main Action family

Evolve buffs "main action rolls", which includes Heal, Buff and Protect, not
only attacks. `use` in `resource/actions.js` cannot be used to derive this:

- `reckless-attack` is `use: ["free","special"]` but its description says
  "Main Action".
- Six actions — `rover`, `exceed`, `empower`, `infuse`, `coordinate`,
  `follow-up` — declare `use: ["main"]` while their own `dice` field says
  "Free Action" or "Bonus Action".

Two independent derivations of the real set agree exactly:

1. The 15 actions whose `dice` formula ends in "other bonuses".
2. `attackActions` + `healActions` + `buffActions` from `BuildSheet`.

So the families are:

```
mainAction (15) = attack, protect, counter, ultra-protect, ultra-counter,
                  stable-attack, burst-attack, sneak-attack, critical-attack,
                  sharp-attack, reckless-attack,
                  heal, power-heal, buff, power-buff
attack     (11) = mainAction minus heal, power-heal, buff, power-buff
heal        (2) = heal, power-heal
buff        (2) = buff, power-buff
save            = the Saves card
masteryCheck    = the Mastery Check card
```

The three cards in `#saveschecks` have no entry in `actions.js`, so queue rows
built from them carry the reserved pseudo-lookups `@save`, `@expertise-check`
and `@mastery-check`. The `@` prefix cannot collide with a real action lookup.
They belong to the `save`, `expertiseCheck` and `masteryCheck` families
respectively, and never produce buffs — only consume them. An expertise check
is not a mastery check, so they are separate families; no seed buff targets
`expertiseCheck`, but conflating them would be wrong the moment one does.

Special actions count as Main Actions: each is a roll-formula upgrade of a
main action, and all seven carry the same `MR + WR + other bonuses` shape.

### Why the family is a list, not a `use` query

`action-families.js` holds the explicit lists and is the runtime source. It
does not derive `mainAction` from `use`, for two reasons.

The `attack`, `heal` and `buff` sub-families cannot be derived from any field.
Mark and Duelist·Challenge apply to attacks but not to heals or buffs, and
`attack` includes Protect, Counter, Ultra Protect and Ultra Counter — which
are Defense-category actions. No combination of `use`, `category` or `type`
picks out that set. Those three lists already exist and are already load-
bearing for Lethal and Combat Focus, so they stay.

Given the lists exist anyway, deriving `mainAction` separately from `use`
would create a second source of truth that could disagree with the union of
the three. Instead `mainAction` is defined as that union, and a test pins it
to `use`:

```js
assert.deepStrictEqual(
  [...ActionFamilies.mainAction].sort(),
  actionlist.filter(a => a.use.includes("main")).map(a => a.lookup).sort()
);
```

Add a main action to `actions.js` and forget the family list, and the test
fails loudly. Without it, Evolve would silently under-apply and the only
symptom would be a wrong number in a roll code already pasted into a thread.
`use` was wrong in 13 of 69 entries before this fix, so a loud failure is
worth more here than self-maintenance.

### The `use` data fix

`use` is repaired as part of this work so that `use.includes("main")` becomes
a true test for the Main Action family — 13 of 69 entries change.

Nothing currently reads `use`. The only filters wired up in
`action-selector.html` are the role tabs; the use-filters described in
`CLAUDE.md` were removed. So the field is dead data that happens to be wrong:
zero risk to correct, and a trap for whoever trusts it next.

**Semantics.** `use` records which slot an action occupies, plus any tags that
qualify it. `main` and `special` are orthogonal — an action can occupy the
main slot *and* be a Special Action. This is why `resource/armor-abilities.js:45`
has to say a second main action "cannot be a Special Action"; the restriction
only needs stating because a Special normally *is* your main action.

**Group 1 — declare `main` but are not.** Confirmed by both the `dice` field
and the description text.

| Action | Was | Becomes | Evidence |
| --- | --- | --- | --- |
| `rover` | `["main"]` | `["passive","bonus"]` | "(C) Passive… (C) Bonus Action: Rove" |
| `exceed` | `["main"]` | `["free"]` | "(D) Free Action." |
| `empower` | `["main"]` | `["free"]` | "(A) Free Action:" |
| `infuse` | `["main"]` | `["free"]` | "(D) Free Action." |
| `coordinate` | `["main"]` | `["free"]` | "(D) Free Action:" |
| `follow-up` | `["main"]` | `["free"]` | "(C) Free Action." |

**Group 2 — are main actions but omit `main`.** All seven carry the
`MR + WR + other bonuses` roll shape.

| Action | Was | Becomes |
| --- | --- | --- |
| `ultra-protect` | `["special"]` | `["main","special"]` |
| `ultra-counter` | `["special"]` | `["main","special"]` |
| `burst-attack` | `["special"]` | `["main","special"]` |
| `critical-attack` | `["special"]` | `["main","special"]` |
| `power-heal` | `["special"]` | `["main","special"]` |
| `power-buff` | `["special"]` | `["main","special"]` |
| `reckless-attack` | `["free","special"]` | `["free","main","special"]` |

After both groups, `actionlist.filter(a => a.use.includes("main"))` returns
exactly the 15 Main Actions.

Plan Mode still does not read `use` at runtime — see below — so this fix is
independent of the rest of the feature and lands first, on its own.

`CLAUDE.md`'s mention of use-filters is removed, since the filter itself was
deleted. Nothing else in that document is touched.

## Data model

### Queue row

Plain object. Everything the engine needs, nothing from the DOM.

```js
{
  uid,                     // stable id for reorder and dismissal
  lookup, name,            // action identity
  masteryId, masteryName,
  rankLetter,              // 'A' — read from the snapshot, post-downcast
  tags: ["Challenge"],     // active toggles, read off the snapshot
  rollHtml,                // snapshot of .rollcode innerHTML
  dice,                    // carried for the deferred range feature
  targetSelf: true,        // initialised from the buff's `target`; editable
                           // only when the buff sets `selfToggle`
  manualMod: 0,            // the "+X from anyone else" field
  dismissed: ["evolve"]    // chip sources clicked off on this row
}
```

`rankLetter` comes from the snapshot's `.masteryreplace` span, which
`updateDowncastIndicators()` has already reduced when the mastery is
downcast. Downcasting therefore needs no separate handling.

### Buff table entry

```js
evolve: {
  rankFrom: "metamorph",                    // fixed mastery, not the clicked one
  values: { d:10, c:10, b:15, a:15, s:20 },
  appliesTo: ["mainAction"],
  requiresMasteryMatch: true,
  duration: "persistent",
  target: "self",
  source: "ts-discord-bot alter.js:740"
}
```

Fields: `requiresTag` (buff exists only when that toggle is active),
`rankFrom` (`"clicked"` or a fixed mastery lookup), `values` (rank map),
`appliesTo` (families), `duration`, `target`, `selfToggle`, `stackable`
(default true), `requiresMasteryMatch`.

`target` (`"self"` or `"other"`) sets whether the buff feeds your own later
rows by default. `selfToggle: true` additionally renders a Self checkbox on
the producing row, initialised from `target`. The two combine into three
behaviours:

| `target` | `selfToggle` | Behaviour | Examples |
| --- | --- | --- | --- |
| `"self"` | absent | No checkbox. Always feeds your rows. | Evolve, Exceed, Duelist·Challenge, Adapt·Fend |
| `"self"` | `true` | Checkbox, **checked** by default. | Mark |
| `"other"` | `true` | Checkbox, **unchecked** by default. | Coordinate, Assist·Assign |

Mark is `"self"` + `selfToggle` rather than plain `"self"` because its charges
can be spent by other Hyper Sense users before you attack — you marked the
enemy but someone else consumed it. Unchecking Self models that without
deleting the Mark row, which you still need in the queue for its own roll
code.

`duration` is `"once"`, `"persistent"`, or `{charges: <rank map>}`. Mark's
charge count scales with rank ("(S) Upgrade: 2 to 3 attacks"), so charges take
the same rank-map shape as `values` rather than a bare integer:

```js
mark: { duration: { charges: { d:2, c:2, b:2, a:2, s:3 } }, … }
```

The bot's Mark embed hardcodes "next 2 attacks" in its display string even at
S rank, while the `actions.js` description says "(S) Upgrade: 2 to 3 attacks".
The description is the rules source and the bot's string is not a computed
value, so the table keeps 3 at S. Recorded in `plan-buffs.js` so the
divergence is not later "fixed" the wrong way.

### Seed table — 7 entries

| Action | Tag | Rank from | Values (d/c/b/a/s) | Applies to | Duration | Self checkbox |
| --- | --- | --- | --- | --- | --- | --- |
| Evolve | — | metamorph | 10/10/15/15/20 | mainAction | persistent | none, always self |
| Duelist | Challenge | clicked | 30/30/40/40/50 | attack | once | none, always self |
| Mark | — | clicked | 10/15/20/25/30 | attack | charges 2, 3 at S | **checked** by default |

| Exceed | — | clicked | 10/15/20/25/30 (e:5) | mainAction | persistent | none, always self |
| Coordinate | — | clicked | 5/10/15/20/25 | mainAction | once | unchecked by default |
| Assist | — | clicked | 5/5/10/10/15 | masteryCheck | once | unchecked by default |
| Adapt | Fend | clicked | 10/10/15/15/20 | save | once | none, always self |

Duelist's values are the bot's `DUEL_DMG` doubled, which is what Challenge
does. Every number is copied from the bot's own tables so the two repos
agree; `test/plan-buffs.test.js` pins each value with its bot source cited,
so drift surfaces as a failing test rather than a wrong roll.

### Deliberately excluded

These queue normally and contribute nothing; use the manual `+X` field.

| Action | Reason |
| --- | --- |
| Sharpshooter | Passive and Snipe are damage instances, not roll modifiers. Unlike Duelist there is no Challenge-equivalent converting them. Snipe is also a `1d3` (bot `offense.js:1094`). |
| Sneak Attack | Bonus is conditional on the roll succeeding. Post-roll. |
| Charge · Release | The value *is* a roll of the Charge Pool. |
| Momentum · Blitz | Driven by movement count, which the sheet does not track. |
| Follow-up | Ally-driven and narratively gated. |
| Defile | `1d20` per mark. |
| Buff / Power Buff | Value is charge-count driven. |
| Inspire | Being removed in the next rules update. |
| Lethal, Blessed, Combat Focus | **Already** spliced at render time by `updatePassiveModifiers()`. The engine must never touch them or they double-count. |

## The engine

`resolveQueue(rows, ctx)` walks the queue top to bottom, keeping a pool of
unspent buffs. For each row:

1. Map the row's action to its families via `ActionFamilies`. A row belongs to
   several at once — Reckless Attack is both `attack` and `mainAction` — so
   this is a set, not a single value.
2. Collect pool entries where **any** of the row's families appears in
   `appliesTo`, the condition passes, the source is not dismissed on this row,
   and the producing row's `targetSelf` is true.

   `targetSelf` is set once when the row is created, defaulting from the
   buff's `target`, so the engine consults a single flag rather than
   branching on `target` and `selfToggle`. Only the UI cares which rows let
   you change it.
3. Resolve non-stackable duplicates: keep the highest, mark the rest
   `superseded`.
4. Emit chips `[{source, label, value, state}]` and a total of their sum plus
   `manualMod`.
5. Spend: `once` leaves the pool, `{charges:N}` decrements, `persistent`
   stays.

Then, if the row produces a buff — its action is in the table and its
`requiresTag` is satisfied — add it to the pool for later rows.

Pure and synchronous. Every mutation (add, remove, reorder, dismiss, toggle
Self, edit manual mod) re-runs the whole resolve. Reordering is an array move
plus a re-run; there is no incremental update path to get wrong.

## UI

### Entering plan mode

A `Plan` button beside the existing `Compact` button adds `.plan` to
`#builddisplay`. `.plan` rules win over `.compact`, and `Compact` is disabled
while plan mode is active. The preference persists in `localStorage` the same
way `tsbuilder_compact` does.

### Plan card

Title, type, mastery icons, toggle buttons, the corner `+` button. Description, action
icon, roll formula and roll code are hidden with `display:none` — the roll
code stays in the DOM because it is what `Add` snapshots.

### The queue

Full width beneath the cards, in the space the note occupies outside plan mode,
with a labelled header row so the order, action, modifier and roll code read as
real columns.

This replaces an earlier sticky right rail, which was built and rejected on
sight: docking it squeezed both halves — the card grid went narrow and the
queue's columns were too cramped to read a roll code in.

Plan mode also hides the note, the build code, the embed block and the
navigation buttons. They serve sharing a build, not driving a turn, and the room
they free is what lets the queue read as a table. The mastery pickers shrink
from 33px to 22px: a card in plan mode is a control panel, not a display.

```
#  Action · Tag (mastery)         Mod     Roll code
1  Evolve (Metamorph B)            —      ?r evolve B …          copy  x
2  Duelist · Challenge (Power A)   —      ?r duelist A …         copy  x
3  Reckless Attack (Power A)     +55 v    ?r reckless A S +55 …  copy  x
   └ [Evolve +15 x] [Challenge +40 x]   manual [ 0 ]
```

The roll code cell reuses `copyRollCode()`, so click-to-copy behaviour and
the "Copied!" tooltip are identical to the cards. Rows drag to reorder using
the pattern already in `setupDragReorder()`.

Chips are dismissable. Dismissing one sets it to contribute zero without
removing the producing action from the queue — the case where you cast Mark
but cannot take advantage of it yourself.

### Splicing the modifier

A new `setRollPlanMod()` in `shared/rollcode-utils.js`, writing to its own
`<span class="planmod">` before the `#`.

It must not reuse `setRollExtraMod()`. That span belongs to Risky Mode, and a
Reckless Attack row that is both Risky and buffed would have one clobber the
other. Two spans, both before the `#`, independently settable, following the
existing `damagepassivemod` / `extramod` precedent.

### Target Self

Actions whose table entry sets `selfToggle` render a `Self` checkbox on their
queue row, initialised from `target`. Unchecked, the buff contributes nothing
to your rows. Checked, it feeds your subsequent eligible rows.

Coordinate and Assist·Assign start unchecked, since they normally go to an
ally. Assist carries no `requiresTag`: the bot's `handleAssist` parses no
triggers, so `?r assist <MR>` always grants the Assign bonus and the card
correctly has no toggle to require. Mark starts **checked**, since marking an enemy you then attack is the
normal case; unchecking covers the enemy being marked but its charges spent by
another Hyper Sense user before your attack. Evolve, Exceed, Duelist·Challenge
and Adapt·Fend render no checkbox at all — they are inherently self-targeted
and a checkbox would be noise.

The roll code is left untouched. The bot has no `self` trigger in
`parseTriggers()`, so a tag would be cosmetic, and the pasted output should
stay exactly what you would otherwise type.

### Saves and checks

The Saves, Expertise Check and Mastery Check cards in `#saveschecks` also get
`Add` buttons. They are structurally identical cards with roll codes, and
without them Adapt·Fend and Assist·Assign have nothing to consume them.

## Persistence

`localStorage["tsbuilder_plan_queue"]`, stored with a fingerprint of
`characterName`, `chosenActions`, `chosenMasteries` + `chosenMasteriesRanks`
(paired up and sorted together by mastery id, so selection order does not
matter but which rank belongs to which mastery is never scrambled),
`weaponRank`, `armorRank` and `accessoryRank`. On load, a fingerprint mismatch
clears the queue rather than showing roll codes computed from ranks or
masteries that no longer match the build — e.g. editing a mastery rank on
"Edit This Build" and returning.

The queue never enters the build code, the URL, or saved builds. It is
turn-scoped scratch, and putting it in a shareable code would bloat every
build code for something nobody wants to share.

## Edge cases

| Case | Behaviour |
| --- | --- |
| Attack queued twice with different masteries | Two independent snapshot rows. This is why `Add` snapshots rather than links. |
| Buff added after the action it should feed | Does not apply. Order is the model; drag it up. |
| Evolve, then a main action with a different mastery | `requiresMasteryMatch` fails. Chip renders greyed with the reason rather than silently vanishing. |
| Mark with 2 charges, 3 attacks queued | First two get it, the third does not. Chip shows charges remaining. |
| Cast Mark but cannot use it yourself | Dismiss the chip. Contributes zero, row stays queued. |
| Two non-stackable sources of one buff | Higher wins, the other is marked superseded. |
| Downcast mastery | The snapshot already carries the reduced rank letter. |
| Action with `roll: "-"` | Queues fine; the roll code cell shows an em dash. |
| Risky Mode and a plan bonus on one row | Separate spans, both render. |
| Card reconfigured after being added | The row is frozen by design. Delete and re-add. |
| Mark targets one specific enemy | Not tracked; queued attacks are assumed to hit the marked enemy, so Mark's Self checkbox starts checked. Uncheck it when another Hyper Sense user spent the charges first. |
| `use` fix changes an action's filtering | It cannot — nothing reads `use` today. Verified by search across all `.js` and `.html`. |
| A new main action added to `actions.js` later | `test/action-families.test.js` fails until it is added to the family list. |
| Queue restored for a different character | Fingerprint mismatch clears it. |
| Queue restored after a mastery/rank/equipment edit | Fingerprint mismatch clears it, rather than restoring stale rank letters and buff totals. |

## Testing

TDD throughout, `node --test`, loading browser-style modules through
`test/helpers/load.js` as the existing suites do.

| File | Covers |
| --- | --- |
| `test/plan-queue.test.js` | The resolve algorithm: charge spending, persistence, mastery match, non-stackable resolution, dismissal, target-self gating, reorder recomputation. |
| `test/action-families.test.js` | `mainAction` equals `use.includes("main")` across `actions.js`; `mainAction` is exactly `attack` + `heal` + `buff`; every family member names a real action. |
| `test/plan-buffs.test.js` | Every seed value pinned against its cited bot table; every entry's `appliesTo` names a real family; every `lookup` names a real action. |
| `test/rollcode-utils.test.js` | `setRollPlanMod` set, clear, and coexistence with `setRollExtraMod`, alongside the existing Risky tests. |

`resource/plan-mode.js` stays thin DOM glue with no logic worth unit-testing;
its correctness is covered by the engine tests plus manual verification.

## Deferred

- **Projected result range.** Needs the bot's dice-formula evaluation. The row
  model carries `dice` so it can be added without reshaping anything.
- **Copy all.** Pasting is one-by-one by design.
- **Multiple planned turns.** One turn per queue for now.
