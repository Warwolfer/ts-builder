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
    //
    // Returns null for the Saves and Expertise Check cards, and that is correct
    // rather than a gap: their lit icons are save types and expertise, not
    // masteries, so they carry no data-mastery to read. Only the Mastery Check
    // card does. A buff entry that sets requiresMasteryMatch against the `save`
    // or `expertiseCheck` family would therefore always block — if one is ever
    // added, give it its own condition instead of reusing the mastery match.
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

    function escape(text) {
        return window.DOMUtils.escapeHtml(String(text == null ? "" : text));
    }

    // The roll code as it should be pasted: the snapshot with this row's
    // computed total spliced into its own planmod span. setRollPlanMod leaves
    // the Lethal passive and any Risky modifier alone.
    function rollHtmlFor(resolved) {
        if (!resolved.rollHtml) return "";
        return window.RollCodeUtils.setRollPlanMod(resolved.rollHtml, resolved.total);
    }

    function chipHtml(chip) {
        const sign = chip.value >= 0 ? "+" : "";
        let text = chip.label + " " + sign + chip.value;
        let title = "Click to ignore this buff on this row";

        if (chip.state === "applied" && typeof chip.remaining === "number") {
            text += " ·" + chip.remaining + " left";
        } else if (chip.state === "blocked") {
            text += " · " + chip.reason;
            title = "Not applied: " + chip.reason;
        } else if (chip.state === "superseded") {
            title = "A higher source of the same buff applies instead";
        } else if (chip.state === "dismissed") {
            title = "Click to apply this buff again";
        }

        return '<span class="plan-chip ' + chip.state + '" data-source="' +
            escape(chip.source) + '" title="' + escape(title) + '">' +
            escape(text) + "</span>";
    }

    function rowHtml(resolved, index) {
        const entry = window.PlanBuffs.table[resolved.lookup];
        const mastery = resolved.masteryName
            ? " (" + resolved.masteryName +
              (resolved.rankLetter ? " " + resolved.rankLetter : "") + ")"
            : "";
        const tags = resolved.tags.length ? " · " + resolved.tags.join(" · ") : "";
        const totalText = resolved.total
            ? (resolved.total > 0 ? "+" : "") + resolved.total
            : "—";

        const roll = rollHtmlFor(resolved);

        let html = '<div class="plan-row" data-uid="' + escape(resolved.uid) + '" draggable="true">';
        html += '<div class="plan-row-main">';
        html += '<span class="plan-row-index" title="Drag to reorder">' + (index + 1) + "</span>";
        html += '<span class="plan-row-name">' + escape(resolved.name + tags) +
                '<span class="plan-row-mastery">' + escape(mastery) + "</span></span>";
        html += '<span class="plan-row-total' + (resolved.total ? "" : " zero") + '">' +
                escape(totalText) + "</span>";
        html += roll
            ? '<div class="rollcode clickable-rollcode" onclick="copyRollCode(this)" ' +
              'title="Click to copy">' + roll + "</div>"
            : '<div class="plan-row-noroll">—</div>';
        html += '<span class="plan-manual">+<input type="number" data-manual="' +
                escape(resolved.uid) + '" value="' + escape(resolved.manualMod) +
                '" title="Extra modifier from anyone else"></span>';
        html += '<span class="plan-row-remove" data-remove="' + escape(resolved.uid) +
                '" title="Remove from queue">×</span>';
        html += "</div>";

        const showSelf = !!(entry && entry.selfToggle);
        if (resolved.chips.length || showSelf) {
            html += '<div class="plan-row-meta">';
            for (let i = 0; i < resolved.chips.length; i++) {
                html += chipHtml(resolved.chips[i]);
            }
            if (showSelf) {
                html += '<label class="plan-self"><input type="checkbox" data-self="' +
                        escape(resolved.uid) + '"' + (resolved.targetSelf ? " checked" : "") +
                        "> Self</label>";
            }
            html += "</div>";
        }
        html += "</div>";

        return html;
    }

    function refresh() {
        const rail = document.getElementById("plan-rail");
        if (!rail) return;

        const resolved = window.PlanQueue.resolveQueue(rows);

        const count = resolved.length;
        let html = '<div class="plan-rail-head">Queue';
        html += count ? " · " + count + (count === 1 ? " action" : " actions") : "";
        // One queue is one turn. Clearing it IS starting the next one, so the
        // control says so rather than leaving "Turn" to imply a switcher.
        html += '<span class="plan-rail-clear" data-clear="1" ' +
                'title="Clear the queue and start the next turn">New turn</span></div>';

        if (!count) {
            html += '<div class="plan-empty">Nothing queued yet. Set up a card, ' +
                    'then press + in its corner.</div>';
        } else {
            html += '<div class="plan-head-row"><span>#</span><span>Action</span>' +
                    '<span>Mod</span><span>Roll code</span><span>+X</span>' +
                    '<span></span></div>';
            for (let i = 0; i < resolved.length; i++) {
                html += rowHtml(resolved[i], i);
            }
        }

        rail.innerHTML = html;
        if (window.PlanMode && window.PlanMode.persist) window.PlanMode.persist();
    }

    // One delegated listener set on the rail, so re-rendering never leaves
    // stale handlers behind.
    let railBound = false;

    function bindRail() {
        if (railBound) return;
        const rail = document.getElementById("plan-rail");
        if (!rail) return;
        railBound = true;

        rail.addEventListener("click", function (event) {
            const target = event.target;

            if (target.getAttribute("data-clear")) {
                clear();
                return;
            }

            const removeUid = target.getAttribute("data-remove");
            if (removeUid) {
                remove(removeUid);
                return;
            }

            // Chips toggle themselves off and back on for the row they sit in.
            // Only applied and dismissed chips toggle. A blocked chip has an
            // unmet condition to fix, not a choice to make; a superseded one is
            // reported from its own flag before dismissal is ever consulted, so
            // clicking it would record a dismissal that does nothing now and
            // silently removes the buff later, once it stops being superseded.
            if (target.classList.contains("plan-chip") &&
                !target.classList.contains("blocked") &&
                !target.classList.contains("superseded")) {
                const rowEl = target.closest(".plan-row");
                const row = rowEl ? rowByUid(rowEl.getAttribute("data-uid")) : null;
                const source = target.getAttribute("data-source");
                if (row && source) {
                    const at = row.dismissed.indexOf(source);
                    if (at === -1) row.dismissed.push(source);
                    else row.dismissed.splice(at, 1);
                    refresh();
                }
            }
        });

        rail.addEventListener("change", function (event) {
            const selfUid = event.target.getAttribute("data-self");
            if (selfUid) {
                const row = rowByUid(selfUid);
                if (row) {
                    row.targetSelf = event.target.checked;
                    refresh();
                    // The checkbox the user just toggled was destroyed by the
                    // re-render; put focus back on its replacement so keyboard
                    // navigation through the rail survives.
                    const again = document.querySelector('[data-self="' + selfUid + '"]');
                    if (again) again.focus();
                }
            }
        });

        // Re-resolve as you type, so the total and every downstream roll code
        // update live.
        rail.addEventListener("input", function (event) {
            const manualUid = event.target.getAttribute("data-manual");
            if (!manualUid) return;
            const row = rowByUid(manualUid);
            if (!row) return;
            row.manualMod = event.target.value;

            // Keep focus and caret: a full re-render would steal both.
            const caret = event.target.selectionStart;
            refresh();
            const again = document.querySelector('[data-manual="' + manualUid + '"]');
            if (again) {
                again.focus();
                try { again.setSelectionRange(caret, caret); } catch (e) { /* number inputs */ }
            }
        });
    }

    // Adds an Add button to every card that can be queued, once.
    function installAddButtons() {
        bindRail();
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
                button.textContent = "+";
                button.title = "Add to queue";
                button.addEventListener("click", function () {
                    add(card);
                    // A moment of feedback, since the card itself does not change.
                    button.classList.add("just-added");
                    setTimeout(function () { button.classList.remove("just-added"); }, 350);
                });
                card.appendChild(button);
            }
        }

        // Render once on load. Without this the rail is an empty box whenever
        // Plan was already on from a previous session: applyPlanPreference
        // unhides it but never draws it, and togglePlan only fires on a click
        // the user never makes because the preference restored it for them.
        refresh();
    }

    return {
        // A copy: mutating the queue must go through add/remove/move/clear, each
        // of which re-resolves and re-renders. Handing out the live array invites
        // a splice that leaves the rail showing stale totals.
        getRows: function () { return rows.slice(); },
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
