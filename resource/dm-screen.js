// resource/dm-screen.js
//
// The DM Screen: author custom actions per cycle, export them as codes, save
// whole screens. Glue between three tested pieces — DmScreenState (the
// model), CustomActionCodec (the codes) and SavedScreensStore (IndexedDB) —
// and the DOM.
//
// The open screen autosaves to IndexedDB on every change (debounced, flushed
// on pagehide). localStorage holds only which screen is open and which cycle
// tab, so a reload lands where the DM left off.
(function () {
    "use strict";

    const STORAGE_KEY = "tsbuilder_dm_screen";
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
    // Past this many characters the roll payload is at risk of not fitting a
    // Discord message once the command and comment are added.
    const LONG_CODE = 1800;

    // The codec's own limits (validateScreen). The UI has to hold the line
    // too: a screen past them still saves to IndexedDB but fails validation
    // on the next load, which used to mean a silent blank page.
    const MAX_CYCLES = 50;
    const MAX_CYCLE_ACTIONS = 100;

    const State = window.DmScreenState;
    const Codec = window.CustomActionCodec;
    const Store = window.SavedScreensStore;
    const esc = function (v) { return window.DOMUtils.escapeHtml(String(v == null ? "" : v)); };

    let screen = null;          // the working screen
    let activeCycleId = null;
    let editing = null;         // { cycleId, actionId|null } while the modal is open
    let editingSnapshot = "";   // JSON of the form as it looked when the modal opened
    let saveFailureWarned = false;
    let pendingWrite = null;    // the IndexedDB write in flight, if any
    // A pre-autosave screen read out of localStorage that the database has not
    // accepted yet. While this is true the legacy payload is the ONLY copy, so
    // rememberOpen() must not overwrite the key it sits under.
    let migrationPending = false;

    function now() { return Date.now(); }
    function newId() { return Store.generateId(); }

    // --- persistence -----------------------------------------------------------
    //
    // The screen autosaves to IndexedDB. localStorage holds only which screen is
    // open and which cycle tab, so a reload lands where the DM left off.

    function rememberOpen() {
        // The legacy payload under this key is still the only copy of a screen
        // the database has refused; leave it until a save lands.
        if (migrationPending) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                screenId: screen.id, activeCycleId: activeCycleId,
            }));
        } catch (e) { /* a few dozen bytes; if this fails the DB write will too and warn */ }
    }

    function warnOnce(e) {
        if (saveFailureWarned) return;
        saveFailureWarned = true;
        alert("This browser could not save the screen: " +
            (e && e.message ? e.message : "storage is blocked or full") +
            "\n\nExport a screen code before closing the page, or your changes will be lost.");
    }

    function flashSaved() {
        const flash = document.getElementById("dm-saved-flash");
        if (!flash) return;
        flash.hidden = false;
        clearTimeout(flash._timer);
        flash._timer = setTimeout(function () { flash.hidden = true; }, 900);
    }

    // Writes the open screen. Captures `screen` first: an edit during the
    // write reassigns it, and the record that lands must be the one we
    // stringified, not a later one.
    function persistNow() {
        rememberOpen();
        const saving = screen;
        pendingWrite = Store.save(saving).then(function () {
            migrationPending = false;
            flashSaved();
            return renderSwitcher();
        }, warnOnce);
        return pendingWrite;
    }

    let persistTimer = null;
    function persist() {
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(function () { persistTimer = null; persistNow(); }, 250);
    }

    // pagehide: the browser may not wait for an IndexedDB write started here,
    // but the debounce is 250 ms, so the window where a change is unsaved is
    // tiny. Export Screen Code is the deliberate backup.
    function flushPersist() {
        if (!persistTimer) return;
        clearTimeout(persistTimer);
        persistTimer = null;
        persistNow();
    }

    // Before switching screens: get any pending write onto disk first, or the
    // last few keystrokes of the old screen would be lost.
    async function settle() {
        if (persistTimer) {
            clearTimeout(persistTimer);
            persistTimer = null;
            await persistNow();
        } else if (pendingWrite) {
            await pendingWrite;
        }
    }

    function isBlank(s) {
        return s.name === State.DEFAULT_SCREEN_NAME &&
            s.cycles.length === 1 && s.cycles[0].actions.length === 0;
    }

    function openScreen(record, cycleId) {
        screen = record;
        activeCycleId = State.findCycle(screen, cycleId) ? cycleId : screen.cycles[0].id;
        render();
        rememberOpen();
        document.getElementById("dm-code-out").hidden = true;
    }

    async function restore() {
        let parsed = null;
        try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { parsed = null; }

        // The version before autosave kept the whole screen here. Carry it
        // into the database once so nobody loses the screen they had open.
        if (parsed && parsed.screen) {
            const problem = Codec.validateScreen(parsed.screen);
            if (problem === null) {
                try {
                    await Store.save(parsed.screen);
                } catch (e) {
                    // The database refused it (another tab holds an older
                    // version, or storage is off). Keep the legacy payload
                    // exactly where it is - rememberOpen checks this flag - or
                    // the reload the error message asks for would lose the only
                    // copy of the screen this migration exists to protect.
                    migrationPending = true;
                    warnOnce(e);
                }
                openScreen(parsed.screen, parsed.activeCycleId);
                return;
            }
            // Invalid under today's rules. Park it under a sibling key so it
            // can still be recovered by hand, and say where it went.
            try {
                localStorage.setItem(STORAGE_KEY + "_rejected", JSON.stringify(parsed));
            } catch (e) { /* best effort; the alert still names the key */ }
            alert("The screen saved in this browser could not be reopened: " + problem +
                "\n\nStarting a new one. The old copy was kept under " +
                STORAGE_KEY + "_rejected in this browser's storage.");
            parsed = null;
        }

        let records = [];
        try { records = await Store.getAll(); } catch (e) { warnOnce(e); }

        const wanted = parsed && parsed.screenId
            ? records.find(function (r) { return r.id === parsed.screenId; })
            : null;
        if (wanted) { openScreen(wanted, parsed.activeCycleId); return; }
        if (records.length) { openScreen(records[0], null); return; }   // newest first

        const fresh = State.newScreen({ id: newId(), now: now() });
        openScreen(fresh, null);
        persist();
    }

    // Every change to the model funnels through here.
    function commit(next) {
        screen = next;
        if (!State.findCycle(screen, activeCycleId)) activeCycleId = screen.cycles[0].id;
        render();
        persist();
    }

    // --- clipboard -----------------------------------------------------------

    function showCode(code) {
        const out = document.getElementById("dm-code-out");
        out.value = code;
        out.hidden = false;
        out.focus();
        out.select();
    }

    function copyText(code, button) {
        const done = function () {
            if (!button) return;
            const original = button.textContent;
            button.textContent = "Copied!";
            setTimeout(function () { button.textContent = original; }, 900);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(done, function () { showCode(code); });
        } else {
            // No secure context (a local http:// copy). Show it so it can be
            // copied by hand.
            showCode(code);
        }
    }

    // --- rendering -----------------------------------------------------------

    function kindBadge(kind) {
        const icon = SAVE_ICONS[kind] ? '<img src="' + SAVE_ICONS[kind] + '" alt="">' : "";
        return '<span class="dm-kind-badge">' + icon + esc(KIND_LABELS[kind] || kind) + "</span>";
    }

    // The card body shared by the grid and the modal preview.
    function cardBodyHtml(action) {
        let html = '<div class="dm-card-title">' + esc(action.n) + "</div>";
        if (action.d) html += '<div class="dm-card-desc">' + esc(action.d) + "</div>";
        const pre = action.p || [];
        for (let i = 0; i < pre.length; i++) {
            const label = pre[i][0] ? esc(pre[i][0]) + ": " : "";
            html += '<div class="dm-card-dice">' + label + esc(pre[i][1]) + "</div>";
        }
        if (action.k && action.k.length) {
            html += '<div class="dm-kind-badges">' + action.k.map(kindBadge).join("") + "</div>";
        }
        html += '<ul class="dm-chart">';
        for (let i = 0; i < action.g.length; i++) {
            html += "<li><b>" + esc(Codec.rangeLabel(action.g, i)) + "</b><span>" + esc(action.g[i][1]) + "</span></li>";
        }
        html += "</ul>";
        return html;
    }

    function copyToOptions(cycleId) {
        const others = screen.cycles.filter(function (c) { return c.id !== cycleId; });
        if (!others.length) return "";
        return '<select class="dm-select" data-copy-to title="Copy this action to another cycle">' +
            '<option value="">Copy to…</option>' +
            others.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + "</option>"; }).join("") +
            "</select>";
    }

    function renderTabs() {
        const tabs = document.getElementById("dm-tabs");
        const lone = screen.cycles.length === 1;
        let html = "";
        for (let i = 0; i < screen.cycles.length; i++) {
            const c = screen.cycles[i];
            html += '<div class="dm-tab' + (c.id === activeCycleId ? " active" : "") + '" data-cycle="' + esc(c.id) +
                '" title="Double-click to rename">' + '<span class="dm-tab-name">' + esc(c.name) + "</span>" +
                (lone ? "" : '<span class="dm-tab-close" data-close="' + esc(c.id) + '" title="Delete this cycle">×</span>') +
                "</div>";
        }
        if (screen.cycles.length < MAX_CYCLES) {
            html += '<div class="dm-tab dm-tab-add" data-add-cycle title="Add a cycle">+</div>';
        } else {
            html += '<div class="dm-tab dm-tab-full" title="A screen holds at most ' +
                MAX_CYCLES + ' cycles">' + MAX_CYCLES + ' cycles is the limit</div>';
        }
        tabs.innerHTML = html;
    }

    function renderGrid() {
        const grid = document.getElementById("dm-grid");
        const cycle = State.findCycle(screen, activeCycleId);
        let html = "";
        for (let i = 0; i < cycle.actions.length; i++) {
            const entry = cycle.actions[i];
            html += '<div class="dm-card" data-action="' + esc(entry.id) + '">' + cardBodyHtml(entry.action) +
                '<div class="dm-card-actions">' +
                '<button type="button" class="dm-btn dm-btn-small" data-edit>Edit</button>' +
                '<button type="button" class="dm-btn dm-btn-small" data-copy-code>Copy code</button>' +
                copyToOptions(cycle.id) +
                '<button type="button" class="dm-btn dm-btn-small dm-btn-danger" data-delete>Delete</button>' +
                "</div></div>";
        }
        if (!cycle.actions.length) {
            html += '<div class="dm-empty-note">No actions in this cycle yet. Press + to write one.</div>';
        }
        if (cycle.actions.length < MAX_CYCLE_ACTIONS) {
            html += '<div class="dm-card dm-card-add" data-new-action title="New action">+</div>';
        } else {
            html += '<div class="dm-card dm-card-add is-full" title="A cycle holds at most ' +
                MAX_CYCLE_ACTIONS + ' actions">' + MAX_CYCLE_ACTIONS + ' actions is the limit</div>';
        }
        grid.innerHTML = html;

        document.getElementById("dm-cycle-count").textContent =
            cycle.actions.length + (cycle.actions.length === 1 ? " action" : " actions") + " in " + cycle.name;
        document.getElementById("dm-copy-all").disabled = cycle.actions.length === 0;
    }

    function renderTopbar() {
        const nameInput = document.getElementById("dm-screen-name");
        if (nameInput.value !== screen.name && document.activeElement !== nameInput) nameInput.value = screen.name;
    }

    function render() {
        renderTopbar();
        renderTabs();
        renderGrid();
    }

    // The switcher lists every screen, newest first, with the open one
    // selected. Called after each successful write, so a rename shows up.
    let switcherKey = "";
    async function renderSwitcher() {
        const select = document.getElementById("dm-saved");
        let records = [];
        try { records = await Store.getAll(); } catch (e) { records = []; }
        if (!records.some(function (r) { return r.id === screen.id; })) records.unshift(screen);
        // Replacing the options closes the dropdown if the DM has it open,
        // and this runs after every autosave - so only rebuild when the
        // list actually changed.
        const key = records.map(function (r) { return r.id + "|" + r.name; }).join("\n");
        if (key !== switcherKey) {
            switcherKey = key;
            select.innerHTML = records.map(function (r) {
                return '<option value="' + esc(r.id) + '">' + esc(r.name) + "</option>";
            }).join("");
        }
        select.value = screen.id;
    }

    // --- the action editor -----------------------------------------------------

    function preRowHtml(label, dice) {
        return '<div class="dm-row dm-row-pre">' +
            '<input type="text" name="plabel" maxlength="30" placeholder="Label (e.g. Base damage)" value="' + esc(label) + '">' +
            '<input type="text" name="pdice" placeholder="20d20" value="' + esc(dice) + '">' +
            '<button type="button" class="dm-row-remove" data-remove title="Remove row">×</button></div>';
    }

    function degreeRowHtml(bound, text) {
        return '<div class="dm-row dm-row-degree">' +
            '<span class="dm-row-upto">up to</span>' +
            '<input type="text" name="bound" inputmode="numeric" placeholder="40" value="' + (bound == null ? "" : esc(bound)) + '">' +
            '<input type="text" name="gtext" maxlength="200" placeholder="Take 20d20 damage" value="' + esc(text) + '">' +
            '<button type="button" class="dm-row-remove" data-remove title="Remove degree">×</button></div>';
    }

    // The last degree row is always "and above": its bound is hidden and its
    // remove button is the only way to lose it.
    function markLastDegree() {
        const rows = document.querySelectorAll("#dm-degree-rows .dm-row-degree");
        for (let i = 0; i < rows.length; i++) {
            const last = i === rows.length - 1;
            rows[i].classList.toggle("is-last", last);
            rows[i].querySelector(".dm-row-upto").textContent = last ? "and above" : "up to";
        }
    }

    function fillForm(action) {
        const form = document.getElementById("dm-form");
        form.elements.n.value = action ? action.n : "";
        form.elements.d.value = action && action.d ? action.d : "";

        const pre = document.getElementById("dm-pre-rows");
        pre.innerHTML = (action && action.p ? action.p : []).map(function (r) { return preRowHtml(r[0], r[1]); }).join("");

        const kinds = form.querySelectorAll('input[name="k"]');
        for (let i = 0; i < kinds.length; i++) {
            kinds[i].checked = !!(action && action.k && action.k.indexOf(kinds[i].value) !== -1);
        }

        const degrees = document.getElementById("dm-degree-rows");
        const g = action ? action.g : [[40, ""], [null, ""]];
        degrees.innerHTML = g.map(function (r) { return degreeRowHtml(r[0], r[1]); }).join("");
        markLastDegree();
    }

    // Reads the form into an action object. Bounds are numbers or null; a
    // non-numeric bound is left as the raw string so validateAction names it.
    function readForm() {
        const form = document.getElementById("dm-form");
        const action = { v: 1, n: form.elements.n.value };
        const d = form.elements.d.value;
        if (d.trim()) action.d = d;

        const preRows = document.querySelectorAll("#dm-pre-rows .dm-row-pre");
        const p = [];
        for (let i = 0; i < preRows.length; i++) {
            p.push([preRows[i].querySelector('[name="plabel"]').value, preRows[i].querySelector('[name="pdice"]').value.trim()]);
        }
        if (p.length) action.p = p;

        const k = [];
        const kinds = form.querySelectorAll('input[name="k"]:checked');
        for (let i = 0; i < kinds.length; i++) k.push(kinds[i].value);
        action.k = k;

        const rows = document.querySelectorAll("#dm-degree-rows .dm-row-degree");
        action.g = [];
        for (let i = 0; i < rows.length; i++) {
            const last = i === rows.length - 1;
            const raw = rows[i].querySelector('[name="bound"]').value.trim();
            const text = rows[i].querySelector('[name="gtext"]').value;
            let bound = null;
            if (!last) bound = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
            action.g.push([bound, text]);
        }
        return action;
    }

    let previewTimer = null;
    function refreshPreview() {
        const action = readForm();
        const problem = Codec.validateAction(action);
        document.getElementById("dm-form-error").textContent = problem || "";
        document.getElementById("dm-submit").disabled = !!problem;

        const card = document.getElementById("dm-preview-card");
        const meta = document.getElementById("dm-preview-meta");
        if (problem) {
            card.innerHTML = '<div class="dm-card-desc">Fix the note above to see the preview.</div>';
            meta.textContent = "";
            return;
        }
        card.innerHTML = cardBodyHtml(action);

        // The code length is what a player will paste into Discord; encode is
        // async, so debounce it behind the keystrokes.
        if (previewTimer) clearTimeout(previewTimer);
        previewTimer = setTimeout(function () {
            Codec.encodeAction(Codec.stripForRoll(action)).then(function (code) {
                meta.textContent = "Roll code: " + code.length + " characters" +
                    (code.length > LONG_CODE ? " — too long for a Discord message; shorten the texts" : "");
                meta.classList.toggle("is-long", code.length > LONG_CODE);
            }, function () { meta.textContent = ""; });
        }, 200);
    }

    function openModal(cycleId, actionId) {
        editing = { cycleId: cycleId, actionId: actionId || null };
        const entry = actionId ? State.findAction(State.findCycle(screen, cycleId), actionId) : null;
        document.getElementById("dm-modal-title").textContent = entry ? "Edit Action" : "New Action";
        fillForm(entry ? entry.action : null);
        refreshPreview();
        document.getElementById("dm-modal").hidden = false;
        document.getElementById("dm-form").elements.n.focus();
        editingSnapshot = JSON.stringify(readForm());
    }

    function closeModal() {
        editing = null;
        if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
        document.getElementById("dm-preview-meta").textContent = "";
        document.getElementById("dm-modal").hidden = true;
    }

    // Closing throws away whatever is in the form, so only do it silently when
    // nothing has been typed since it opened.
    function closeModalSafely() {
        if (JSON.stringify(readForm()) !== editingSnapshot &&
            !confirm("Close the editor and lose these changes?")) return;
        closeModal();
    }

    function submitModal(event) {
        event.preventDefault();
        if (!editing) return;
        const action = readForm();
        if (Codec.validateAction(action) !== null) { refreshPreview(); return; }
        if (editing.actionId) {
            commit(State.updateAction(screen, editing.cycleId, editing.actionId, action, now()));
        } else {
            commit(State.addAction(screen, editing.cycleId, action, { id: newId(), now: now() }));
        }
        closeModal();
    }

    // --- screen-level actions -----------------------------------------------------

    function flashButton(id, text) {
        const button = document.getElementById(id);
        const original = button.textContent;
        button.textContent = text;
        setTimeout(function () { button.textContent = original; }, 900);
    }

    async function switchTo(id) {
        if (id === screen.id) return;
        await settle();
        let records = [];
        try {
            records = await Store.getAll();
        } catch (e) {
            // The select shows the screen the user picked, but `screen` is
            // still the old one; put it back so the two agree.
            warnOnce(e);
            await renderSwitcher();
            return;
        }
        const record = records.find(function (r) { return r.id === id; });
        if (!record) { await renderSwitcher(); return; }
        openScreen(record, null);
    }

    async function deleteScreen() {
        if (!confirm('Delete "' + screen.name + '"? This cannot be undone.')) return;
        if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
        // persistNow attaches warnOnce as the rejection handler, so this
        // always resolves.
        if (pendingWrite) await pendingWrite;
        const doomed = screen.id;
        try { await Store.delete(doomed); } catch (e) { warnOnce(e); return; }
        let records = [];
        try { records = await Store.getAll(); } catch (e) { warnOnce(e); }
        records = records.filter(function (r) { return r.id !== doomed; });
        if (records.length) { openScreen(records[0], null); }
        else { openScreen(State.newScreen({ id: newId(), now: now() }), null); persist(); }
        await renderSwitcher();
    }

    async function newScreenAction() {
        if (isBlank(screen)) {
            // Nothing to leave behind; a second blank would only clutter the list.
            document.getElementById("dm-screen-name").focus();
            return;
        }
        await settle();
        openScreen(State.newScreen({ id: newId(), now: now() }), null);
        persist();
    }

    function exportScreen() {
        Codec.encodeScreen(screen).then(function (code) {
            copyText(code, document.getElementById("dm-export"));
            showCode(code);
        }, function (e) { alert(e && e.message ? e.message : "Could not export this screen."); });
    }

    function importScreen() {
        const code = prompt("Paste a DM Screen code (it starts with S1):");
        if (code == null || !code.trim()) return;
        Codec.decodeScreen(code).then(async function (imported) {
            // settle() protects the screen being left behind: persist() below
            // clears its pending debounce, so without this its last edit would
            // never reach the database.
            await settle();
            openScreen(State.withNewIds(imported, { idFn: newId, now: now() }), null);
            persist();
        }, function (e) { alert(e && e.message ? e.message : "That is not a DM Screen code."); });
    }

    // --- wiring ---------------------------------------------------------------------

    function bind() {
        document.getElementById("dm-screen-name").addEventListener("input", function (event) {
            commit(State.renameScreen(screen, event.target.value, now()));
        });
        document.getElementById("dm-saved").addEventListener("change", function (event) {
            switchTo(event.target.value);
        });
        document.getElementById("dm-delete-saved").addEventListener("click", deleteScreen);
        document.getElementById("dm-export").addEventListener("click", exportScreen);
        document.getElementById("dm-import").addEventListener("click", importScreen);
        document.getElementById("dm-new").addEventListener("click", newScreenAction);

        document.getElementById("dm-copy-all").addEventListener("click", function (event) {
            const actions = State.cycleActions(screen, activeCycleId);
            if (!actions.length) return;
            Codec.encodeList(actions).then(function (code) { copyText(code, event.target); },
                function (e) { alert(e && e.message ? e.message : "Could not export these actions."); });
        });

        // Tabs: click selects, double-click renames inline, × deletes, + adds.
        const tabs = document.getElementById("dm-tabs");
        tabs.addEventListener("click", function (event) {
            const close = event.target.closest("[data-close]");
            if (close) {
                const cycle = State.findCycle(screen, close.getAttribute("data-close"));
                if (cycle && confirm('Delete "' + cycle.name + '" and its ' + cycle.actions.length + " action(s)?")) {
                    commit(State.deleteCycle(screen, cycle.id, now()));
                }
                return;
            }
            if (event.target.closest("[data-add-cycle]")) {
                if (screen.cycles.length >= MAX_CYCLES) return;
                const id = newId();
                const next = State.addCycle(screen, { id: id, now: now() });
                activeCycleId = id;   // before commit, so one render shows the new tab selected
                commit(next);
                return;
            }
            const tab = event.target.closest("[data-cycle]");
            if (tab && !tab.querySelector("input")) {
                activeCycleId = tab.getAttribute("data-cycle");
                render();
                rememberOpen();
            }
        });
        tabs.addEventListener("dblclick", function (event) {
            const tab = event.target.closest("[data-cycle]");
            if (!tab || tab.querySelector("input")) return;
            const cycleId = tab.getAttribute("data-cycle");
            const nameSpan = tab.querySelector(".dm-tab-name");
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 60;
            input.value = nameSpan.textContent;
            nameSpan.replaceWith(input);
            input.focus();
            input.select();
            // One shot. Both endings re-render the tab bar, which removes this
            // input from the page, and removing a focused element fires blur in
            // some browsers — so Escape would reach the blur handler and commit
            // the name it was meant to discard.
            let done = false;
            const finish = function (keep) {
                if (done) return;
                done = true;
                if (keep) commit(State.renameCycle(screen, cycleId, input.value, now()));
                else render();
            };
            input.addEventListener("keydown", function (e) {
                if (e.key === "Enter") finish(true);
                if (e.key === "Escape") finish(false);
            });
            input.addEventListener("blur", function () { finish(true); });
        });

        // Cards.
        const grid = document.getElementById("dm-grid");
        grid.addEventListener("click", function (event) {
            if (event.target.closest("[data-new-action]")) { openModal(activeCycleId, null); return; }
            const card = event.target.closest("[data-action]");
            if (!card) return;
            const actionId = card.getAttribute("data-action");
            if (event.target.closest("[data-edit]")) { openModal(activeCycleId, actionId); return; }
            if (event.target.closest("[data-delete]")) {
                const entry = State.findAction(State.findCycle(screen, activeCycleId), actionId);
                if (entry && confirm('Delete "' + entry.action.n + '"?')) {
                    commit(State.deleteAction(screen, activeCycleId, actionId, now()));
                }
                return;
            }
            if (event.target.closest("[data-copy-code]")) {
                const entry = State.findAction(State.findCycle(screen, activeCycleId), actionId);
                if (!entry) return;
                Codec.encodeAction(entry.action).then(function (code) { copyText(code, event.target); },
                    function (e) { alert(e && e.message ? e.message : "Could not export this action."); });
            }
        });
        grid.addEventListener("change", function (event) {
            const select = event.target.closest("[data-copy-to]");
            if (!select || !select.value) return;
            const card = select.closest("[data-action]");
            // The other cap check lives in renderGrid, which simply stops
            // drawing the + card. This path adds an action to a cycle the DM
            // is not looking at, so it needs its own check or a full cycle
            // could be pushed past what validateScreen accepts.
            const target = State.findCycle(screen, select.value);
            if (target && target.actions.length >= MAX_CYCLE_ACTIONS) {
                alert('"' + target.name + '" already holds ' + MAX_CYCLE_ACTIONS + " actions, the most a cycle can have.");
                select.value = "";
                return;
            }
            // No flashButton here: #dm-copy-all is unrelated to this control, and
            // flashing it would corrupt its label. commit() already re-renders,
            // and the card visibly appears in the other cycle once the DM
            // switches to it.
            commit(State.copyAction(screen, activeCycleId, card.getAttribute("data-action"), select.value, { id: newId(), now: now() }));
        });

        // Modal.
        document.getElementById("dm-form").addEventListener("submit", submitModal);
        document.getElementById("dm-cancel").addEventListener("click", closeModal);
        // A click is dispatched on the nearest ancestor common to mousedown and
        // mouseup, so a drag-select that starts in a field and ends over the
        // backdrop would otherwise close the editor and lose the chart. Only
        // treat it as a backdrop click when the press STARTED there too.
        let pressedBackdrop = false;
        const modal = document.getElementById("dm-modal");
        modal.addEventListener("mousedown", function (event) {
            pressedBackdrop = event.target.id === "dm-modal";
        });
        modal.addEventListener("click", function (event) {
            if (event.target.id === "dm-modal" && pressedBackdrop) closeModalSafely();
            pressedBackdrop = false;
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && editing && !document.querySelector(".dm-tab input")) closeModalSafely();
        });
        document.getElementById("dm-form").addEventListener("input", refreshPreview);
        document.getElementById("dm-form").addEventListener("change", refreshPreview);
        document.getElementById("dm-form").addEventListener("click", function (event) {
            const add = event.target.closest("[data-add]");
            if (add) {
                if (add.getAttribute("data-add") === "pre") {
                    const host = document.getElementById("dm-pre-rows");
                    if (host.children.length >= 5) { alert("An action holds at most 5 dice rows."); return; }
                    host.insertAdjacentHTML("beforeend", preRowHtml("", ""));
                } else {
                    const host = document.getElementById("dm-degree-rows");
                    if (host.children.length >= 20) { alert("An action holds at most 20 degrees."); return; }
                    // Insert before the last row so "and above" stays last.
                    if (host.lastElementChild) {
                        host.lastElementChild.insertAdjacentHTML("beforebegin", degreeRowHtml("", ""));
                    } else {
                        host.insertAdjacentHTML("beforeend", degreeRowHtml("", ""));
                    }
                    markLastDegree();
                }
                refreshPreview();
                return;
            }
            const remove = event.target.closest("[data-remove]");
            if (remove) {
                const row = remove.closest(".dm-row");
                const isDegree = row.classList.contains("dm-row-degree");
                if (isDegree && document.querySelectorAll("#dm-degree-rows .dm-row-degree").length <= 1) return;
                row.remove();
                if (isDegree) markLastDegree();
                refreshPreview();
            }
        });
    }

    async function init() {
        // These two are safe before a screen exists, and must be armed early:
        // flushPersist checks for a pending timer and does nothing without one.
        window.addEventListener("pagehide", flushPersist);
        // Mobile browsers often fire this and never pagehide before discarding
        // a tab, so it gives the write a head start.
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden") flushPersist();
        });
        // A closure, so it needs no screen yet.
        window.DmScreen = { getScreen: function () { return screen; } };

        // Every other listener reads `screen`, so nothing may be clickable
        // until restore() has one. indexedDB.open is not instant on a cold
        // profile, and a click in that window used to throw.
        await restore();
        bind();
        await renderSwitcher();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
