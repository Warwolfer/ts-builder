// ts-builder/test/custom-action-codec.test.js
"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
const Codec = require(path.join(__dirname, "..", "shared", "custom-action-codec.js"));

// The DM's chart from the spec, in full.
function splitter() {
    return {
        v: 1,
        n: "Enraged Tide Splitter",
        d: "Take 20d20 damage, then make a Fortitude Save and consult the chart.",
        p: [["Base damage", "20d20"]],
        k: ["fortitude"],
        g: [
            [40, "Take an additional 20d20 damage"],
            [60, "Take an additional 12d20 damage"],
            [80, "Take an additional 10d20 damage"],
            [100, "Take an additional 8d20 damage"],
            [120, "Take an additional 6d20 damage"],
            [140, "Take an additional 4d20 damage"],
            [null, "Take an additional 2d20 damage"],
        ],
    };
}

// --- validateAction: the shapes it must accept -------------------------------

test("a full action with every field is valid", () => {
    assert.strictEqual(Codec.validateAction(splitter()), null);
});

test("a roll payload with no description and no roll types is valid", () => {
    const a = splitter();
    delete a.d;
    delete a.k;
    delete a.p;
    assert.strictEqual(Codec.validateAction(a), null);
});

test("one degree that covers everything is valid", () => {
    assert.strictEqual(Codec.validateAction({ v: 1, n: "Flat", g: [[null, "Take 10 damage"]] }), null);
});

// --- validateAction: the shapes it must refuse -------------------------------

test("a non-object is refused", () => {
    for (const bad of [null, undefined, 7, "x", []]) {
        assert.match(String(Codec.validateAction(bad)), /action/i);
    }
});

test("an unknown field is refused by name", () => {
    const a = splitter();
    a.zzz = 1;
    assert.match(Codec.validateAction(a), /zzz/);
});

test("a wrong version is refused", () => {
    const a = splitter();
    a.v = 2;
    assert.match(Codec.validateAction(a), /version/i);
});

test("an empty or overlong name is refused", () => {
    const a = splitter();
    a.n = "   ";
    assert.match(Codec.validateAction(a), /name/i);
    a.n = "x".repeat(61);
    assert.match(Codec.validateAction(a), /name/i);
});

test("an overlong description is refused", () => {
    const a = splitter();
    a.d = "x".repeat(301);
    assert.match(Codec.validateAction(a), /description/i);
});

test("a bad dice string in p is refused", () => {
    for (const bad of ["20", "d20", "0d20", "101d20", "20d1", "20d1001", "20 d 20", "20d20+5"]) {
        const a = splitter();
        a.p = [["Base damage", bad]];
        assert.match(String(Codec.validateAction(a)), /dice/i, `expected ${bad} to be refused`);
    }
});

test("a good dice string in p is accepted", () => {
    for (const good of ["1d2", "20d20", "100d1000"]) {
        const a = splitter();
        a.p = [["Base damage", good]];
        assert.strictEqual(Codec.validateAction(a), null, `expected ${good} to be accepted`);
    }
});

test("more than five dice rows are refused", () => {
    const a = splitter();
    a.p = [];
    for (let i = 0; i < 6; i++) a.p.push(["row " + i, "1d6"]);
    assert.match(Codec.validateAction(a), /five|5/i);
});

test("an unknown roll kind is refused", () => {
    const a = splitter();
    a.k = ["fortitude", "charisma"];
    assert.match(Codec.validateAction(a), /charisma/);
});

test("a repeated roll kind is refused", () => {
    const a = splitter();
    a.k = ["fortitude", "fortitude"];
    assert.match(Codec.validateAction(a), /twice|repeat/i);
});

test("an empty roll-kind list is refused", () => {
    const a = splitter();
    a.k = [];
    assert.match(Codec.validateAction(a), /roll type/i);
});

test("degrees that do not rise are refused", () => {
    const a = splitter();
    a.g = [[60, "a"], [40, "b"], [null, "c"]];
    assert.match(Codec.validateAction(a), /rise|order/i);
});

