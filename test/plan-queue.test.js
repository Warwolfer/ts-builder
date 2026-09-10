"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { PlanQueue, PlanBuffs } = load();
const { resolveQueue, makeRow } = PlanQueue;

// Terse row builders. Real rows carry rollHtml and a name too, but the engine
// only reads identity, rank, tags and the three user-editable fields.
function row(lookup, opts) {
    return makeRow(Object.assign({ lookup: lookup, rankLetter: "B" }, opts || {}));
}

function totals(rows) {
    return resolveQueue(rows).map((r) => r.total);
}

function chipLabels(resolved) {
    return resolved.chips.filter((c) => c.state === "applied").map((c) => c.label);
}

test("a queue with no buffs totals zero everywhere", () => {
    assert.deepStrictEqual(totals([row("attack"), row("torment")]), [0, 0]);
});

test("a persistent buff feeds every later main action", () => {
    // Evolve reads the Metamorph rank, supplied on the Evolve row itself.
    const rows = [
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("attack", { masteryId: "power" }),
        row("heal", { masteryId: "power" }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 15, 15]);
});

test("a once buff is spent by the first eligible row and gone after", () => {
    const rows = [
        row("duelist", { rankLetter: "A", tags: ["Challenge"] }),
        row("attack"),
        row("attack"),
    ];
    assert.deepStrictEqual(totals(rows), [0, 40, 0]);
});

test("a buff added after the action it should feed does not apply", () => {
    // Order is the model. Drag it up in the UI instead.
    const rows = [row("attack"), row("duelist", { rankLetter: "A", tags: ["Challenge"] })];
    assert.deepStrictEqual(totals(rows), [0, 0]);
});

test("reordering the same rows changes the result", () => {
    const duelist = row("duelist", { rankLetter: "A", tags: ["Challenge"] });
    const attack = row("attack");
    assert.deepStrictEqual(totals([attack, duelist]), [0, 0]);
    assert.deepStrictEqual(totals([duelist, attack]), [0, 40]);
});

test("a buff whose requiresTag is absent produces nothing", () => {
    // Duelist without Challenge deals its passive damage but grants no modifier.
    const rows = [row("duelist", { rankLetter: "A" }), row("attack")];
    assert.deepStrictEqual(totals(rows), [0, 0]);
});

test("an attack-only buff does not feed a heal", () => {
    // Mark says "attacks"; Heal is mainAction but not attack.
    const rows = [row("mark", { rankLetter: "A" }), row("heal")];
    assert.deepStrictEqual(totals(rows), [0, 0]);
});

test("a mainAction buff feeds heals and buffs as well as attacks", () => {
    const rows = [row("exceed", { rankLetter: "S" }), row("buff"), row("power-heal")];
    assert.deepStrictEqual(totals(rows), [0, 30, 30]);
});

test("buffs from several sources stack on one row", () => {
    const rows = [
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("duelist", { rankLetter: "A", masteryId: "power", tags: ["Challenge"] }),
        row("reckless-attack", { masteryId: "power" }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0, 55]);
    assert.deepStrictEqual(
        chipLabels(resolveQueue(rows)[2]).sort(),
        ["Duelist · Challenge", "Evolve"],
    );
});

test("the manual modifier is added to the computed total", () => {
    const rows = [
        row("duelist", { rankLetter: "A", tags: ["Challenge"] }),
        row("attack", { manualMod: 10 }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 50]);
});

test("a manual modifier applies with no buffs present", () => {
    assert.deepStrictEqual(totals([row("attack", { manualMod: 25 })]), [25]);
});

test("a negative manual modifier subtracts", () => {
    assert.deepStrictEqual(totals([row("attack", { manualMod: -5 })]), [-5]);
});

test("a non-numeric manual modifier counts as zero rather than NaN", () => {
    assert.deepStrictEqual(totals([row("attack", { manualMod: "" })]), [0]);
    assert.deepStrictEqual(totals([row("attack", { manualMod: "abc" })]), [0]);
});

test("resolve is pure: it does not mutate the rows it is given", () => {
    const rows = [row("duelist", { rankLetter: "A", tags: ["Challenge"] }), row("attack")];
    const before = JSON.stringify(rows);
    resolveQueue(rows);
    assert.strictEqual(JSON.stringify(rows), before);
});

test("save and check pseudo-rows consume but never produce", () => {
    const rows = [row("adapt", { rankLetter: "B", tags: ["Fend"] }), row("@save")];
    assert.deepStrictEqual(totals(rows), [0, 15]);
});

