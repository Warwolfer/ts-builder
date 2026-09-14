// resource/dm-screen.js
//
// The DM Screen: author custom actions per cycle, export them as codes, save
// whole screens. Glue between three tested pieces — DmScreenState (the
// model), CustomActionCodec (the codes) and SavedScreensStore (IndexedDB) —
// and the DOM.
//
// The working screen lives in localStorage and is written on every change
// (debounced, flushed on pagehide: the same pattern as plan-mode.js). Save
// puts it in IndexedDB; "unsaved" means the working copy differs from what
// was last saved or loaded.
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

    const State = window.DmScreenState;
    const Codec = window.CustomActionCodec;
    const Store = window.SavedScreensStore;
    const esc = function (v) { return window.DOMUtils.escapeHtml(String(v == null ? "" : v)); };

    let screen = null;          // the working screen
    let savedSnapshot = "";     // JSON of the screen as last saved/loaded
    let activeCycleId = null;
    let editing = null;         // { cycleId, actionId|null } while the modal is open

    function now() { return Date.now(); }
    function newId() { return Store.generateId(); }

    // --- persistence of the working copy -----------------------------------

    function persistNow() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                screen: screen, activeCycleId: activeCycleId, savedSnapshot: savedSnapshot,
            }));
        } catch (e) { /* private mode or full quota: the copy just will not survive a reload */ }
    }

    let persistTimer = null;
    function persist() {
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(function () { persistTimer = null; persistNow(); }, 250);
    }
    function flushPersist() {
        if (!persistTimer) return;
        clearTimeout(persistTimer);
        persistTimer = null;
        persistNow();
    }

    function restore() {
        let parsed = null;
        try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { parsed = null; }
        if (parsed && parsed.screen && Codec.validateScreen(parsed.screen) === null) {
            screen = parsed.screen;
            savedSnapshot = typeof parsed.savedSnapshot === "string" ? parsed.savedSnapshot : "";
            activeCycleId = State.findCycle(screen, parsed.activeCycleId) ? parsed.activeCycleId : screen.cycles[0].id;
            return;
        }
        screen = State.newScreen({ id: newId(), now: now() });
        savedSnapshot = "";
        activeCycleId = screen.cycles[0].id;
    }

    function isDirty() { return JSON.stringify(screen) !== savedSnapshot; }

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
            html += '<div class="dm-card-dice">' + esc(pre[i][0] || pre[i][1]) + ": " + esc(pre[i][1]) + "</div>";
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
        html += '<div class="dm-tab dm-tab-add" data-add-cycle title="Add a cycle">+</div>';
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
        html += '<div class="dm-card dm-card-add" data-new-action title="New action">+</div>';
        grid.innerHTML = html;

        document.getElementById("dm-cycle-count").textContent =
            cycle.actions.length + (cycle.actions.length === 1 ? " action" : " actions") + " in " + cycle.name;
        document.getElementById("dm-copy-all").disabled = cycle.actions.length === 0;
    }

    function renderTopbar() {
        const nameInput = document.getElementById("dm-screen-name");
        if (nameInput.value !== screen.name && document.activeElement !== nameInput) nameInput.value = screen.name;
        document.getElementById("dm-dirty").hidden = !isDirty();
    }

    function render() {
        renderTopbar();
        renderTabs();
        renderGrid();
    }

    async function refreshSavedList() {
        const select = document.getElementById("dm-saved");
        let records = [];
        try { records = await Store.getAll(); } catch (e) { records = []; }
        select.innerHTML = '<option value="">Saved screens…</option>' + records.map(function (r) {
            return '<option value="' + esc(r.id) + '">' + esc(r.name) + "</option>";
        }).join("");
        select.value = "";
        document.getElementById("dm-delete-saved").disabled = records.length === 0;
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
    }

    function closeModal() {
        editing = null;
        document.getElementById("dm-modal").hidden = true;
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

    async function saveScreen() {
        try {
            await Store.save(screen);
            savedSnapshot = JSON.stringify(screen);
            render();
            persist();
            await refreshSavedList();
            flashButton("dm-save", "Saved!");
        } catch (e) {
            alert("Could not save: " + (e && e.message ? e.message : e));
        }
    }

    function flashButton(id, text) {
        const button = document.getElementById(id);
        const original = button.textContent;
        button.textContent = text;
        setTimeout(function () { button.textContent = original; }, 900);
    }

    function confirmDiscard() {
        return !isDirty() || confirm("This screen has unsaved changes. Discard them?");
    }

    async function loadSaved(id) {
        const records = await Store.getAll();
        const record = records.find(function (r) { return r.id === id; });
        if (!record) return;
        if (!confirmDiscard()) { document.getElementById("dm-saved").value = ""; return; }
        screen = record;
        savedSnapshot = JSON.stringify(screen);
        activeCycleId = screen.cycles[0].id;
        render();
        persist();
    }

    async function deleteSaved() {
        const select = document.getElementById("dm-saved");
        const id = select.value;
        if (!id) { alert("Pick a saved screen in the list first."); return; }
        const name = select.options[select.selectedIndex].textContent;
        if (!confirm('Delete the saved screen "' + name + '"? The one you are editing stays open.')) return;
        await Store.delete(id);
        if (screen.id === id) savedSnapshot = "";
        render();
        await refreshSavedList();
    }

    function newScreenAction() {
        if (!confirmDiscard()) return;
        screen = State.newScreen({ id: newId(), now: now() });
        savedSnapshot = "";
        activeCycleId = screen.cycles[0].id;
        render();
        persist();
        document.getElementById("dm-code-out").hidden = true;
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
        Codec.decodeScreen(code).then(function (imported) {
            if (!confirmDiscard()) return;
            screen = State.withNewIds(imported, { idFn: newId, now: now() });
            savedSnapshot = "";
            activeCycleId = screen.cycles[0].id;
            render();
            persist();
        }, function (e) { alert(e && e.message ? e.message : "That is not a DM Screen code."); });
    }

    // --- wiring ---------------------------------------------------------------------

    function bind() {
        window.addEventListener("pagehide", flushPersist);

        document.getElementById("dm-screen-name").addEventListener("input", function (event) {
            commit(State.renameScreen(screen, event.target.value, now()));
        });
        document.getElementById("dm-save").addEventListener("click", saveScreen);
        document.getElementById("dm-saved").addEventListener("change", function (event) {
            if (event.target.value) loadSaved(event.target.value);
        });
        document.getElementById("dm-delete-saved").addEventListener("click", deleteSaved);
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
                const id = newId();
                commit(State.addCycle(screen, { id: id, now: now() }));
                activeCycleId = id;
                render();
                return;
            }
            const tab = event.target.closest("[data-cycle]");
            if (tab && !tab.querySelector("input")) {
                activeCycleId = tab.getAttribute("data-cycle");
                render();
                persist();
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
            const finish = function (keep) {
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
            commit(State.copyAction(screen, activeCycleId, card.getAttribute("data-action"), select.value, { id: newId(), now: now() }));
            flashButton("dm-copy-all", "Copied to " + State.findCycle(screen, select.value).name);
        });

        // Modal.
        document.getElementById("dm-form").addEventListener("submit", submitModal);
        document.getElementById("dm-cancel").addEventListener("click", closeModal);
        document.getElementById("dm-modal").addEventListener("click", function (event) {
            if (event.target.id === "dm-modal") closeModal();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && editing && !document.querySelector(".dm-tab input")) closeModal();
        });
        document.getElementById("dm-form").addEventListener("input", refreshPreview);
        document.getElementById("dm-form").addEventListener("change", refreshPreview);
        document.getElementById("dm-form").addEventListener("click", function (event) {
            const add = event.target.closest("[data-add]");
            if (add) {
                if (add.getAttribute("data-add") === "pre") {
                    const host = document.getElementById("dm-pre-rows");
                    if (host.children.length >= 5) return;
                    host.insertAdjacentHTML("beforeend", preRowHtml("", ""));
                } else {
                    const host = document.getElementById("dm-degree-rows");
                    if (host.children.length >= 20) return;
                    // Insert before the last row so "and above" stays last.
                    host.lastElementChild.insertAdjacentHTML("beforebegin", degreeRowHtml("", ""));
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

    function init() {
        restore();
        bind();
        render();
        refreshSavedList();
        window.DmScreen = { getScreen: function () { return screen; } };
    }

    document.addEventListener("DOMContentLoaded", init);
})();