test("equal bounds are refused: rising means strictly rising", () => {
    const a = splitter();
    a.g = [[40, "a"], [40, "b"], [null, "c"]];
    assert.match(Codec.validateAction(a), /rise|order/i);
});

test("a last bound that is not null is refused", () => {
    const a = splitter();
    a.g = [[40, "a"], [60, "b"]];
    assert.match(Codec.validateAction(a), /last/i);
});

test("a null bound anywhere but last is refused", () => {
    const a = splitter();
    a.g = [[null, "a"], [60, "b"], [null, "c"]];
    assert.match(Codec.validateAction(a), /last/i);
});

test("an empty degree text is refused", () => {
    const a = splitter();
    a.g = [[40, "  "], [null, "c"]];
    assert.match(Codec.validateAction(a), /text/i);
});

test("no degrees at all is refused", () => {
    const a = splitter();
    a.g = [];
    assert.match(Codec.validateAction(a), /degree/i);
});

// --- stripForRoll ------------------------------------------------------------

test("stripForRoll keeps the name, the pre-dice and the chart, and drops the rest", () => {
    assert.deepStrictEqual(Codec.stripForRoll(splitter()), {
        v: 1,
        n: "Enraged Tide Splitter",
        p: [["Base damage", "20d20"]],
        g: splitter().g,
    });
});

test("stripForRoll omits p entirely when there are no pre-dice", () => {
    const a = splitter();
    delete a.p;
    assert.deepStrictEqual(Object.keys(Codec.stripForRoll(a)), ["v", "n", "g"]);
});

test("a stripped action is still valid", () => {
    assert.strictEqual(Codec.validateAction(Codec.stripForRoll(splitter())), null);
});

// --- matchDegree -------------------------------------------------------------

test("matchDegree picks the first bound the total does not exceed", () => {
    const g = splitter().g;
    assert.strictEqual(Codec.matchDegree(g, 1), 0);
    assert.strictEqual(Codec.matchDegree(g, 40), 0);
    assert.strictEqual(Codec.matchDegree(g, 41), 1);
    assert.strictEqual(Codec.matchDegree(g, 60), 1);
    assert.strictEqual(Codec.matchDegree(g, 129), 5);
    assert.strictEqual(Codec.matchDegree(g, 141), 6);
    assert.strictEqual(Codec.matchDegree(g, 9999), 6);
});

test("matchDegree handles a total at or below zero", () => {
    assert.strictEqual(Codec.matchDegree(splitter().g, 0), 0);
    assert.strictEqual(Codec.matchDegree(splitter().g, -30), 0);
});

// --- rangeLabel --------------------------------------------------------------

test("rangeLabel names the first, middle and last bands", () => {
    const g = splitter().g;
    assert.strictEqual(Codec.rangeLabel(g, 0), "(40 or under)");
    assert.strictEqual(Codec.rangeLabel(g, 1), "(41-60)");
    assert.strictEqual(Codec.rangeLabel(g, 5), "(121-140)");
    assert.strictEqual(Codec.rangeLabel(g, 6), "(141+)");
});

test("a single all-covering degree is labelled (any)", () => {
    assert.strictEqual(Codec.rangeLabel([[null, "x"]], 0), "(any)");
});

// --- diceIn ------------------------------------------------------------------

test("diceIn finds every dice expression in a degree text", () => {
    assert.deepStrictEqual(Codec.diceIn("Take an additional 4d20 damage"),
        [{ count: 4, sides: 20, raw: "4d20" }]);
    assert.deepStrictEqual(Codec.diceIn("2d6 fire and 1d20 cold"),
        [{ count: 2, sides: 6, raw: "2d6" }, { count: 1, sides: 20, raw: "1d20" }]);
});

test("diceIn finds nothing in a text with no dice", () => {
    assert.deepStrictEqual(Codec.diceIn("No damage"), []);
    assert.deepStrictEqual(Codec.diceIn("Your armour is hardened"), []);
});

