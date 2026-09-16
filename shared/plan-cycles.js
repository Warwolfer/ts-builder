// shared/plan-cycles.js
//
// The Plan Mode queue's cycles, as data. Every function here takes a cycles
// array and returns a new one — the rail re-renders from whatever it gets
// back, so nothing mutates in place and nothing here touches the DOM or
// localStorage. resource/plan-mode.js owns both of those.
//
// A cycle is { name, rows }. `rows` are PlanQueue rows; this file never looks
// inside one.
(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.PlanCycles = api;
})(this, function () {
    "use strict";

    // A queue is one thread's plan. Twenty is far past any real fight, and the
    // tab bar has to stay readable at the width the rail gets.
    const MAX_CYCLES = 20;

    function defaultName(index) {
        return "Cycle " + (index + 1);
    }

    function cleanCycle(cycle, index) {
        const name = cycle && typeof cycle.name === "string" && cycle.name.trim()
            ? cycle.name.trim()
            : defaultName(index);
        const rows = cycle && Array.isArray(cycle.rows) ? cycle.rows : [];
        return { name: name, rows: rows };
    }

    /**
     * Whatever came out of localStorage, as a shape the rail can use.
     * Returns null when there is nothing usable — the caller then treats it
     * exactly as a fingerprint mismatch and starts empty.
     *
     * The pre-cycles shape was { fingerprint, rows }. It migrates to a single
     * cycle rather than being discarded: a player who queued ten rows before
     * this feature shipped should not lose them to it.
     */
    function migrateStored(parsed) {
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

        if (Array.isArray(parsed.cycles)) {
            if (!parsed.cycles.length) return null;
            const cycles = parsed.cycles.slice(0, MAX_CYCLES).map(cleanCycle);
            let active = parseInt(parsed.active, 10);
            if (isNaN(active) || active < 0 || active >= cycles.length) active = 0;
            return { active: active, cycles: cycles };
        }

        if (Array.isArray(parsed.rows) || parsed.rows === undefined) {
            return {
                active: 0,
                cycles: [{ name: defaultName(0), rows: Array.isArray(parsed.rows) ? parsed.rows : [] }],
            };
        }

        return null;
    }

    /**
     * One above the highest "Cycle N" already present. A renamed tab does not
     * hold the numbering back: tabs named Boss and Cycle 3 give Cycle 4, so a
     * new tab never collides with a name already on screen.
     */
    function nextCycleName(cycles) {
        let highest = 0;
        const list = Array.isArray(cycles) ? cycles : [];
        for (let i = 0; i < list.length; i++) {
            const match = /^Cycle (\d+)$/.exec(String((list[i] && list[i].name) || "").trim());
            if (match) {
                const n = parseInt(match[1], 10);
                if (n > highest) highest = n;
            }
        }
        return "Cycle " + (highest + 1);
    }

    /** Appends an empty cycle. Returns the input unchanged at the cap. */
    function addCycle(cycles) {
        const list = Array.isArray(cycles) ? cycles : [];
        if (list.length >= MAX_CYCLES) return cycles;
        return list.concat([{ name: nextCycleName(list), rows: [] }]);
    }

    /** Renames one cycle. A blank name keeps the old one. */
    function renameCycle(cycles, index, name) {
        const list = Array.isArray(cycles) ? cycles : [];
        if (!list[index]) return cycles;
        const trimmed = typeof name === "string" ? name.trim() : "";
        if (!trimmed) return cycles;
        return list.map(function (cycle, i) {
            return i === index ? { name: trimmed, rows: cycle.rows } : cycle;
        });
    }

    /** A usable active index for a list of this length, defaulting to 0 for
     * anything out of range, non-numeric, or missing. */
    function normalizeActive(active, length) {
        if (!length) return 0;
        const n = parseInt(active, 10);
        if (isNaN(n) || n < 0 || n >= length) return 0;
        return n;
    }

    /**
     * Drops one cycle and says which is active afterwards. The last cycle
     * cannot go: an empty tab bar has nowhere to put a row.
     *
     * `active` is the caller's current active index, not the index being
     * deleted - the caller passes both because only it knows which tab
     * someone is actually sitting on. Deleting the active cycle clamps onto
     * a neighbor, same as before; deleting one before it shifts the active
     * cycle's own index down by one, since everything after the deleted
     * slot moves up; deleting one after it leaves the active cycle exactly
     * where it was, index and all.
     */
    function deleteCycle(cycles, index, active) {
        const list = Array.isArray(cycles) ? cycles : [];
        const safeActive = normalizeActive(active, list.length);
        if (list.length <= 1 || !list[index]) return { cycles: cycles, active: safeActive };

        const out = list.slice(0, index).concat(list.slice(index + 1));
        let nextActive;
        if (index === safeActive) {
            nextActive = Math.max(0, Math.min(index, out.length - 1));
        } else if (index < safeActive) {
            nextActive = safeActive - 1;
        } else {
            nextActive = safeActive;
        }
        return { cycles: out, active: nextActive };
    }

    return {
        MAX_CYCLES: MAX_CYCLES,
        migrateStored: migrateStored,
        nextCycleName: nextCycleName,
        addCycle: addCycle,
        renameCycle: renameCycle,
        deleteCycle: deleteCycle,
    };
});