test("an unknown lookup queues harmlessly and contributes nothing", () => {
    assert.deepStrictEqual(totals([row("not-an-action"), row("attack")]), [0, 0]);
});

test("makeRow fills defaults and assigns a unique id", () => {
    const a = makeRow({ lookup: "attack" });
    const b = makeRow({ lookup: "attack" });
    assert.notStrictEqual(a.uid, b.uid);
    assert.deepStrictEqual(a.tags, []);
    assert.deepStrictEqual(a.dismissed, []);
    assert.strictEqual(a.manualMod, 0);
});

test("makeRow keeps its counter ahead of a restored uid", () => {
    // Assert the invariant — a fresh uid outranks any uid restored before it —
    // rather than mere non-collision. `nextUid` is module state shared across
    // this whole file, so by the time this test runs the ambient counter is
    // already well past any small literal; a non-collision assertion would pass
    // even against the bug. Ordering is what actually fails without the fix.
    const HIGH = 9000;
    const restored = makeRow({ lookup: "attack", uid: "r" + HIGH });
    assert.strictEqual(restored.uid, "r" + HIGH);
    const fresh = makeRow({ lookup: "attack" });
    const n = parseInt(String(fresh.uid).replace(/^r/, ""), 10);
    assert.ok(n > HIGH, `fresh uid ${fresh.uid} must outrank the restored r${HIGH}`);
});

test("I6: a numeric restored uid is coerced to a string, addressable like any other", () => {
    // A stored uid of 42 (e.g. hand-edited or a lossy round-trip) must not
    // silently survive as a number: rowByUid and the DOM's data-uid both
    // compare with === against a string, and 42 === "42" is false — which
    // would make remove/move/dismiss/Self silently no-op for that row.
    const restored = makeRow({ lookup: "attack", uid: 42 });
    assert.strictEqual(restored.uid, "42");
    assert.strictEqual(typeof restored.uid, "string");
    // And the uid counter still catches up from a stringified number.
    const fresh = makeRow({ lookup: "attack" });
    const n = parseInt(String(fresh.uid).replace(/^r/, ""), 10);
    assert.ok(n > 42, `fresh uid ${fresh.uid} must outrank restored uid 42`);
});

test("a malformed restored uid cannot poison the counter", () => {
    // A hand-edited or corrupted storage value must not turn every later uid
    // into "rNaN", which would collide with itself.
    makeRow({ lookup: "attack", uid: "not-a-uid" });
    makeRow({ lookup: "attack", uid: "r" });
    const fresh = makeRow({ lookup: "attack" });
    assert.match(fresh.uid, /^r\d+$/);
});

test("resolved rows do not alias the queue row's arrays", () => {
    const rows = [row("mark", { rankLetter: "B" }), row("attack")];
    const resolved = resolveQueue(rows);
    resolved[1].dismissed.push("mark");
    resolved[0].tags.push("Bogus");
    assert.deepStrictEqual(rows[1].dismissed, []);
    assert.deepStrictEqual(rows[0].tags, []);
});

test("makeRow defaults targetSelf from the buff's target", () => {
    // Mark is target "self" even though it renders a checkbox; Coordinate is not.
    assert.strictEqual(makeRow({ lookup: "mark" }).targetSelf, true);
    assert.strictEqual(makeRow({ lookup: "coordinate" }).targetSelf, false);
    // An action with no buff entry is self by default; nothing reads it.
    assert.strictEqual(makeRow({ lookup: "attack" }).targetSelf, true);
});

test("a charge buff feeds exactly its charge count", () => {
    // Mark at B rank: 2 charges.
    const rows = [row("mark", { rankLetter: "B" }), row("attack"), row("attack"), row("attack")];
    assert.deepStrictEqual(totals(rows), [0, 20, 20, 0]);
});

test("Mark gains a third charge at S rank", () => {
    const rows = [
        row("mark", { rankLetter: "S" }),
        row("attack"), row("attack"), row("attack"), row("attack"),
    ];
    assert.deepStrictEqual(totals(rows), [0, 30, 30, 30, 0]);
});

test("charges are only spent by rows the buff applies to", () => {
    // The Heal between the attacks is not an attack, so it consumes no charge.
    const rows = [row("mark", { rankLetter: "B" }), row("attack"), row("heal"), row("attack")];
    assert.deepStrictEqual(totals(rows), [0, 20, 0, 20]);
});