test("diceIn ignores a dice expression glued to a word", () => {
    assert.deepStrictEqual(Codec.diceIn("take 20d20damage"), []);
    assert.deepStrictEqual(Codec.diceIn("x20d20"), []);
});

test("diceIn drops counts and sides outside the safe range", () => {
    assert.deepStrictEqual(Codec.diceIn("0d20 and 101d20 and 5d1 and 5d1001"), []);
    assert.deepStrictEqual(Codec.diceIn("100d1000"), [{ count: 100, sides: 1000, raw: "100d1000" }]);
});

test("diceIn is case-insensitive and reports the text as written", () => {
    assert.deepStrictEqual(Codec.diceIn("Take 4D20"), [{ count: 4, sides: 20, raw: "4D20" }]);
});

test("diceIn tolerates a missing or non-string argument", () => {
    assert.deepStrictEqual(Codec.diceIn(null), []);
    assert.deepStrictEqual(Codec.diceIn(undefined), []);
    assert.deepStrictEqual(Codec.diceIn(7), []);
});

// --- validateScreen ----------------------------------------------------------

function screen() {
    return {
        v: 1,
        id: "1757000000000-ab12",
        name: "Night Watch",
        cycles: [{ id: "c1", name: "Cycle 1", actions: [{ id: "a1", action: splitter() }] }],
        createdAt: 1757000000000,
        updatedAt: 1757000000000,
    };
}

test("a screen with one cycle and one action is valid", () => {
    assert.strictEqual(Codec.validateScreen(screen()), null);
});

test("a screen with no cycles is refused", () => {
    const s = screen();
    s.cycles = [];
    assert.match(Codec.validateScreen(s), /cycle/i);
});

test("a screen carrying an invalid action is refused, and the reason names the action", () => {
    const s = screen();
    s.cycles[0].actions[0].action.n = "";
    assert.match(Codec.validateScreen(s), /name/i);
});

test("a screen with an unnamed cycle is refused", () => {
    const s = screen();
    s.cycles[0].name = "";
    assert.match(Codec.validateScreen(s), /cycle/i);
});

// --- the wire format ---------------------------------------------------------

const fs = require("fs");
const FIXTURES = JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures", "custom-actions.json"), "utf8"),
);

test("the pinned import codes decode to the pinned actions", async () => {
    for (const key of ["smash", "splitter"]) {
        const decoded = await Codec.decodeAction(FIXTURES[key].importCode);
        assert.deepStrictEqual(decoded, FIXTURES[key].action, `${key} import code`);
    }
});

test("the pinned roll codes decode to the stripped actions", async () => {
    for (const key of ["smash", "splitter"]) {
        const decoded = await Codec.decodeAction(FIXTURES[key].rollCode);
        assert.deepStrictEqual(decoded, Codec.stripForRoll(FIXTURES[key].action), `${key} roll code`);
    }
});

test("encoding reproduces the pinned codes byte for byte", async () => {
    for (const key of ["smash", "splitter"]) {
        assert.strictEqual(await Codec.encodeAction(FIXTURES[key].action),
            FIXTURES[key].importCode, `${key} import code`);
        assert.strictEqual(await Codec.encodeAction(Codec.stripForRoll(FIXTURES[key].action)),
            FIXTURES[key].rollCode, `${key} roll code`);
    }
});

test("the codes stay well inside a Discord message", async () => {
    for (const key of ["smash", "splitter"]) {
        assert.ok(FIXTURES[key].rollCode.length < 500,
            `${key} roll code is ${FIXTURES[key].rollCode.length} characters`);
    }
});

test("a code carries no character that would break a Discord argument", () => {
    for (const key of ["smash", "splitter"]) {
        assert.match(FIXTURES[key].importCode, /^[A-Za-z0-9_-]+$/);
        assert.match(FIXTURES[key].rollCode, /^[A-Za-z0-9_-]+$/);
    }
});

