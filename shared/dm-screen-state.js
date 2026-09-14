// shared/dm-screen-state.js
//
// The DM Screen's model: a named screen holding cycles, each holding custom
// actions. Pure and immutable — every function returns a new screen and
// never touches the one it was given. That is what makes "has this changed
// since it was saved" a single comparison in the controller, and what lets
// this file be tested without a browser.
//
// Shape (see the spec, Section 4):
//   { v: 1, id, name, cycles: [ { id, name, actions: [ { id, action } ] } ],
//     createdAt, updatedAt }
//
// Ids are local to this browser and are regenerated on import (withNewIds),
// so two DMs importing the same screen code never share one.
const DmScreenState = (function () {
    const DEFAULT_SCREEN_NAME = "New Screen";
    const CYCLE_NAME = /^cycle\s+(\d+)$/i;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function trimmed(text) {
        return String(text == null ? "" : text).trim();
    }

    function newScreen(opts) {
        return {
            v: 1,
            id: opts.id,
            name: DEFAULT_SCREEN_NAME,
            cycles: [{ id: opts.id + "-c1", name: "Cycle 1", actions: [] }],
            createdAt: opts.now,
            updatedAt: opts.now,
        };
    }

    // "Cycle N" one above the highest existing "Cycle N". Other names are
    // ignored, so a screen of ["Boss"] gets "Cycle 1".
    function nextCycleName(cycles) {
        let highest = 0;
        for (let i = 0; i < cycles.length; i++) {
            const match = CYCLE_NAME.exec(String(cycles[i].name || ""));
            if (match) highest = Math.max(highest, parseInt(match[1], 10));
        }
        return "Cycle " + (highest + 1);
    }

    function findCycle(screen, cycleId) {
        for (let i = 0; i < screen.cycles.length; i++) {
            if (screen.cycles[i].id === cycleId) return screen.cycles[i];
        }
        return null;
    }

    function findAction(cycle, actionId) {
        if (!cycle) return null;
        for (let i = 0; i < cycle.actions.length; i++) {
            if (cycle.actions[i].id === actionId) return cycle.actions[i];
        }
        return null;
    }

    // Every mutation goes through here: copy, apply, stamp.
    function mutate(screen, now, fn) {
        const next = clone(screen);
        fn(next);
        next.updatedAt = now;
        return next;
    }

    function requireCycle(screen, cycleId) {
        const cycle = findCycle(screen, cycleId);
        if (!cycle) throw new Error("No cycle with id " + cycleId);
        return cycle;
    }

    function renameScreen(screen, name, now) {
        return mutate(screen, now, function (s) {
            s.name = trimmed(name) || DEFAULT_SCREEN_NAME;
        });
    }

    function addCycle(screen, opts) {
        return mutate(screen, opts.now, function (s) {
            s.cycles.push({ id: opts.id, name: nextCycleName(s.cycles), actions: [] });
        });
    }

    function renameCycle(screen, cycleId, name, now) {
        return mutate(screen, now, function (s) {
            const cycle = requireCycle(s, cycleId);
            const clean = trimmed(name);
            if (clean) cycle.name = clean;
        });
    }

    function deleteCycle(screen, cycleId, now) {
        if (screen.cycles.length <= 1) throw new Error("Cannot delete the last cycle");
        requireCycle(screen, cycleId);
        return mutate(screen, now, function (s) {
            s.cycles = s.cycles.filter(function (c) { return c.id !== cycleId; });
        });
    }

    function addAction(screen, cycleId, action, opts) {
        return mutate(screen, opts.now, function (s) {
            requireCycle(s, cycleId).actions.push({ id: opts.id, action: clone(action) });
        });
    }

    function updateAction(screen, cycleId, actionId, action, now) {
        return mutate(screen, now, function (s) {
            const entry = findAction(requireCycle(s, cycleId), actionId);
            if (!entry) throw new Error("No action with id " + actionId);
            entry.action = clone(action);
        });
    }

    function deleteAction(screen, cycleId, actionId, now) {
        return mutate(screen, now, function (s) {
            const cycle = requireCycle(s, cycleId);
            cycle.actions = cycle.actions.filter(function (e) { return e.id !== actionId; });
        });
    }

    function copyAction(screen, fromCycleId, actionId, toCycleId, opts) {
        const entry = findAction(requireCycle(screen, fromCycleId), actionId);
        if (!entry) throw new Error("No action with id " + actionId);
        return addAction(screen, toCycleId, entry.action, opts);
    }

    function cycleActions(screen, cycleId) {
        const cycle = findCycle(screen, cycleId);
        if (!cycle) return [];
        return cycle.actions.map(function (e) { return clone(e.action); });
    }

    // For import: the same screen with every id replaced and the clock reset,
    // so nothing collides with what this browser already holds.
    function withNewIds(screen, opts) {
        const next = clone(screen);
        next.id = opts.idFn();
        // Two passes, cycles then actions, so the order ids are handed out is
        // easy to reason about (and to pin in a test).
        for (let c = 0; c < next.cycles.length; c++) {
            next.cycles[c].id = opts.idFn();
        }
        for (let c = 0; c < next.cycles.length; c++) {
            for (let a = 0; a < next.cycles[c].actions.length; a++) {
                next.cycles[c].actions[a].id = opts.idFn();
            }
        }
        next.createdAt = opts.now;
        next.updatedAt = opts.now;
        return next;
    }

    return {
        DEFAULT_SCREEN_NAME: DEFAULT_SCREEN_NAME,
        newScreen: newScreen,
        nextCycleName: nextCycleName,
        findCycle: findCycle,
        findAction: findAction,
        renameScreen: renameScreen,
        addCycle: addCycle,
        renameCycle: renameCycle,
        deleteCycle: deleteCycle,
        addAction: addAction,
        updateAction: updateAction,
        deleteAction: deleteAction,
        copyAction: copyAction,
        cycleActions: cycleActions,
        withNewIds: withNewIds,
    };
})();

if (typeof window !== "undefined") window.DmScreenState = DmScreenState;
