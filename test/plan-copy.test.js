"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

global.window = global.window || {};
const PlanCopy = require(path.join(__dirname, "..", "shared", "plan-copy.js"));

test("empty input gives no blocks", () => {
    assert.deepStrictEqual(PlanCopy.chunkRollCodes([]), []);
    assert.deepStrictEqual(PlanCopy.chunkRollCodes(null), []);
    assert.deepStrictEqual(PlanCopy.chunkRollCodes(undefined), []);
});

test("one code is one block", () => {
    assert.deepStrictEqual(PlanCopy.chunkRollCodes(["?r rush"]), ["?r rush"]);
});

test("codes that fit together join with a newline", () => {
    assert.deepStrictEqual(
        PlanCopy.chunkRollCodes(["?r attack a s", "?r heal b 5"]),
        ["?r attack a s\n?r heal b 5"]
    );
});

test("a block may reach the limit exactly", () => {
    // 5 + 1 newline + 4 === 10
    assert.deepStrictEqual(
        PlanCopy.chunkRollCodes(["12345", "6789"], 10),
        ["12345\n6789"]
    );
});

test("one character past the limit starts a second block", () => {
    // 5 + 1 newline + 5 === 11, which is over 10
    assert.deepStrictEqual(
        PlanCopy.chunkRollCodes(["12345", "67890"], 10),
        ["12345", "67890"]
    );
});

test("a long run splits into as many blocks as it needs", () => {
    const codes = ["aaaa", "bbbb", "cccc", "dddd", "eeee"];
    // 4 + 1 + 4 === 9 fits in 10; adding a third would be 14.
    assert.deepStrictEqual(PlanCopy.chunkRollCodes(codes, 10), [
        "aaaa\nbbbb",
        "cccc\ndddd",
        "eeee"
    ]);
});

test("a single code longer than the limit gets a block to itself", () => {
    const big = "x".repeat(25);
    assert.deepStrictEqual(PlanCopy.chunkRollCodes(["ab", big, "cd"], 10), [
        "ab",
        big,
        "cd"
    ]);
});

test("blank and whitespace-only codes are dropped", () => {
    assert.deepStrictEqual(
        PlanCopy.chunkRollCodes(["?r rush", "", "   ", "?r heal b 5"]),
        ["?r rush\n?r heal b 5"]
    );
});

test("codes are trimmed, and no block ends in a newline", () => {
    const blocks = PlanCopy.chunkRollCodes(["  ?r rush  ", " ?r heal b 5 "]);
    assert.deepStrictEqual(blocks, ["?r rush\n?r heal b 5"]);
    assert.ok(!blocks[0].endsWith("\n"));
});

test("the default limit is Discord's 2000 characters", () => {
    assert.strictEqual(PlanCopy.MAX_CHARS, 2000);
    const code = "x".repeat(700);
    // 700 + 1 + 700 === 1401 fits; a third would be 2102.
    assert.deepStrictEqual(PlanCopy.chunkRollCodes([code, code, code]), [
        code + "\n" + code,
        code
    ]);
});