test("a list round-trips and keeps its order", async () => {
    const actions = [FIXTURES.smash.action, FIXTURES.splitter.action];
    const code = await Codec.encodeList(actions);
    assert.match(code, /^L1/);
    assert.deepStrictEqual(await Codec.decodeList(code), actions);
});

test("a screen round-trips", async () => {
    const s = {
        v: 1,
        id: "1757000000000-ab12",
        name: "Night Watch",
        cycles: [{ id: "c1", name: "Cycle 1", actions: [{ id: "a1", action: FIXTURES.splitter.action }] }],
        createdAt: 1757000000000,
        updatedAt: 1757000000000,
    };
    const code = await Codec.encodeScreen(s);
    assert.match(code, /^S1/);
    assert.deepStrictEqual(await Codec.decodeScreen(code), s);
});

test("decodeAny names what it found", async () => {
    const action = await Codec.decodeAny(FIXTURES.smash.importCode);
    assert.strictEqual(action.kind, "action");
    assert.deepStrictEqual(action.value, FIXTURES.smash.action);

    const list = await Codec.decodeAny(await Codec.encodeList([FIXTURES.smash.action]));
    assert.strictEqual(list.kind, "list");
    assert.strictEqual(list.value.length, 1);

    const screenCode = await Codec.encodeScreen({
        v: 1, id: "x", name: "N",
        cycles: [{ id: "c", name: "Cycle 1", actions: [] }],
        createdAt: 1, updatedAt: 1,
    });
    const screen = await Codec.decodeAny(screenCode);
    assert.strictEqual(screen.kind, "screen");
});

test("a screen code offered to decodeAction is refused by name", async () => {
    const screenCode = await Codec.encodeScreen({
        v: 1, id: "x", name: "N",
        cycles: [{ id: "c", name: "Cycle 1", actions: [] }],
        createdAt: 1, updatedAt: 1,
    });
    await assert.rejects(() => Codec.decodeAction(screenCode), (e) => {
        assert.strictEqual(e.name, "CodecError");
        assert.match(e.message, /DM Screen/i);
        return true;
    });
});

test("an action code offered to decodeScreen is refused by name", async () => {
    await assert.rejects(() => Codec.decodeScreen(FIXTURES.smash.importCode), (e) => {
        assert.match(e.message, /custom action/i);
        return true;
    });
});

test("junk is refused rather than throwing something unreadable", async () => {
    for (const junk of ["", "   ", "hello", "1", "1!!!!", "1AAAA", "L1zzzz"]) {
        await assert.rejects(() => Codec.decodeAny(junk), (e) => {
            assert.strictEqual(e.name, "CodecError", `for input ${JSON.stringify(junk)}`);
            return true;
        });
    }
});

test("surrounding whitespace in a pasted code is ignored", async () => {
    const decoded = await Codec.decodeAction("  \n" + FIXTURES.smash.importCode + "\t ");
    assert.deepStrictEqual(decoded, FIXTURES.smash.action);
});

test("a code whose content fails validation is refused with the validation reason", async () => {
    const bad = JSON.parse(JSON.stringify(FIXTURES.smash.action));
    bad.g = [[60, "a"], [40, "b"], [null, "c"]];
    // Encode without validating, the way a tampered code would look.
    const code = await Codec.encodeUnchecked(Codec.ACTION_PREFIX, bad);
    await assert.rejects(() => Codec.decodeAction(code), (e) => {
        assert.match(e.message, /rise/i);
        return true;
    });
});

test("encoding refuses an action that is not valid", async () => {
    await assert.rejects(() => Codec.encodeAction({ v: 1, n: "", g: [[null, "x"]] }), (e) => {
        assert.match(e.message, /name/i);
        return true;
    });
});

