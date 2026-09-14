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

    // Called after any click in the card grids, because clicking a mastery is
    // what unblocks the button and nothing else tells us it happened.
    function syncAddButtons() {
        const buttons = document.querySelectorAll(".plan-add");
        for (let i = 0; i < buttons.length; i++) {
            const card = buttons[i].closest(".card");
            if (!card) continue;
            const reason = window.CardGate.addBlockedReason(card);
            buttons[i].classList.toggle("disabled", !!reason);
            buttons[i].title = reason || "Add to queue";
        }
    }

    // Whatever icon is lit, whether or not it is a mastery. The Saves card
    // lights a save type and the Expertise Check card an expertise; neither
    // carries data-mastery, so the icon's own image is the only thing that
    // identifies all three uniformly.
    function selectedTypeIcon(card) {
        const icon = card.querySelector(".masterycircle.active-glow");
        if (!icon) return { image: "", label: "" };
        const img = icon.querySelector("img");

        // The roll code already names what was picked — clickSave writes into
        // .savereplace, clickExpertise into .expertisereplace, clickMastery
        // into .mnamereplace. That is the authoritative label, and the only one
        // the Saves card has at all: its icons carry no alt and no
        // data-mastery, so reading the image would give an empty name.
        const named = card.querySelector(
            ".rollcode .savereplace, .rollcode .expertisereplace, .rollcode .mnamereplace",
        );
        const name = named ? (named.textContent || "").trim() : "";
        const placeholder = /^(type|mastery|break-type)$/i.test(name);

        return {
            image: img ? img.getAttribute("src") || "" : "",
            label: (!placeholder && name) ||
                   (img && (img.getAttribute("alt") || "")) ||
                   (icon.getAttribute("data-mastery") || ""),
        };
    }

    function snapshotCard(card) {
        const lookup = lookupForCard(card);
        if (!lookup) return null;

        const rollCode = card.querySelector(".rollcode");
        const masteryId = selectedMastery(card);
        const typeIcon = selectedTypeIcon(card);
        const mastery = masteryId && window.masteries
            ? window.masteries.find(function (m) { return m.lookup === masteryId; })
            : null;

        return window.PlanQueue.makeRow({
            lookup: lookup,
            name: textOf(card, ".cardtitle") || lookup,
            masteryId: masteryId,
            masteryName: mastery ? mastery.name : "",
            masteryImage: mastery ? mastery.image : typeIcon.image,
            typeLabel: mastery ? mastery.name : typeIcon.label,
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
    //
    // The thread code is re-stamped from the live field on every call, unlike
    // everything else here, which stays frozen from snapshot time. It is a
    // page-level field, not something the card owns, so a row queued before
    // the player fills it in (or before they fix a typo) must not keep
    // rendering the stale value once it is corrected. See setThreadCode.
    function rollHtmlFor(resolved) {
        if (!resolved.rollHtml) return "";
        const withMod = window.RollCodeUtils.setRollPlanMod(resolved.rollHtml, resolved.total);
        const threadInput = document.getElementById("threadcodereplace");
        const liveCode = threadInput ? threadInput.value : "";
        return window.RollCodeUtils.setThreadCode(withMod, liveCode);
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

        // Keyed on the producing row's uid, not its lookup: two rows of the
        // same producer (two Mark casts) must be independently dismissible,
        // and a lookup alone cannot tell their chips apart. See chip() in
        // shared/plan-queue.js.
        return '<span class="plan-chip ' + chip.state + '" data-chip-uid="' +
            escape(chip.uid) + '" title="' + escape(title) + '">' +
            escape(text) + "</span>";
    }

    // The mastery as an icon plus its rank, rather than "(Astramancy B)" inside
    // the action name — the icon is recognisable at a glance and the name column
    // stops being two things at once.
    function masteryCellHtml(resolved) {
        // Look the image up live when this is a mastery, rather than trusting
        // the snapshot: a queue persisted before masteryImage existed restores
        // without one. For a save or expertise icon there is nothing to look
        // up, so the captured image is the source.
        const mastery = resolved.masteryId && window.masteries
            ? window.masteries.find(function (m) { return m.lookup === resolved.masteryId; })
            : null;
        const src = (mastery && mastery.image) || resolved.masteryImage || "";
        if (!src && !resolved.rankLetter) return '<span class="plan-row-mastery"></span>';

        const name = (mastery && mastery.name) || resolved.typeLabel ||
            resolved.masteryName || "";
        const label = name + (resolved.rankLetter ? " " + resolved.rankLetter : "");

        return '<span class="plan-row-mastery" title="' + escape(label) + '">' +
            (src ? '<img class="plan-row-masteryicon" src="' + escape(src) + '" alt="">' : "") +
            (resolved.rankLetter
                ? '<b class="plan-row-rank">' + escape(resolved.rankLetter) + "</b>"
                : "") +
            "</span>";
    }

    // The projection is named for what it actually produces, so a heal does not
    // read "Damage". The families already encode this - heal and buff are their
    // own, and everything else that rolls a projectable result deals damage.
    function resultLabel(lookup, tags) {
        const families = window.ActionFamilies
            ? window.ActionFamilies.familiesOf(lookup)
            : [];
        // A save or check produces a number to compare against a DC, not damage.
        if (families.indexOf("save") !== -1 ||
            families.indexOf("masteryCheck") !== -1 ||
            families.indexOf("expertiseCheck") !== -1) {
            return "Result";
        }

        const isHeal = families.indexOf("heal") !== -1;
        const isBuff = families.indexOf("buff") !== -1;
        if (!isHeal && !isBuff) return "Damage";

        // Name the spread as well: the figure is per target once one of these is
        // active, and a divided heal labelled plainly "Heal" reads like the
        // whole pool. The card calls the AoE toggle "Multi"; the suffix is what
        // the engine and the roll code carry, so that is what we match.
        const list = tags || [];
        let prefix = "";
        if (list.indexOf("AoE") !== -1) prefix = "AoE ";
        else if (list.indexOf("Simulcast") !== -1) prefix = "Simulcast ";
        else if (list.indexOf("Versatile") !== -1) prefix = "Versatile ";

        return prefix + (isHeal ? "Heal" : "Buff");
    }

    // What the roll will land between, and what a crit turns it into. Both are
    // derived from the rendered roll code, so they account for every modifier
    // already spliced into it. An action with no projectable roll shows a dash.
    function resultCellsHtml(resolved) {
        const roll = rollHtmlFor(resolved);
        const text = roll ? roll.replace(/<[^>]*>/g, "") : "";
        const res = window.PlanResult
            ? window.PlanResult.forRow(resolved.lookup, text, resolved.tags)
            : null;
        const range = res ? window.PlanResult.formatRange(res) : "";
        const crit = res ? window.PlanResult.formatCrit(res) : "";
        const note = res && res.divisor > 1 ? " (per target)" : "";
        // Risky Mode spends the modifiers rather than adding them, which is why
        // the range moves so far when it is lit. Say so, or the numbers look
        // like a bug.
        const riskyNote = res && res.risky
            ? (res.risky.dice
                ? " · Risky converts " + res.risky.converted + " into " +
                  res.risky.dice + "d100, +" + res.risky.remainder + " left"
                : " · Risky converts nothing (40 needed per d100)")
            : "";
        const label = resultLabel(resolved.lookup, resolved.tags);
        // The colour keys off what it produces, not the spread prefix.
        const kind = /Heal$/.test(label) ? "heal"
            : /Buff$/.test(label) ? "buff"
            : label === "Result" ? "check"
            : "damage";

        // With no crit to sit beside it — heals and buffs never crit — the
        // result takes the crit column's space too, so it lands flush right
        // instead of stranded mid-row with a gap after it.
        const wide = crit ? "" : " is-wide";

        const critPct = res ? window.PlanResult.formatCritChance(res.critChance) : "";
        const critPctHtml = critPct
            ? '<span class="plan-row-critpct" title="' +
              escape("Chance this roll crits at all. " + label + " above is what a crit pays.") +
              '"><i>Crit %</i><b>' + escape(critPct) + "</b></span>"
            : "";

        let out = '<span class="plan-row-result is-' + kind + wide + '"' +
            (range ? ' title="Projected ' + escape(label.toLowerCase()) +
                     " range" + escape(note) + escape(riskyNote) + '"' : "") +
            ">" + (range
                ? "<i>" + escape(label) + "</i><b>" + escape(range) + "</b>"
                : "") +
            "</span>";
        if (crit) {
            // The inline figure is the crit you actually hit. The rarer tiers -
            // a natural 100, double 100s - are reported here rather than
            // stretched into the headline, where they made every crit look
            // inflated. A dotted underline marks that there is more to read.
            const tiers = res.critTiers || [];
            // Escape each line, then join with the newline entity — escaping
            // the joined string would turn the entity's "&" into "&amp;" and
            // the tooltip would read a literal "&#10;" between the tiers.
            const lines = [label + " on a critical hit"];
            for (let i = 0; i < tiers.length; i++) lines.push(tiers[i]);
            const title = lines.map(escape).join("&#10;");
            return critPctHtml + out + '<span class="plan-row-crit' +
                (tiers.length ? " has-tiers" : "") + '" title="' + title +
                '"><i>Crit Damage</i><b>' + escape(crit) + "</b></span>";
        }
        return critPctHtml + out;
    }

    function rowHtml(resolved, index) {
        const entry = window.PlanBuffs.table[resolved.lookup];
        const tags = resolved.tags.length ? " · " + resolved.tags.join(" · ") : "";
        const totalText = resolved.total
            ? (resolved.total > 0 ? "+" : "") + resolved.total
            : "—";

        const roll = rollHtmlFor(resolved);

        let html = '<div class="plan-row" data-uid="' + escape(resolved.uid) + '">';
        html += '<div class="plan-row-main">';
        html += '<span class="plan-row-index" draggable="true" ' +
                'title="Drag to reorder"><i class="plan-grip"></i>' +
                (index + 1) + "</span>";
        html += '<span class="plan-row-name">' + escape(resolved.name + tags) + "</span>";
        html += masteryCellHtml(resolved);
        html += '<span class="plan-row-total' + (resolved.total ? "" : " zero") + '">' +
                escape(totalText) + "</span>";
        html += roll
            ? '<div class="rollcode clickable-rollcode" onclick="copyRollCode(this)" ' +
              'title="Click to copy">' + roll + "</div>"
            : '<div class="plan-row-noroll">—</div>';
        html += '<span class="plan-manual">+<input type="text" inputmode="numeric" ' +
                'autocomplete="off" spellcheck="false" data-manual="' +
                escape(resolved.uid) + '" value="' +
                escape(window.PlanQueue.isBlankMod(resolved.manualMod) ? "" : resolved.manualMod) +
                '" placeholder="0" title="Extra modifier from anyone else"></span>';
        html += '<span class="plan-row-remove" data-remove="' + escape(resolved.uid) +
                '" title="Remove from queue">×</span>';
        html += "</div>";

        // The second line is always present: it carries Result and Crit, so the
        // space a chip-less row used to waste is now the projection.
        const showSelf = !!(entry && entry.selfToggle);
        html += '<div class="plan-row-meta">';
        html += '<span class="plan-row-chips">';
        for (let i = 0; i < resolved.chips.length; i++) {
            html += chipHtml(resolved.chips[i]);
        }
        if (showSelf) {
            html += '<label class="plan-self"><input type="checkbox" data-self="' +
                    escape(resolved.uid) + '"' + (resolved.targetSelf ? " checked" : "") +
                    "> Self</label>";
        }
        html += "</span>";
        html += resultCellsHtml(resolved);
        html += "</div>";
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
        // One queue is one turn, so clearing it is how you start the next.
        // Named for what it does rather than what it means.
        html += '<span class="plan-rail-clear" data-clear="1" ' +
                'title="Remove every action from the queue">Clear Queue</span></div>';

        if (!count) {
            html += '<div class="plan-empty">Nothing queued yet. Set up a card, ' +
                    'then press + in its corner.</div>';
        } else {
            html += '<div class="plan-head-row"><span>#</span><span>Action</span>' +
                    '<span>Type</span><span>Mod</span><span>Roll code</span>' +
                    '<span>Extra Mods</span><span></span></div>';
            for (let i = 0; i < resolved.length; i++) {
                html += rowHtml(resolved[i], i);
            }
        }

        rail.innerHTML = html;
        if (window.PlanMode && window.PlanMode.persist) window.PlanMode.persist();
    }

    const STORAGE_KEY = "tsbuilder_plan_queue";

    // The queue is turn-scoped scratch: it never enters the build code, the
    // URL or saved builds, because nobody wants to share it and it would
    // bloat every code. It does survive a reload, keyed to the build it was
    // planned against - restoring a queue of roll codes belonging to a
    // different character would be worse than losing it.
    function fingerprint() {
        const state = window.buildState ? window.buildState.getState() : {};

        // chosenMasteriesRanks is positional against chosenMasteries — the
        // rank at index i belongs to the mastery at index i. Sorting one
        // without the other would repair the shape but scramble which rank
        // goes with which mastery, so two different builds (same masteries,
        // ranks swapped) could hash identically. Pair them up first, sort the
        // pairs together by mastery id, then split back out: this keeps the
        // fingerprint order-insensitive to selection order while ranks always
        // travel with the mastery they belong to.
        const masteries = state.chosenMasteries || [];
        const ranks = state.chosenMasteriesRanks || [];
        const pairs = masteries
            .map((id, i) => [id, ranks[i]])
            .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

        return JSON.stringify([
            state.characterName || "",
            (state.chosenActions || []).slice().sort(),
            pairs,
            state.weaponRank || 0,
            state.armorRank || 0,
            state.accessoryRank || 0,
        ]);
    }

    function persistNow() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                fingerprint: fingerprint(),
                rows: rows,
            }));
        } catch (e) {
            // Private mode or a full quota: the queue simply will not survive
            // a reload, which is not worth interrupting planning over.
        }
    }

    // refresh() calls this on every mutation, including once per keystroke in
    // the manual-modifier field - a short debounce keeps that from hitting
    // localStorage on every keystroke. But add/remove/move/clear go through
    // this same debounce, and a navigation does not wait for a timer: without
    // flushPersist below, clicking + and reloading inside this window would
    // lose that row - the exact case persistence exists to prevent. This is
    // NOT the same trade-off as the private-mode/quota failures above, where
    // persistence genuinely cannot happen; this window is self-inflicted, so
    // it is closed by flushPersist rather than accepted.
    let persistTimer = null;
    function persist() {
        if (persistTimer) clearTimeout(persistTimer);
        // Null out persistTimer as the FIRST thing the timer does, not after
        // persistNow() returns: flushPersist below uses "persistTimer is
        // non-null" to mean "a write is still owed", and a plain
        // `setTimeout(persistNow, 250)` would leave it holding a stale,
        // already-fired id forever - making that check true permanently
        // after the first ever persist() call, and a later pagehide with no
        // new mutations would then re-persist whatever `rows` happens to
        // hold, silently overwriting anything changed in storage since.
        persistTimer = setTimeout(function () {
            persistTimer = null;
            persistNow();
        }, 250);
    }

    // A pending debounce must not outlive the page. Without this, clicking
    // Add and reloading inside the window loses the row. pagehide fires on
    // reload, back/forward and tab close, including the bfcache path where
    // unload does not - and unlike beforeunload it is not unreliable on
    // mobile and does not suppress bfcache, so there is no second listener
    // needed alongside it.
    function flushPersist() {
        if (!persistTimer) return;
        clearTimeout(persistTimer);
        persistTimer = null;
        persistNow();
    }

    // rollHtml is markup, so it cannot be escaped on the way out - it reaches
    // innerHTML intact by design (see rowHtml/rollHtmlFor). A live row gets it
    // from the app's own rendered card; a stored row comes from localStorage,
    // which anyone can edit in DevTools. Keep only what still looks like a
    // roll code and let the rest render without one - rowHtml already handles
    // a missing roll code with the em-dash placeholder.
    function safeRollHtml(html) {
        if (typeof html !== "string" || html.length > 2000) return "";
        // A roll code is spans and text, nothing else - an allowlist ends the
        // arms race with tag and scheme denylists (a tag denylist alone misses
        // scheme-based vectors like <a href="javascript:...">).
        //
        // Both checks below have to treat "/" as an attribute separator, not
        // just whitespace: an HTML tokenizer leaves the tag-name state on "/"
        // exactly as it does on a space, so `<span/onclick=...>` parses as a
        // span carrying a live handler - the `<img/onerror=...>` trick aimed
        // at the one tag this allows. `(?!span\b)` treated "/" as a word
        // boundary just like a space, so `<span/onclick=...>` was wrongly
        // classified as an allowed span and exempted from the tag check
        // entirely; `\son` required literal whitespace before `on...=`, and
        // "/" is not whitespace, so the attribute check missed it too.
        if (/<\s*\/?\s*(?!span[\s\/>])[a-z][^>]*>/i.test(html)) return "";
        if (/[\s\/]on[a-z]+\s*=/i.test(html)) return "";
        return html;
    }

    function restore() {
        let saved = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return;
        }
        if (!saved) return;

        let parsed = null;
        try {
            parsed = JSON.parse(saved);
        } catch (e) {
            return;
        }

        if (!parsed || !Array.isArray(parsed.rows)) return;
        if (parsed.fingerprint !== fingerprint()) {
            // A different build. Drop it rather than show stale roll codes.
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
            return;
        }

        try {
            rows.length = 0;
            for (let i = 0; i < parsed.rows.length; i++) {
                const fields = parsed.rows[i];
                // Mutating this in place is fine: fields is part of the
                // object graph JSON.parse just built for this call alone. A
                // malformed entry (null, a primitive, missing fields) throws
                // here or inside makeRow - deliberately not guarded - so the
                // catch below can drop the whole queue rather than leave a
                // reconstructed row half-built.
                fields.rollHtml = safeRollHtml(fields.rollHtml);
                rows.push(window.PlanQueue.makeRow(fields));
            }
        } catch (e) {
            // The queue is turn-scoped scratch: a malformed stored row costs
            // the user their queue, never their build sheet. Anything that
            // survives JSON.parse but not reconstruction gets dropped, same
            // as a fingerprint mismatch.
            rows.length = 0;
            try { localStorage.removeItem(STORAGE_KEY); } catch (e2) { /* ignore */ }
        }
    }

    // One delegated listener set on the rail, so re-rendering never leaves
    // stale handlers behind.
    let railBound = false;
    let addSyncBound = false;
    let restored = false;

    function bindRail() {
        if (railBound) return;
        const rail = document.getElementById("plan-rail");
        if (!rail) return;
        railBound = true;

        // See flushPersist above: closes the window a debounced persist()
        // would otherwise leave open across a reload, back/forward, or tab
        // close.
        window.addEventListener("pagehide", flushPersist);

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
                const chipUid = target.getAttribute("data-chip-uid");
                if (row && chipUid) {
                    const at = row.dismissed.indexOf(chipUid);
                    if (at === -1) row.dismissed.push(chipUid);
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
            // Digits with an optional leading sign. The field is a text input
            // (see rowHtml) so the caret survives the re-render below; that is
            // also why anything else has to be filtered here rather than left
            // to the browser's number validation.
            const raw = event.target.value;
            const clean = raw.replace(/(?!^[+-])[^0-9]/g, "").replace(/^([+-])?0*(\d)/, "$1$2");
            let caret = event.target.selectionStart;
            if (typeof caret === "number") caret -= raw.length - clean.length;

            row.manualMod = clean;

            refresh();
            const again = document.querySelector('[data-manual="' + manualUid + '"]');
            if (again) {
                again.focus();
                // Now that this is a text input, selectionStart is a real
                // number and the caret can actually be put back where it was.
                if (typeof caret === "number") {
                    const at = Math.max(0, Math.min(caret, again.value.length));
                    try { again.setSelectionRange(at, at); } catch (e) { /* ignore */ }
                }
            }
        });

        // Drag-to-reorder. The row markup already carries draggable="true" and
        // the index cell already looks like a handle; this is what makes that
        // honest.
        //
        // refresh() replaces the whole rail via innerHTML, and native HTML5
        // drag-and-drop ends the drag session the instant the dragged node is
        // removed from the DOM. So move() - which calls refresh() - is only
        // ever called from drop, never from dragover: a dragover-driven live
        // preview would rip the very node the browser is tracking out from
        // under itself and silently cancel the drag.
        let draggingUid = null;

        rail.addEventListener("dragstart", function (event) {
            const rowEl = event.target.closest ? event.target.closest(".plan-row") : null;
            if (!rowEl) return;
            draggingUid = rowEl.getAttribute("data-uid");
            rowEl.classList.add("dragging");
            event.dataTransfer.effectAllowed = "move";
            // Firefox refuses to start a drag without data set on it.
            try { event.dataTransfer.setData("text/plain", draggingUid); } catch (e) { /* ignore */ }
        });

        // No re-render here on purpose - see the note above bindRail's drag
        // listeners. Only preventDefault, so the rail accepts the drop at all.
        rail.addEventListener("dragover", function (event) {
            if (draggingUid) event.preventDefault();
        });

        rail.addEventListener("drop", function (event) {
            if (!draggingUid) return;
            event.preventDefault();

            // The rail has not been re-rendered since dragstart, so this index
            // is still the row's original position - which is exactly what
            // move() needs. It removes the dragged row first and then inserts
            // it at this same index, and because that second splice always
            // lands the item at the literal index given, the row ends up at
            // the numbered slot it was dropped on with no further adjustment.
            const overRow = event.target.closest ? event.target.closest(".plan-row") : null;
            const all = rail.querySelectorAll(".plan-row");
            let toIndex = all.length;
            for (let i = 0; i < all.length; i++) {
                if (all[i] === overRow) { toIndex = i; break; }
            }

            const uid = draggingUid;
            draggingUid = null;
            move(uid, toIndex);
        });

        rail.addEventListener("dragend", function () {
            draggingUid = null;
            // A successful drop already re-rendered the rail via move(), so
            // the node this dragstart marked is gone; this queries fresh
            // rather than caching a reference, and only matters for a drag
            // that ends without a drop (e.g. Escape).
            const dragging = rail.querySelector(".plan-row.dragging");
            if (dragging) dragging.classList.remove("dragging");
        });
    }

    // Adds an Add button to every card that can be queued, once.
    function installAddButtons() {
        bindRail();

        // Clicking a mastery icon is what unblocks an Add button. CardGate
        // owns the one document listener that watches those clicks.
        if (!addSyncBound) {
            addSyncBound = true;
            window.CardGate.onChange(syncAddButtons);
            window.CardGate.install();
        }

        if (!restored) {
            restored = true;
            restore();
            // No refresh() here: the unconditional one at the end of this
            // function (below) is the first paint. Calling both rendered the
            // same rail twice on every first load.
        }

        // One list, shared with the roll-code gate: a container added there
        // must get + buttons too. Ids that do not exist yet are skipped by the
        // getElementById check below.
        const containers = window.CardGate.CONTAINER_IDS;
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
                    // A card with no mastery lit would snapshot with masteryId
                    // null: the engine then blocks any mastery-matched buff and
                    // the row shows no mastery at all. Refusing the Add is
                    // clearer than queueing a row that silently under-applies.
                    if (window.CardGate.addBlockedReason(card)) return;
                    add(card);
                    // A moment of feedback, since the card itself does not change.
                    button.classList.add("just-added");
                    setTimeout(function () { button.classList.remove("just-added"); }, 350);
                });
                card.appendChild(button);
            }
        }

        // After the buttons exist, not before — the first call ran ahead of the
        // install loop and styled nothing.
        syncAddButtons();

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
        persist: persist,
        restore: restore,
    };
})();

window.PlanMode = PlanMode;
