// Plan Mode DOM controller.
//
// The seam between the live cards and the pure engine in shared/plan-queue.js.
// A card's configured state exists only in its DOM — clickMastery splices the
// rank letter into .masteryreplace, and the toggle handlers splice tags into
// .rollcode — so Add reads that DOM once and freezes it into a plain row.
//
// Snapshot, not live link: it is what lets the same action be queued twice with
// different masteries. Reconfiguring a card afterwards does not touch rows
// already added; delete and re-add instead.
const PlanMode = (function () {
    const rows = [];

    // The three cards in #saveschecks have no actions.js entry, so they carry
    // the reserved pseudo-lookups from action-families.js.
    const CHECK_CARD_LOOKUPS = {
        Saves: "@save",
        "Expertise Check": "@expertise-check",
        "Mastery Check": "@mastery-check",
    };

    function textOf(element, selector) {
        const found = element.querySelector(selector);
        return found ? (found.textContent || "").trim() : "";
    }

    // Which action this card is. Action cards carry data-action-id; the
    // save/check cards are identified by their title.
    function lookupForCard(card) {
        const id = card.getAttribute("data-action-id");
        if (id) return id;
        const title = textOf(card, ".cardtitle");
        return CHECK_CARD_LOOKUPS[title] || null;
    }

    // The rank letter as rendered, which is already reduced when the mastery is
    // downcast — so downcasting needs no separate handling anywhere.
    function rankLetterOf(card) {
        const span = card.querySelector(".rollcode .masteryreplace");
        const text = span ? (span.textContent || "").trim().toUpperCase() : "";
        return /^[EDCBAS]$/.test(text) ? text : "";
    }

    // clickMastery routes through addGlowEffect, which stamps "active-glow" on
    // the clicked circle and strips it from its siblings — so exactly one is
    // lit per card, including on the save and check cards.
    function selectedMastery(card) {
        const icon = card.querySelector(".masterycircle.active-glow");
        return icon ? icon.getAttribute("data-mastery") : null;
    }

    // Which toggles are lit. The engine matches these against requiresTag, which
    // is the configured suffix — and a toggle's visible label can differ from it
    // (the Heal/Buff "Multi" button carries suffix "AoE"). Static buttons in
    // build-sheet.html carry no data-suffix, so their label is the fallback.
    function activeTags(card) {
        const tags = [];
        const buttons = card.querySelectorAll(".risky-toggle.active");
        for (let i = 0; i < buttons.length; i++) {
            const suffix = buttons[i].getAttribute("data-suffix");
            const text = (suffix || buttons[i].textContent || "").trim();
            if (text) tags.push(text);
        }
        return tags;
    }

    function snapshotCard(card) {
        const lookup = lookupForCard(card);
        if (!lookup) return null;

        const rollCode = card.querySelector(".rollcode");
        const masteryId = selectedMastery(card);
        const mastery = masteryId && window.masteries
            ? window.masteries.find(function (m) { return m.lookup === masteryId; })
            : null;

        return window.PlanQueue.makeRow({
            lookup: lookup,
            name: textOf(card, ".cardtitle") || lookup,
            masteryId: masteryId,
            masteryName: mastery ? mastery.name : "",
            rankLetter: rankLetterOf(card),
            tags: activeTags(card),
            rollHtml: rollCode ? rollCode.innerHTML : "",
            dice: textOf(card, ".cardroll"),
        });
    }

    function add(card) {
        const row = snapshotCard(card);
        if (!row) return null;
        rows.push(row);
        refresh();
        return row;
    }

    function remove(uid) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].uid === uid) {
                rows.splice(i, 1);
                break;
            }
        }
        refresh();
    }

    function move(uid, toIndex) {
        let from = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].uid === uid) { from = i; break; }
        }
        if (from === -1) return;
        const [row] = rows.splice(from, 1);
        rows.splice(Math.max(0, Math.min(toIndex, rows.length)), 0, row);
        refresh();
    }

    function clear() {
        rows.length = 0;
        refresh();
    }

    function rowByUid(uid) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].uid === uid) return rows[i];
        }
        return null;
    }

    // Task 9 replaces this with the real renderer.
    function refresh() {
        window.PlanQueue.resolveQueue(rows);
    }

    // Adds an Add button to every card that can be queued, once.
    function installAddButtons() {
        const containers = ["actionsdisplay", "freeactiondisplay", "saveschecks"];
        for (let c = 0; c < containers.length; c++) {
            const container = document.getElementById(containers[c]);
            if (!container) continue;
            const cards = container.querySelectorAll(".card");
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                if (card.querySelector(".plan-add")) continue;
                if (!lookupForCard(card)) continue;
                const button = document.createElement("div");
                button.className = "plan-add";
                button.textContent = "+ Add";
                button.addEventListener("click", function () {
                    add(card);
                    // A moment of feedback, since the card itself does not change.
                    button.classList.add("just-added");
                    setTimeout(function () { button.classList.remove("just-added"); }, 350);
                });
                card.appendChild(button);
            }
        }
    }

    return {
        rows: rows,
        add: add,
        remove: remove,
        move: move,
        clear: clear,
        rowByUid: rowByUid,
        refresh: refresh,
        snapshotCard: snapshotCard,
        installAddButtons: installAddButtons,
    };
})();

window.PlanMode = PlanMode;