test("the biggest chart the rules allow still fits in a code", async () => {
    // 20 degrees is the maximum, 150 characters each: 3182 bytes of JSON,
    // inside the 4000-byte cap. This is the worst case a DM can legitimately
    // write, so it must encode and come back unchanged.
    const rows = [];
    for (let i = 0; i < 19; i++) rows.push([i + 1, "y".repeat(150)]);
    rows.push([null, "z".repeat(150)]);
    const big = { v: 1, n: "Big chart", g: rows };
    assert.strictEqual(Codec.validateAction(big), null);
    const code = await Codec.encodeAction(big);
    assert.deepStrictEqual(await Codec.decodeAction(code), big);
});

test("a payload past the cap is refused before it becomes a code", async () => {
    // 20 degrees at the 200-character text limit is 4177 bytes, past the cap.
    // Every field is individually legal, so only the whole-payload check
    // catches it - which is the point of having one.
    const rows = [];
    for (let i = 0; i < 19; i++) rows.push([i + 1, "y".repeat(200)]);
    rows.push([null, "z".repeat(200)]);
    const huge = { v: 1, n: "Huge", g: rows };
    assert.strictEqual(Codec.validateAction(huge), null, "each field is legal on its own");
    await assert.rejects(() => Codec.encodeAction(huge), (e) => {
        assert.strictEqual(e.name, "CodecError");
        assert.match(e.message, /too long/i);
        return true;
    });
});

// --- final-review additions ---------------------------------------------------

const zlib = require("zlib");

function b64url(buf) {
    return Buffer.from(buf).toString("base64url");
}

test("a zip bomb is refused while reading, not after", async () => {
    const bomb = "1" + b64url(zlib.deflateRawSync(Buffer.alloc(1000000)));
    await assert.rejects(() => Codec.decodeAction(bomb), (e) => {
        assert.strictEqual(e.name, "CodecError");
        assert.match(e.message, /more than a chart/i);
        return true;
    });
});

test("an odd-length body is refused as damaged, not thrown raw", async () => {
    await assert.rejects(() => Codec.decodeAction("1A"), (e) => {
        assert.strictEqual(e.name, "CodecError");
        return true;
    });
});

test("a list of 100 full actions fits under the list cap and round-trips", async () => {
    const actions = [];
    for (let i = 0; i < 100; i++) {
        const a = JSON.parse(JSON.stringify(FIXTURES.splitter.action));
        a.n = "Splitter " + i;
        actions.push(a);
    }
    const code = await Codec.encodeList(actions);
    assert.deepStrictEqual(await Codec.decodeList(code), actions);
});

test("a 3-cycle, 5-action screen fits under the screen cap and round-trips", async () => {
    const cycles = [];
    for (let c = 0; c < 3; c++) {
        const entries = [];
        for (let a = 0; a < 5; a++) {
            entries.push({ id: `c${c}a${a}`, action: FIXTURES.splitter.action });
        }
        cycles.push({ id: `c${c}`, name: `Cycle ${c + 1}`, actions: entries });
    }
    const s = { v: 1, id: "s1", name: "Night Watch", cycles, createdAt: 1, updatedAt: 1 };
    const code = await Codec.encodeScreen(s);
    assert.deepStrictEqual(await Codec.decodeScreen(code), s);
});

test("the action cap is still 4000 bytes and applies to actions only", async () => {
    assert.strictEqual(Codec.MAX_BYTES, 4000);
    assert.strictEqual(Codec.CAPS["1"], 4000);
    assert.ok(Codec.CAPS.L1 > 4000);
    assert.ok(Codec.CAPS.S1 > Codec.CAPS.L1);
});

test("decodeActionSync agrees with decodeAction on the pinned codes", async () => {
    for (const key of ["smash", "splitter"]) {
        assert.deepStrictEqual(Codec.decodeActionSync(FIXTURES[key].importCode),
            await Codec.decodeAction(FIXTURES[key].importCode));
        assert.deepStrictEqual(Codec.decodeActionSync(FIXTURES[key].rollCode),
            await Codec.decodeAction(FIXTURES[key].rollCode));
    }
});

