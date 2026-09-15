// shared/components/custom-action-card.js
//
// One custom action, drawn as HTML. Pure: an action object in, a string out,
// no DOM and no document. Three places draw the same card — the DM Screen
// grid, its modal preview, and the build sheet's Custom tab — and the build
// sheet cannot load resource/dm-screen.js, whose bind() reaches for element
// ids that page does not have.
//
// Class names use a `ca-` prefix and are styled by css/custom-action-card.css,
// which both pages load. The page-specific shell around this body (.dm-card on
// one side, .card on the other) stays in each page's own stylesheet.
(function (root, factory) {
    const dep = (typeof module !== "undefined" && module.exports)
        ? require("../custom-action-codec")
        : root.CustomActionCodec;
    const api = factory(dep);
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.CustomActionCard = api;
})(this, function (Codec) {
    "use strict";

    const KIND_LABELS = {
        fortitude: "Fortitude",
        reflex: "Reflex",
        will: "Will",
        mastery: "Mastery Check",
        expertise: "Expertise Check",
    };

    const SAVE_ICONS = {
        fortitude: "https://terrarp.com/db/tool/fortitude.png",
        reflex: "https://terrarp.com/db/tool/reflex.png",
        will: "https://terrarp.com/db/tool/will.png",
    };

    // Everything drawn here came out of a pasted code, so every field is
    // hostile until escaped. Single quotes are escaped too: the build sheet
    // writes some attributes with single quotes.
    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function kindBadge(kind) {
        const icon = SAVE_ICONS[kind]
            ? '<img src="' + SAVE_ICONS[kind] + '" alt="">'
            : "";
        return '<span class="ca-kind-badge">' + icon +
            escapeHtml(KIND_LABELS[kind] || kind) + "</span>";
    }

    function diceRowsHtml(action) {
        const pre = action.p || [];
        let html = "";
        for (let i = 0; i < pre.length; i++) {
            const label = pre[i][0] ? escapeHtml(pre[i][0]) + ": " : "";
            html += '<div class="ca-card-dice">' + label + escapeHtml(pre[i][1]) + "</div>";
        }
        return html;
    }

    function chartHtml(action) {
        let html = '<ul class="ca-chart">';
        for (let i = 0; i < action.g.length; i++) {
            html += "<li><b>" + escapeHtml(Codec.rangeLabel(action.g, i)) + "</b><span>" +
                escapeHtml(action.g[i][1]) + "</span></li>";
        }
        return html + "</ul>";
    }

    function bodyHtml(action) {
        let html = '<div class="ca-card-title">' + escapeHtml(action.n) + "</div>";
        if (action.d) html += '<div class="ca-card-desc">' + escapeHtml(action.d) + "</div>";
        html += diceRowsHtml(action);
        if (action.k && action.k.length) {
            html += '<div class="ca-kind-badges">' + action.k.map(kindBadge).join("") + "</div>";
        }
        return html + chartHtml(action);
    }

    return {
        KIND_LABELS: KIND_LABELS,
        SAVE_ICONS: SAVE_ICONS,
        escapeHtml: escapeHtml,
        kindBadge: kindBadge,
        diceRowsHtml: diceRowsHtml,
        chartHtml: chartHtml,
        bodyHtml: bodyHtml,
    };
});
