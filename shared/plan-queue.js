// The Plan Mode queue engine.
//
// Pure and synchronous: it takes an ordered array of plain row objects and
// returns them resolved, with the buff chips each row receives and the total
// modifier to splice into its roll code. No DOM, no storage, no globals beyond
// the two data modules — so it is fully unit-testable and every mutation in the
// UI is just "change the array, resolve again".
//
// Buffs flow forward only. A row produces into a pool; later rows consume from
// it. Reordering is an array move plus a re-resolve; there is no incremental
// update path to get wrong.
const PlanQueue = (function () {
    let nextUid = 1;

    function buffFor(lookup) {
        return window.PlanBuffs.table[lookup] || null;
    }

    // Builds a queue row, filling in the fields the UI edits later. targetSelf
    // starts from the buff's declared target so the engine reads one flag
    // instead of branching on target and selfToggle; only the UI cares which
    // rows let you change it.
    //
    // This is the one place every row - live or rebuilt from storage - comes
    // into being, so it is also the one place to reject a field whose type
    // would otherwise reach a method call or interpolation downstream and
    // fail there instead. tags/dismissed are the sharp edge: a string has
    // .slice(), so `fields.tags ? fields.tags.slice() : []` used to duck-type
    // a string straight through and only fail later, in the renderer's
    // tags.join() - outside every restore() guard, taking the whole build
    // sheet down with it. rollHtml gets the same treatment: it reaches
    // RollCodeUtils.setRollPlanMod's html.replace(...) unescaped by design
    // (it is markup), so a non-string there throws for the same reason.
    function str(value) {
        return typeof value === "string" ? value : "";
    }

    function makeRow(fields) {
        const entry = buffFor(fields.lookup);
        const row = {
            uid: "r" + nextUid++,
            lookup: str(fields.lookup),
            name: str(fields.name) || str(fields.lookup),
            masteryId: fields.masteryId || null,
            masteryName: str(fields.masteryName),
            masteryImage: str(fields.masteryImage),
            rankLetter: str(fields.rankLetter),
            tags: Array.isArray(fields.tags) ? fields.tags.slice() : [],
            rollHtml: str(fields.rollHtml),
            dice: str(fields.dice),
            targetSelf: entry ? entry.target !== "other" : true,
            manualMod: 0,
            dismissed: [],
        };
        if (Object.prototype.hasOwnProperty.call(fields, "targetSelf")) {
            row.targetSelf = !!fields.targetSelf;
        }
        if (Object.prototype.hasOwnProperty.call(fields, "manualMod")) {
            row.manualMod = fields.manualMod;
        }
        if (Array.isArray(fields.dismissed)) row.dismissed = fields.dismissed.slice();
        if (fields.uid) {
            // Coerced through String(), not just str(): str() would reject a
            // non-string uid outright (e.g. a numeric 42 surviving JSON
            // round-tripping from storage), and the row would keep looking
            // fine right up until rowByUid's `===` compare against the DOM's
            // always-stringy data-uid quietly failed — breaking remove, move,
            // dismiss and the Self toggle for that one row with no error.
            row.uid = String(fields.uid);
            // Keep the counter ahead of any restored id. Stored uids are not
            // dense after deletions, so a queue that persisted r4,r5,r6 would
            // otherwise let the next add reuse one of them.
            const n = parseInt(row.uid.replace(/^r/, ""), 10);
            if (!isNaN(n) && n >= nextUid) nextUid = n + 1;
        }
        return row;
    }

    function toNumber(value) {
        const n = parseInt(value, 10);
        return isNaN(n) ? 0 : n;
    }

    // Does this row produce a buff for later rows? Requires a table entry, the
    // tag its bonus action needs, and Self where the buff would otherwise go to
    // an ally.
    function producedBuff(row) {
        const entry = buffFor(row.lookup);
        if (!entry) return null;
        if (entry.requiresTag && row.tags.indexOf(entry.requiresTag) === -1) return null;
        if (!row.targetSelf) return null;

        // A zero value produces nothing on purpose: every table entry pays 0
        // at E rank, and a "+0" chip would be noise rather than information.
        const value = window.PlanBuffs.valueFor(entry, row.rankLetter);
        if (!value) return null;

        return {
            source: row.lookup,
            uid: row.uid,
            label: entry.label,
            value: value,
            entry: entry,
            masteryId: row.masteryId,
            remaining: window.PlanBuffs.chargesFor(entry, row.rankLetter),
        };
    }

    function familiesOf(lookup) {
        return window.ActionFamilies.familiesOf(lookup);
    }

    function appliesToRow(pooled, families) {
        for (let i = 0; i < pooled.entry.appliesTo.length; i++) {
            if (families.indexOf(pooled.entry.appliesTo[i]) !== -1) return true;
        }
        return false;
    }

    // Conditions the app can actually verify. Narrative ones — Duelist's
    // adjacency, Mark's "your marked enemy" — are not checkable here, so those
    // buffs default on and the chip is there to click off.
    function blockedReason(pooled, row) {
        // Unverifiable is not the same as satisfied. If either side's mastery is
        // unset we cannot confirm the match, and over-applying is worse than
        // under-applying here — these totals get pasted into a live thread. The
        // blocked chip tells the player exactly what to go and set.
        if (pooled.entry.requiresMasteryMatch &&
            (!pooled.masteryId || !row.masteryId ||
             pooled.masteryId !== row.masteryId)) {
            return "needs the evolved mastery";
        }
        return null;
    }

    // A non-stackable buff cannot double up: the highest wins and the rest are
    // marked superseded so you can see they were considered.
    //
    // Mutates the candidate wrappers in place, setting `superseded` on the
    // losers. In-place is the contract, not an accident: the caller keeps its
    // own array reference.
    function markSuperseded(candidates) {
        const bestBySource = {};
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            if (c.pooled.entry.stackable === false) {
                const key = c.pooled.source;
                if (!bestBySource[key] || c.pooled.value > bestBySource[key].pooled.value) {
                    bestBySource[key] = c;
                }
            }
        }
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            if (c.pooled.entry.stackable !== false) continue;
            if (bestBySource[c.pooled.source] !== c) c.superseded = true;
        }
    }

    // Walks the queue once, front to back. Returns new objects; the input rows
    // are never mutated.
    function resolveQueue(rows) {
        const pool = [];
        const resolved = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const families = familiesOf(row.lookup);
            const chips = [];
            let total = 0;

            // Gather every pooled buff that could reach this row, decide each
            // one's fate, then spend only the ones that actually applied.
            const candidates = [];
            for (let p = 0; p < pool.length; p++) {
                const pooled = pool[p];
                if (!appliesToRow(pooled, families)) continue;
                candidates.push({ pooled: pooled, superseded: false });
            }
            markSuperseded(candidates);

            for (let c = 0; c < candidates.length; c++) {
                const pooled = candidates[c].pooled;

                if (candidates[c].superseded) {
                    chips.push(chip(pooled, "superseded"));
                    continue;
                }

                const reason = blockedReason(pooled, row);
                if (reason) {
                    // Blocked buffs are neither spent nor charged — a wrong
                    // mastery must not burn Mark's charge or consume Evolve.
                    const blocked = chip(pooled, "blocked");
                    blocked.reason = reason;
                    chips.push(blocked);
                    continue;
                }

                if (row.dismissed.indexOf(pooled.uid) !== -1) {
                    // Same rule: dismissing leaves the charge for a later row.
                    chips.push(chip(pooled, "dismissed"));
                    continue;
                }

                // Capture charge-ness BEFORE spending: spend() turns a null
                // remaining into 0 for any non-persistent buff, so reading it
                // afterwards would hang a bogus "0 left" on every once buff.
                const wasCharge = pooled.remaining !== null;
                const applied = chip(pooled, "applied");
                total += pooled.value;
                spend(pooled);
                if (wasCharge) applied.remaining = pooled.remaining;
                chips.push(applied);
            }

            drainSpent(pool);

            total += toNumber(row.manualMod);

            // tags and dismissed are cloned, not aliased. Object.assign copies
            // arrays by reference, which would leave every resolved row sharing
            // the queue row's arrays — and the renderer writing through to them.
            resolved.push(Object.assign({}, row, {
                tags: row.tags.slice(),
                dismissed: row.dismissed.slice(),
                families: families,
                chips: chips,
                total: total,
            }));

            const produced = producedBuff(row);
            if (produced) pool.push(produced);
        }

        return resolved;
    }

    // `source` is the producer's lookup — kept for display and for the
    // superseded/best-of-source comparison in markSuperseded, where two
    // different producing rows of the same action should still compete
    // against each other. `uid` is the producing row's own id, and is what
    // dismissal keys on: two rows of the same lookup (two Mark casts) must be
    // independently dismissible, and `source` alone cannot tell them apart.
    function chip(pooled, state) {
        return {
            source: pooled.source,
            uid: pooled.uid,
            label: pooled.label,
            value: pooled.value,
            state: state,
        };
    }

    // "once" is a single charge; "persistent" never depletes.
    function spend(pooled) {
        if (pooled.entry.duration === "persistent") return;
        if (pooled.remaining === null) {
            pooled.remaining = 0;
            return;
        }
        pooled.remaining -= 1;
    }

    function drainSpent(pool) {
        for (let i = pool.length - 1; i >= 0; i--) {
            const p = pool[i];
            if (p.entry.duration === "persistent") continue;
            if (p.remaining !== null && p.remaining <= 0) pool.splice(i, 1);
        }
    }

    return { resolveQueue: resolveQueue, makeRow: makeRow };
})();

window.PlanQueue = PlanQueue;