test("decodeActionSync refuses the same things decodeAction does", async () => {
    const screenCode = await Codec.encodeScreen({
        v: 1, id: "x", name: "N",
        cycles: [{ id: "c", name: "Cycle 1", actions: [] }],
        createdAt: 1, updatedAt: 1,
    });
    assert.throws(() => Codec.decodeActionSync(screenCode), /DM Screen/i);
    assert.throws(() => Codec.decodeActionSync("1AAAA"), (e) => e.name === "CodecError");
    assert.throws(() => Codec.decodeActionSync(""), (e) => e.name === "CodecError");
    const bomb = "1" + b64url(zlib.deflateRawSync(Buffer.alloc(1000000)));
    assert.throws(() => Codec.decodeActionSync(bomb), /more than a chart/i);
});

test("isRollPayload tells a stripped action from an import code", () => {
    assert.strictEqual(Codec.isRollPayload(FIXTURES.smash.action), false);
    assert.strictEqual(Codec.isRollPayload(Codec.stripForRoll(FIXTURES.smash.action)), true);
    assert.strictEqual(Codec.isRollPayload(null), false);
});

test("control characters and newlines are refused where they would misalign output", () => {
    const a = () => JSON.parse(JSON.stringify(FIXTURES.smash.action));
    let x = a(); x.n = "Bad\u0000name";
    assert.match(Codec.validateAction(x), /control/i);
    x = a(); x.n = "Two\nlines";
    assert.match(Codec.validateAction(x), /one line/i);
    x = a(); x.g[0][1] = "Take\n40 damage";
    assert.match(Codec.validateAction(x), /one line/i);
    x = a(); x.d = "Line one.\nLine two.";
    assert.strictEqual(Codec.validateAction(x), null, "the description may hold a newline");
});

test("a missing version and a non-string label read plainly", () => {
    const a = JSON.parse(JSON.stringify(FIXTURES.splitter.action));
    delete a.v;
    assert.match(Codec.validateAction(a), /no version/i);
    const b = JSON.parse(JSON.stringify(FIXTURES.splitter.action));
    b.p = [[7, "20d20"]];
    assert.match(Codec.validateAction(b), /label must be text/i);
});

test("the name length is measured after trimming", () => {
    const a = JSON.parse(JSON.stringify(FIXTURES.splitter.action));
    a.n = "  " + "x".repeat(60) + "  ";
    assert.strictEqual(Codec.validateAction(a), null);
});

test("a screen with a polluting cycle key or a non-string id is refused", () => {
    const base = () => ({
        v: 1, id: "s1", name: "N",
        cycles: [{ id: "c1", name: "Cycle 1", actions: [{ id: "a1", action: FIXTURES.smash.action }] }],
        createdAt: 1, updatedAt: 1,
    });
    let s = base(); s.cycles[0].evil = 1;
    assert.match(Codec.validateScreen(s), /evil/);
    s = base(); s.cycles[0].actions[0].extra = 1;
    assert.match(Codec.validateScreen(s), /extra/);
    s = base(); s.id = 5;
    assert.match(Codec.validateScreen(s), /id/i);
    s = base(); s.createdAt = "x";
    assert.match(Codec.validateScreen(s), /timestamp/i);
});

test("an empty list code is refused on decode too", async () => {
    const code = await Codec.encodeUnchecked(Codec.LIST_PREFIX, []);
    await assert.rejects(() => Codec.decodeList(code), /empty/i);
});

test("the zlib fallback produces the pinned codes when CompressionStream is absent", async () => {
    const savedC = globalThis.CompressionStream;
    const savedD = globalThis.DecompressionStream;
    globalThis.CompressionStream = undefined;
    globalThis.DecompressionStream = undefined;
    try {
        for (const key of ["smash", "splitter"]) {
            assert.strictEqual(await Codec.encodeAction(FIXTURES[key].action), FIXTURES[key].importCode);
            assert.deepStrictEqual(await Codec.decodeAction(FIXTURES[key].importCode), FIXTURES[key].action);
        }
    } finally {
        globalThis.CompressionStream = savedC;
        globalThis.DecompressionStream = savedD;
    }
});
