// Pure string helpers for editing a rendered `.rollcode`. No DOM access, so
// they stay unit-testable and can be shared by every toggle that has to splice
// something into a roll code.
//
// A rendered roll code has two halves separated by the '#' that opens the
// Discord comment:
//
//   ?r reckless MR B +10 # Mastery · Break-Type · Lune · Lethal · NG1 · 2768
//   \________ dice + modifiers _______/ \____________ comment tags __________/
//
// Modifiers are spliced in before the '#'; comment tags go before the thread
// code span, the same place the Lethal/NG1/armor suffixes are rendered.
const RollCodeUtils = (function () {
    const THRCODE = /(<span class=['"]thrcode['"]>)/;
    const EXTRA_MOD = /<span class=['"]extramod['"]>[^<]*<\/span>/;

    function escapeRe(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function hasRollTag(html, tag) {
        return new RegExp(`(?:^|·\\s*)${escapeRe(tag)}(?:\\s*·|$)`).test(html);
    }

    function insertRollTag(html, tag) {
        if (!tag || hasRollTag(html, tag)) return html;
        if (THRCODE.test(html)) return html.replace(THRCODE, `${tag} · $1`);
        return `${html} · ${tag}`;
    }

    function removeRollTag(html, tag) {
        if (!tag) return html;
        const beforeCode = new RegExp(`${escapeRe(tag)} · `);
        if (beforeCode.test(html)) return html.replace(beforeCode, "");
        return html.replace(new RegExp(` · ${escapeRe(tag)}`), "");
    }

    // Sets (or clears) the extra modifier the Risky free action buys with the
    // bonuses it spends. It lives in its own span so it sits alongside the
    // Lethal/Combat Focus passive modifier instead of overwriting it.
    function setRollExtraMod(html, mod) {
        const cleared = html.replace(EXTRA_MOD, "");
        const text = String(mod == null ? "" : mod).trim();
        if (!text) return cleared;

        // Free text typed by the user, so it is escaped before reaching innerHTML.
        const signed = window.DOMUtils.escapeHtml(
            /^[+-]/.test(text) ? text : `+${text}`,
        );
        if (cleared.includes("#")) {
            return cleared.replace("#", `<span class="extramod">${signed} </span>#`);
        }
        return `${cleared}<span class="extramod"> ${signed}</span>`;
    }

    return {
        insertRollTag,
        removeRollTag,
        setRollExtraMod,
    };
})();

window.RollCodeUtils = RollCodeUtils;
