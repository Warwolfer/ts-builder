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
    function makeRow(fields) {
        const entry = buffFor(fields.lookup);
        const row = {
            uid: "r" + nextUid++,
            lookup: fields.lookup,
            name: fields.name || fields.lookup,
            masteryId: fields.masteryId || null,
            masteryName: fields.masteryName || "",
            rankLetter: fields.rankLetter || "",
            tags: fields.tags ? fields.tags.slice() : [],
            rollHtml: fields.rollHtml || "",
            dice: fields.dice || "",
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
        if (fields.dismissed) row.dismissed = fields.dismissed.slice();
        if (fields.uid) row.uid = fields.uid;
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

            for (let p = 0; p < pool.length; p++) {
                const pooled = pool[p];
                if (!appliesToRow(pooled, families)) continue;

                if (row.dismissed.indexOf(pooled.source) !== -1) {
                    chips.push(chip(pooled, "dismissed"));
                    continue;
                }

                chips.push(chip(pooled, "applied"));
                total += pooled.value;
                spend(pooled);
            }

            drainSpent(pool);

            total += toNumber(row.manualMod);

            resolved.push(Object.assign({}, row, {
                families: families,
                chips: chips,
                total: total,
            }));

            const produced = producedBuff(row);
            if (produced) pool.push(produced);
        }

        return resolved;
    }

    function chip(pooled, state) {
        return {
            source: pooled.source,
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
