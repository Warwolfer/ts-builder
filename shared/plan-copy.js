// shared/plan-copy.js
//
// The Plan Mode queue's roll codes, cut into pastes Discord will accept.
//
// Discord refuses a message over 2000 characters. A normal roll code is 60 to
// 80 characters and a custom action is around 300 — its base64url payload alone
// is about 200 — so one cycle can need more than one paste.
//
// Pure: it measures lengths and joins strings, and never looks inside a code.
// That is also why the rule about stripping a custom code's payload before
// parsing does not bite here: nothing here parses anything.
(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.PlanCopy = api;
})(this, function () {
    "use strict";

    const MAX_CHARS = 2000;

    /**
     * The codes as pasteable blocks, in order.
     *
     * Greedy: a block takes codes until the next one would push it past the
     * limit. A code longer than the limit on its own gets a block to itself,
     * because it cannot be split — no real code is anywhere near 2000, so that
     * branch is a floor under the arithmetic rather than a case that happens.
     *
     * @param {string[]} codes
     * @param {number} [maxChars]  Defaults to MAX_CHARS
     * @returns {string[]} blocks joined with "\n", never with a trailing one
     */
    function chunkRollCodes(codes, maxChars) {
        const limit = maxChars > 0 ? maxChars : MAX_CHARS;
        const list = Array.isArray(codes) ? codes : [];
        const blocks = [];
        let current = "";

        for (let i = 0; i < list.length; i++) {
            const code = String(list[i] == null ? "" : list[i]).trim();
            if (!code) continue;

            if (!current) {
                current = code;
                continue;
            }
            // The + 1 is the newline that would join them.
            if (current.length + 1 + code.length <= limit) {
                current += "\n" + code;
            } else {
                blocks.push(current);
                current = code;
            }
        }
        if (current) blocks.push(current);

        return blocks;
    }

    return {
        MAX_CHARS: MAX_CHARS,
        chunkRollCodes: chunkRollCodes,
    };
});