test("an applied charge chip reports how many charges remain", () => {
    const resolved = resolveQueue([row("mark", { rankLetter: "S" }), row("attack")]);
    assert.strictEqual(resolved[1].chips[0].remaining, 2);
});

test("Evolve applies only to main actions using the evolved mastery", () => {
    const rows = [
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("attack", { masteryId: "power" }),
        row("attack", { masteryId: "precision" }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 15, 0]);
});

test("a mastery mismatch is reported as blocked, not hidden", () => {
    // The chip must still render, greyed with a reason. Silently vanishing
    // would leave you wondering whether the tool forgot.
    const resolved = resolveQueue([
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("attack", { masteryId: "precision" }),
    ]);
    const chip = resolved[1].chips[0];
    assert.strictEqual(chip.state, "blocked");
    assert.match(chip.reason, /mastery/i);
});

test("a blocked mastery match does not consume a persistent buff", () => {
    const rows = [
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("attack", { masteryId: "precision" }),
        row("attack", { masteryId: "power" }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0, 15]);
});

test("dismissing a chip zeroes it without removing the producing row", () => {
    // You cast Mark, but someone else spent the charges before your attack.
    // Dismissed is keyed on the producing row's uid, not its lookup — see the
    // I4 tests below for why.
    const mark = row("mark", { rankLetter: "B" });
    const rows = [
        mark,
        row("attack", { dismissed: [mark.uid] }),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0]);
    const resolved = resolveQueue(rows);
    assert.strictEqual(resolved[1].chips[0].state, "dismissed");
});

test("a dismissed chip does not consume a charge, leaving it for a later row", () => {
    const mark = row("mark", { rankLetter: "B" });
    const rows = [
        mark,
        row("attack", { dismissed: [mark.uid] }),
        row("attack"),
        row("attack"),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0, 20, 20]);
});

test("dismissal is per row, not global", () => {
    const duelist = row("duelist", { rankLetter: "A", tags: ["Challenge"] });
    const rows = [
        duelist,
        row("attack", { dismissed: [duelist.uid] }),
        row("attack"),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0, 40]);
});

test("I4: two same-source rows are independently dismissible", () => {
    // Two Mark casts (e.g. two Hyper Sense users) stack per the rules. A chip
    // keyed on lookup alone cannot tell which Mark produced it, so dismissing
    // one row's Mark chip would previously dismiss both. Keying on the
    // producing row's uid keeps them independent.
    const markLow = row("mark", { rankLetter: "B" }); // +20
    const markHigh = row("mark", { rankLetter: "S" }); // +30
    const rows = [markLow, markHigh, row("attack")];

    const bothApplied = resolveQueue(rows);
    assert.deepStrictEqual(
        bothApplied[2].chips.map((c) => c.state),
        ["applied", "applied"],
    );
    assert.strictEqual(bothApplied[2].total, 50);

    // Dismiss only the lower-value Mark's chip on the attack row.
    rows[2].dismissed.push(markLow.uid);
    const oneApplied = resolveQueue(rows);
    assert.deepStrictEqual(
        oneApplied[2].chips.map((c) => c.state),
        ["dismissed", "applied"],
    );
    assert.strictEqual(oneApplied[2].total, 30);
});

test("I4: a chip carries the producing row's uid, not just its lookup", () => {
    const mark = row("mark", { rankLetter: "B" });
    const resolved = resolveQueue([mark, row("attack")]);
    assert.strictEqual(resolved[1].chips[0].uid, mark.uid);
    assert.strictEqual(resolved[1].chips[0].source, "mark");
});

test("I4: a stale lookup-keyed dismissal (pre-fix storage) is dropped, not mis-applied", () => {
    // A queue persisted before this fix stored dismissed=["mark"] (a lookup).
    // Restored against the current engine, that string can never equal a
    // uid ("r123"), so it simply fails to match — the buff applies normally
    // rather than silently staying dismissed or crashing.
    const mark = row("mark", { rankLetter: "B" });
    const rows = [mark, row("attack", { dismissed: ["mark"] })];
    assert.deepStrictEqual(totals(rows), [0, 20]);
});

test("an unchecked Self stops an ally-targeted buff feeding your rows", () => {
    const rows = [row("coordinate", { rankLetter: "S" }), row("attack")];
    assert.deepStrictEqual(totals(rows), [0, 0]);
});

