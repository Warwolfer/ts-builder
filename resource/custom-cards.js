// resource/custom-cards.js
//
// The build sheet's Custom tab: actions a DM wrote on the DM Screen, pasted in
// as a code and drawn as ordinary cards. "Ordinary" is the whole trick — the
// card uses the same .card shell and the same span class names as the Saves
// and Checks cards, so Compact mode, Plan mode, the roll-code gate and the
// thread-code stamper all keep working without knowing this tab exists.
//
// The rendering half is pure and tested. The glue below it is the DOM.
(function (root, factory) {
    const deps = (typeof module !== "undefined" && module.exports)
        ? {
            Codec: require("../shared/custom-action-codec"),
            CardView: require("../shared/components/custom-action-card"),
        }
        : { Codec: root.CustomActionCodec, CardView: root.CustomActionCard };
    const api = factory(deps.Codec, deps.CardView);
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.CustomCards = api;
})(this, function (Codec, CardView) {
    "use strict";

    // The whole build state goes through localStorage, which is about 5 MB for
    // the site. Thirty maximal actions is roughly 120 KB, and no DM hands out
    // thirty charts for one thread. Not from the spec; see the plan.
    const MAX_CUSTOM_ACTIONS = 30;

    const esc = CardView.escapeHtml;

    // The duplicate rule from the spec: same n, d, p, k and g. JSON with a
    // fixed field order is the cheapest way to say "same fields, any order".
    function canonical(action) {
        return JSON.stringify([
            action.n || "",
            action.d || "",
            action.p || [],
            action.k || [],
            action.g || [],
        ]);
    }

    function sameAction(a, b) {
        return canonical(a) === canonical(b);
    }

    const SCREEN_REFUSAL = "That is a DM Screen code. Open it on the DM Screen page.";

    function screenRefusal() {
        return SCREEN_REFUSAL;
    }

    // Skips an action whose n, d, p, k and g all match one already in the
    // build — and one that repeats inside the pasted list itself, which a DM
    // exporting two cycles will produce every time.
    function dedupe(incoming, existing) {
        // existing is state.customActions, sourced from localStorage or a
        // saved record — neither validates shape. One hand-edited or
        // half-written entry must not block every future import.
        const seen = (existing || [])
            .filter(function (e) { return e && e.action && typeof e.action === "object"; })
            .map(function (e) { return canonical(e.action); });
        const fresh = [];
        let skipped = 0;
        for (let i = 0; i < incoming.length; i++) {
            const key = canonical(incoming[i]);
            if (seen.indexOf(key) !== -1) { skipped += 1; continue; }
            seen.push(key);
            fresh.push(incoming[i]);
        }
        return { fresh: fresh, skipped: skipped };
    }

    function saveIconHtml(kind) {
        return "<div class='display masterycircle' data-kind=\"" + kind + "\"" +
            " title=\"" + esc(CardView.KIND_LABELS[kind]) + "\">" +
            "<img src='" + CardView.SAVE_ICONS[kind] + "' alt='" + kind + "'></div>";
    }

    function pickIconHtml(kind, item) {
        const style = item.borderColor
            ? " style='border-color: " + esc(item.borderColor) + ";'"
            : "";
        return "<div class='display masterycircle' data-kind=\"" + kind + "\"" +
            " data-lookup=\"" + esc(item.lookup) + "\" title=\"" + esc(item.name) + "\"" +
            style + "><img src='" + esc(item.image) + "' alt='" + esc(item.lookup) + "'></div>";
    }

    // One icon per roll this action allows. No `k` means the DM allowed
    // everything, which is what the codec's own default says.
    //
    // Deliberately no data-mastery attribute: CardGate reads it to choose
    // between "Choose a mastery first" and "Choose a type first", and a custom
    // card can offer a save and a mastery side by side, so "type" is the honest
    // word. It also keeps plan-mode's lookupForCard from claiming the card
    // before Section 5 of the spec is built.
    function iconsHtml(action, opts) {
        const kinds = (action.k && action.k.length)
            ? action.k
            : ["fortitude", "reflex", "will", "mastery", "expertise"];
        let html = "";
        for (let i = 0; i < kinds.length; i++) {
            const kind = kinds[i];
            if (kind === "mastery") {
                (opts.masteries || []).forEach(function (m) { html += pickIconHtml("mastery", m); });
            } else if (kind === "expertise") {
                (opts.expertise || []).forEach(function (e) { html += pickIconHtml("expertise", e); });
            } else if (CardView.SAVE_ICONS[kind]) {
                html += saveIconHtml(kind);
            }
        }
        return html;
    }

    // The span classes are the contract with the rest of the sheet: .thrcode is
    // stamped live by updateThreadCode, and .customkind, .customadv,
    // .custombonus and .customtype are stamped by this file when an icon or an
    // Adv/Normal/Dis button is clicked.
    //
    // The character name, the thread code and the NG1 marker are baked in here
    // rather than left as placeholders, because replaceCharacterName and
    // applyNgSuffixToChecks only sweep #freeactiondisplay, #actionsdisplay and
    // #saveschecks — and they run before a card imported later exists.
    function rollCodeHtml(entry, opts) {
        const name = opts.characterName ? esc(opts.characterName) : "Character Name";
        const code = opts.threadCode ? esc(opts.threadCode) : "Thread Code";
        const ng = opts.ng === 1 ? "NG1 · " : "";
        return '<div class="rollcode clickable-rollcode" onclick="copyRollCode(this)" title="Click to copy">' +
            "?r custom " + esc(entry.payload) + " " +
            "<span class='customkind'>type</span> " +
            "<span class='customadv'></span>" +
            "<span class='custombonus'>X</span>" +
            " # " + esc(entry.action.n) + " · " +
            "<span class='customtype'>Type</span> · " +
            name + " · " + ng +
            "<span class='thrcode'>" + code + "</span>" +
            "</div>";
    }

    // When k lists only mastery and/or expertise and the character has chosen
    // neither, iconsHtml has nothing to draw and returns "". CardGate's block
    // check keys off icons.length, so a card with zero icons was never blocked
    // — the roll code stayed unlocked and copied its placeholders literally.
    // data-requires-pick tells card-gate.js this card needs a pick it cannot
    // offer.
    // The `type` pill under the title, in the slot every other card gives its
    // role ("Support", "Alter - Aura"). A custom action has no role, so it
    // names what you roll instead. No `k` means the DM allowed everything,
    // which is too long for the pill and says nothing useful.
    function typeLabel(action) {
        const kinds = (action.k || []).filter(function (kind) {
            return CardView.KIND_LABELS[kind];
        });
        if (!kinds.length || kinds.length === Codec.KINDS.length) return "Custom";
        return kinds.map(function (kind) { return CardView.KIND_LABELS[kind]; }).join(" / ");
    }

    // The skeleton is the built-in action card's, element for element:
    // .cardtop > .cardtopleft > .cardtitle + .filler + .type, then .cardinfo,
    // then the icon row, the toggles and the roll code. Matching it is what
    // gives a custom card the same padding, the same title weight and the same
    // pill as its neighbours — and it means Compact's `.cardinfo` rule and
    // Plan's `.cardinfo` / `.masteryicon` rules apply to it for free, instead
    // of needing a parallel set keyed on this card's own class names.
    function cardHtml(entry, opts) {
        const icons = iconsHtml(entry.action, opts);
        const iconsBlock = icons ||
            '<div class="customcard-needspick">This action needs a mastery or ' +
            "expertise this character has not chosen.</div>";
        return '<div class="card customcard"' +
            (icons ? "" : ' data-requires-pick="1"') +
            ' data-custom-id="' + esc(entry.id) + '">' +
            '<div class="cardtop">' +
            '<div class="cardtopleft">' +
            '<div class="cardtitle">' + esc(entry.action.n) + "</div>" +
            '<div class="filler"></div>' +
            '<p class="type">' + esc(typeLabel(entry.action)) + "</p>" +
            "</div>" +
            '<div class="filler"></div>' +
            '<button type="button" class="customcard-remove" data-remove title="Remove from this build">×</button>' +
            "</div>" +
            '<div class="cardinfo">' + CardView.detailHtml(entry.action) + "</div>" +
            // .masteryicon is what addGlowEffect and Plan mode already key on;
            // .customicons is how this file finds the row again.
            '<div class="masteryicon customicons">' + iconsBlock + "</div>" +
            '<div class="togglecontainer">' +
            '<div class="togglesavechecks" data-adv="adv ">Adv</div>' +
            '<div class="togglesavechecks" data-adv="">Normal</div>' +
            '<div class="togglesavechecks" data-adv="dis ">Dis</div>' +
            "</div>" +
            rollCodeHtml(entry, opts) +
            "</div>";
    }

    // state.customActions is merged straight out of localStorage, and
    // PendingBuild.read only checks Array.isArray on the list itself — one
    // hand-edited or half-written entry must not take cardHtml, and with it
    // the whole tab including the `+` card, down.
    function isWellFormedEntry(entry) {
        return !!entry &&
            typeof entry === "object" &&
            entry.id != null &&
            entry.payload !== undefined &&
            !!entry.action &&
            typeof entry.action === "object" &&
            typeof entry.action.n === "string" &&
            Array.isArray(entry.action.g);
    }

    // --- glue -----------------------------------------------------------

    let sheet = null;          // buildSheetInstance
    let bound = false;

    function stateActions() {
        if (!sheet) return [];
        const list = sheet.state.getState().customActions;
        return Array.isArray(list) ? list : [];
    }

    function setActions(list) {
        sheet.state.updateState({ customActions: list });
    }

    // The two lists the icon strip draws from, in the sheet's own order and
    // already narrowed to what this character has.
    function renderOpts() {
        const state = sheet.state.getState();
        const allMasteries = sheet.dataLoader.cache.masteries || [];
        const allExpertise = sheet.dataLoader.cache.expertise || [];
        const borderColors = { physical: "#ce6541", creative: "#a84b72", crafting: "#d2aa49" };

        const masteries = (state.chosenMasteries || []).map(function (id) {
            return allMasteries.find(function (m) { return m.lookup === id; });
        }).filter(Boolean);

        const expertise = (state.chosenExpertise || []).map(function (id) {
            const found = allExpertise.find(function (e) { return e.lookup === id; });
            if (!found) return null;
            const firstType = found.types && found.types[0];
            return {
                lookup: found.lookup,
                name: found.name,
                image: found.image,
                borderColor: borderColors[firstType] || "#6e51cb",
            };
        }).filter(Boolean);

        return {
            characterName: state.characterName || "",
            threadCode: state.threadCode || "",
            ng: state.ng,
            masteries: masteries,
            expertise: expertise,
        };
    }

    function skippedNoteHtml(count) {
        const words = count === 1
            ? "1 saved card could not be read and was skipped."
            : count + " saved cards could not be read and were skipped.";
        return '<div class="customcards-note">' + words + "</div>";
    }

    // render() rebuilds container.innerHTML from state, so the picked icon and
    // the lit Adv/Normal/Dis toggle — both DOM-only — would otherwise be wiped
    // on every card whenever any one of them is imported or removed. Capture
    // before the rewrite, restore after, keyed by data-custom-id, and nothing
    // else: not which entries were skipped, not scroll position, nothing the
    // spec did not ask for.
    function captureCardState(container) {
        const captured = {};
        const cards = container.querySelectorAll(".customcard");
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const id = card.getAttribute("data-custom-id");
            if (!id) continue;
            const icon = card.querySelector(".masterycircle.active-glow");
            const toggle = card.querySelector(".togglesavechecks.active-glow");
            captured[id] = {
                kind: icon ? icon.getAttribute("data-kind") : null,
                lookup: icon ? icon.getAttribute("data-lookup") : null,
                adv: toggle ? toggle.getAttribute("data-adv") : null,
            };
        }
        return captured;
    }

    // Same kind and same lookup (both null for a save icon, which carries no
    // data-lookup). If the player removed that mastery or expertise, no icon
    // matches any more and this returns null — the card stays locked, same as
    // a freshly imported one.
    function findMatchingIcon(card, picked) {
        if (!picked.kind) return null;
        const icons = card.querySelectorAll(".masterycircle");
        for (let i = 0; i < icons.length; i++) {
            const candidate = icons[i];
            if (candidate.getAttribute("data-kind") !== picked.kind) continue;
            if ((candidate.getAttribute("data-lookup") || null) === (picked.lookup || null)) {
                return candidate;
            }
        }
        return null;
    }

    function findMatchingToggle(card, picked) {
        if (picked.adv == null) return null;
        const toggles = card.querySelectorAll(".togglesavechecks");
        for (let i = 0; i < toggles.length; i++) {
            if (toggles[i].getAttribute("data-adv") === picked.adv) return toggles[i];
        }
        return null;
    }

    // Re-lights each card's captured pick through the exact same functions a
    // real click runs — addGlowEffect and stampIcon/setSpan — so a restored
    // card cannot end up in a state a click could never have produced. Each
    // card's icon strip is its own addGlowEffect scope (see build-sheet.js),
    // so two cards that both had the same mastery lit restore independently
    // and do not fight over one glow.
    function restoreCardState(container, captured) {
        const cards = container.querySelectorAll(".customcard");
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const id = card.getAttribute("data-custom-id");
            const picked = id ? captured[id] : null;
            if (!picked) continue;

            const icon = findMatchingIcon(card, picked);
            if (icon) {
                window.addGlowEffect(icon, "masterycircle");
                stampIcon(card, icon);
            }

            const toggle = findMatchingToggle(card, picked);
            if (toggle) {
                window.addGlowEffect(toggle, "togglesavechecks");
                setSpan(card, ".customadv", toggle.getAttribute("data-adv"));
            }
        }
    }

    function render() {
        const container = document.getElementById("customdisplay");
        if (!container || !sheet) return;
        const captured = captureCardState(container);
        const entries = stateActions();
        const opts = renderOpts();
        let cardsHtml = "";
        let skipped = 0;
        for (let i = 0; i < entries.length; i++) {
            if (!isWellFormedEntry(entries[i])) { skipped += 1; continue; }
            cardsHtml += cardHtml(entries[i], opts);
        }
        let html = skipped ? skippedNoteHtml(skipped) : "";
        html += cardsHtml;
        if (entries.length < MAX_CUSTOM_ACTIONS) {
            html += '<div class="card customcard-add" data-import title="Import a custom action">+</div>';
        } else {
            html += '<div class="card customcard-add is-full">' + MAX_CUSTOM_ACTIONS +
                " custom actions is the limit</div>";
        }
        container.innerHTML = html;
        restoreCardState(container, captured);
        // A fresh card has nothing lit, so its roll code starts locked; a
        // restored one may already be ready. Restore before syncing, not
        // after, so the gate sees the final state once.
        window.CardGate.syncRollCodes();
        // innerHTML above threw away any + buttons Plan mode had stamped on
        // these cards, and installAddButtons already ran once, before this
        // container had any cards in it at all. Put them back.
        if (window.PlanMode && window.PlanMode.refreshAddButtons) {
            window.PlanMode.refreshAddButtons();
        }
    }

    function add(entries) {
        setActions(stateActions().concat(entries));
        render();
    }

    function remove(id) {
        setActions(stateActions().filter(function (e) { return e.id !== id; }));
        render();
    }

    // --- stamping ---------------------------------------------------------

    function setSpan(card, selector, value) {
        const span = card.querySelector(selector);
        if (span) span.textContent = String(value == null ? "" : value);
    }

    // A save's bonus is a number the sheet already computes; a mastery's or an
    // expertise's is the rank letter. Mirrors clickSave and clickExpertise,
    // scoped to one card instead of the page's single check card.
    function stampIcon(card, icon) {
        const kind = icon.getAttribute("data-kind");
        const lookup = icon.getAttribute("data-lookup");
        const state = sheet.state.getState();
        let bonus = "";
        let typeLabel = "";

        if (kind === "mastery") {
            const index = (state.chosenMasteries || []).indexOf(lookup);
            if (index === -1) return;
            const mastery = (sheet.dataLoader.cache.masteries || [])
                .find(function (m) { return m.lookup === lookup; });
            bonus = sheet.getRankLabel(state.chosenMasteriesRanks[index]);
            typeLabel = mastery ? mastery.name : "Mastery";
        } else if (kind === "expertise") {
            const index = (state.chosenExpertise || []).indexOf(lookup);
            if (index === -1) return;
            const found = (sheet.dataLoader.cache.expertise || [])
                .find(function (e) { return e.lookup === lookup; });
            bonus = sheet.getRankLabel(state.chosenExpertiseRanks[index]);
            typeLabel = found ? found.name : "Expertise";
        } else {
            const stats = sheet.calculations.getCompleteStats(
                state,
                sheet.dataLoader.cache.masteries,
                sheet.dataLoader.cache.actions,
            );
            bonus = stats.saves[kind];
            typeLabel = CardView.KIND_LABELS[kind] || kind;
        }

        setSpan(card, ".customkind", kind);
        setSpan(card, ".custombonus", bonus);
        setSpan(card, ".customtype", typeLabel);
    }

    // --- events -------------------------------------------------------------

    function modalParts() {
        return {
            modal: document.getElementById("custom-import-modal"),
            text: document.getElementById("custom-import-text"),
            error: document.getElementById("custom-import-error"),
            go: document.getElementById("custom-import-go"),
            cancel: document.getElementById("custom-import-cancel"),
        };
    }

    function showError(message, isNote) {
        const parts = modalParts();
        if (!parts.error) return;
        parts.error.textContent = message || "";
        parts.error.classList.toggle("is-note", !!isNote);
    }

    function openImport() {
        const parts = modalParts();
        if (!parts.modal) return;
        parts.text.value = "";
        showError("");
        parts.modal.hidden = false;
        parts.text.focus();
    }

    function closeImport() {
        const parts = modalParts();
        if (parts.modal) parts.modal.hidden = true;
    }

    // The code arrives from a Discord message, so the paste may carry spaces
    // and line breaks. Everything the codec reads is base64url, which has
    // neither.
    function cleanCode(raw) {
        return String(raw == null ? "" : raw).replace(/\s+/g, "");
    }

    async function runImport() {
        const parts = modalParts();
        const code = cleanCode(parts.text.value);
        if (!code) {
            showError("Paste a code first.");
            return;
        }

        parts.go.disabled = true;
        try {
            const decoded = await Codec.decodeAny(code);
            if (decoded.kind === "screen") {
                showError(screenRefusal());
                return;
            }

            const incoming = decoded.kind === "list" ? decoded.value : [decoded.value];
            const room = MAX_CUSTOM_ACTIONS - stateActions().length;
            const result = dedupe(incoming, stateActions());

            if (!result.fresh.length) {
                showError(result.skipped === 1
                    ? "That action is already in this build."
                    : "All " + result.skipped + " actions are already in this build.");
                return;
            }
            if (result.fresh.length > room) {
                showError("Only room for " + room + " more. Remove a card first, or paste fewer.");
                return;
            }

            // The payload is what the roll code carries, so it is computed once
            // here and stored. Rendering then stays synchronous.
            const entries = [];
            for (let i = 0; i < result.fresh.length; i++) {
                const stripped = Codec.stripForRoll(result.fresh[i]);
                entries.push({
                    id: window.SavedBuildsStore.generateId(),
                    action: result.fresh[i],
                    payload: await Codec.encodeAction(stripped),
                });
            }

            add(entries);
            if (result.skipped) {
                // Left open on purpose: this count is the only place that
                // number is reported, and a closed modal would eat it.
                showError("Imported " + entries.length + ". Skipped " + result.skipped +
                    " already in this build.", true);
            } else {
                closeImport();
            }
        } catch (e) {
            showError(e && e.message ? e.message : "That code could not be read.");
        } finally {
            parts.go.disabled = false;
        }
    }

    function bindImportModal() {
        const parts = modalParts();
        if (!parts.modal) return;
        parts.go.addEventListener("click", runImport);
        parts.cancel.addEventListener("click", closeImport);
        // Click the dark surround to dismiss, but only when the press started
        // there too: a text selection dragged out of the textarea ends on the
        // backdrop and must not count as a dismissal.
        let pressedBackdrop = false;
        parts.modal.addEventListener("mousedown", function (event) {
            pressedBackdrop = event.target === parts.modal;
        });
        parts.modal.addEventListener("click", function (event) {
            if (event.target === parts.modal && pressedBackdrop) closeImport();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !parts.modal.hidden) closeImport();
        });
    }

    function onClick(event) {
        const container = document.getElementById("customdisplay");
        if (!container || !container.contains(event.target)) return;

        const importCard = event.target.closest("[data-import]");
        if (importCard) { openImport(); return; }

        const card = event.target.closest(".customcard");
        if (!card) return;

        const removeButton = event.target.closest("[data-remove]");
        if (removeButton) {
            const entry = stateActions().find(function (e) {
                return e.id === card.getAttribute("data-custom-id");
            });
            if (entry && window.confirm("Remove " + entry.action.n + " from this build?")) {
                remove(entry.id);
            }
            return;
        }

        const icon = event.target.closest(".masterycircle");
        if (icon) {
            // addGlowEffect is global on the build sheet and now knows about
            // .customicons, so one lit icon per card is its job, not ours.
            window.addGlowEffect(icon, "masterycircle");
            stampIcon(card, icon);
            return;
        }

        const toggle = event.target.closest(".togglesavechecks");
        if (toggle) {
            window.addGlowEffect(toggle, "togglesavechecks");
            setSpan(card, ".customadv", toggle.getAttribute("data-adv"));
        }
    }

    function install(instance) {
        sheet = instance;
        if (!bound) {
            bound = true;
            document.addEventListener("click", onClick);
            bindImportModal();
        }
        render();
    }

    return {
        MAX_CUSTOM_ACTIONS: MAX_CUSTOM_ACTIONS,
        sameAction: sameAction,
        screenRefusal: screenRefusal,
        dedupe: dedupe,
        iconsHtml: iconsHtml,
        rollCodeHtml: rollCodeHtml,
        cardHtml: cardHtml,
        isWellFormedEntry: isWellFormedEntry,
        install: install,
        render: render,
        add: add,
        remove: remove,
    };
});