test("checking Self makes an ally-targeted buff feed your rows", () => {
    const rows = [row("coordinate", { rankLetter: "S", targetSelf: true }), row("attack")];
    assert.deepStrictEqual(totals(rows), [0, 25]);
});

test("unchecking Self on Mark stops it without deleting the row", () => {
    const rows = [row("mark", { rankLetter: "B", targetSelf: false }), row("attack")];
    assert.deepStrictEqual(totals(rows), [0, 0]);
    // The Mark row survives, because you still need its roll code.
    assert.strictEqual(resolveQueue(rows).length, 2);
});

test("two non-stackable sources keep only the highest", () => {
    // No seed buff is non-stackable — Inspire was, and is being removed from
    // the rules — so the rule is exercised against a temporary entry.
    PlanBuffs.table.__nonstack = {
        label: "Test Non-Stackable",
        rankFrom: "clicked",
        values: { d: 5, c: 5, b: 10, a: 10, s: 15 },
        appliesTo: ["attack"],
        duration: "persistent",
        target: "self",
        stackable: false,
        source: "ts-discord-bot (test fixture)",
    };
    try {
        const rows = [
            row("__nonstack", { rankLetter: "D" }),
            row("__nonstack", { rankLetter: "S" }),
            row("attack"),
        ];
        assert.deepStrictEqual(totals(rows), [0, 0, 15]);
        assert.deepStrictEqual(
            resolveQueue(rows)[2].chips.map((c) => c.state).sort(),
            ["applied", "superseded"],
        );
    } finally {
        delete PlanBuffs.table.__nonstack;
    }
});

test("an applied once buff carries no charge count", () => {
    // "once" is not charge-based — chargesFor returns null for it — so a chip
    // reading "0 left" would be indistinguishable from a spent charge buff.
    const resolved = resolveQueue([
        row("duelist", { rankLetter: "A", tags: ["Challenge"] }),
        row("attack"),
    ]);
    const applied = resolved[1].chips[0];
    assert.strictEqual(applied.state, "applied");
    assert.ok(!("remaining" in applied), `once chip carried remaining=${applied.remaining}`);
});

test("a mastery-match buff is blocked when either mastery is unknown", () => {
    const noConsumerMastery = resolveQueue([
        row("evolve", { rankLetter: "B", masteryId: "power" }),
        row("attack"),
    ]);
    assert.deepStrictEqual(noConsumerMastery.map((r) => r.total), [0, 0]);
    assert.strictEqual(noConsumerMastery[1].chips[0].state, "blocked");

    const noProducerMastery = resolveQueue([
        row("evolve", { rankLetter: "B" }),
        row("attack", { masteryId: "power" }),
    ]);
    assert.deepStrictEqual(noProducerMastery.map((r) => r.total), [0, 0]);
    assert.strictEqual(noProducerMastery[1].chips[0].state, "blocked");
});

test("stackable buffs from different sources both apply", () => {
    const rows = [
        row("mark", { rankLetter: "B" }),
        row("duelist", { rankLetter: "A", tags: ["Challenge"] }),
        row("attack"),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0, 60]);
});

test("two rows of the same stackable buff both apply", () => {
    // Marks may stack when there are multiple Hyper Sense users.
    const rows = [
        row("mark", { rankLetter: "B" }),
        row("mark", { rankLetter: "S" }),
        row("attack"),
    ];
    assert.deepStrictEqual(totals(rows), [0, 0, 50]);
});

test("makeRow rejects non-array tags and dismissed rather than duck-typing them", () => {
    // A string has .slice(), so it used to pass straight through and then throw
    // in the renderer's tags.join() — outside every guard, taking down the page.
    for (const bad of ["x", 42, true, {}]) {
        const row = makeRow({ lookup: "attack", tags: bad, dismissed: bad });
        assert.ok(Array.isArray(row.tags), `tags became ${typeof row.tags}`);
        assert.ok(Array.isArray(row.dismissed), `dismissed became ${typeof row.dismissed}`);
    }
});

test("a row rebuilt from malformed stored fields still resolves and renders", () => {
    // The renderer calls tags.join and reads chips/total; resolveQueue must
    // produce something it can safely consume.
    const resolved = resolveQueue([makeRow({ lookup: "attack", tags: "x" })]);
    assert.deepStrictEqual(resolved[0].tags, []);
    assert.strictEqual(typeof resolved[0].total, "number");
    assert.ok(Array.isArray(resolved[0].chips));
});
