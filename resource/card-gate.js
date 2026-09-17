// One rule for "is this card ready to roll": a card that offers a mastery or
// type choice and has none lit is not. Plan Mode's + button and every card's
// click-to-copy roll code both gate on it, so it lives here rather than in
// either of them.
//
// Clicking an icon is what unblocks a card, and the icons have their own
// inline onclick handlers, so a single document-level listener watches for
// those clicks on the way up and runs every registered callback.
const CardGate = (function () {
    // Every container that holds cards with roll codes.
    const CONTAINER_IDS = ["freeactiondisplay", "actionsdisplay", "saveschecks", "customdisplay"];

    // A card that offers a choice but has none lit. The Saves and Expertise
    // Check cards light a save type and an expertise, not a mastery, so name
    // what the card is actually asking for.
    //
    // A custom card whose k lists only mastery and/or expertise, on a
    // character with none chosen, has no icons to offer at all — iconsHtml
    // returns "" — so the icons.length check below would never see it and the
    // roll code would stay unlocked with its placeholders unfilled.
    // data-requires-pick (resource/custom-cards.js, cardHtml) flags that card
    // so it is caught here first.
    function addBlockedReason(card) {
        if (card.getAttribute("data-requires-pick") === "1" &&
            !card.querySelector(".masterycircle.active-glow")) {
            return "This action needs a mastery or expertise you have not chosen";
        }
        const icons = card.querySelectorAll(".masterycircle");
        if (icons.length && !card.querySelector(".masterycircle.active-glow")) {
            return icons[0].getAttribute("data-mastery")
                ? "Choose a mastery first"
                : "Choose a type first";
        }
        return null;
    }

    const listeners = [];
    function onChange(fn) {
        listeners.push(fn);
    }

    // Runs every callback, but on a fresh task rather than inline.
    //
    // A built-in card's icons carry an inline `onclick` (resource/build-sheet.js
    // writes `onclick='clickMastery(this)'` into the markup), which runs AT THE
    // TARGET before the click ever reaches the document listener below — so the
    // glow is already applied and the callbacks read a finished card.
    //
    // A custom card's icons have no inline handler. They are driven by
    // resource/custom-cards.js's own document listener, which is registered
    // AFTER this one and so runs AFTER it. Calling the callbacks inline read
    // those cards one click behind: pick an expertise and the + button stayed
    // greyed out (while still working, because the click handler re-checks
    // live), then caught up only when you picked something else.
    //
    // A timeout, not a promise: a microtask checkpoint runs between the
    // listeners of a single dispatch, so a microtask would still land before
    // custom-cards' handler. A timeout is a new task and always runs after the
    // whole dispatch, whatever order the listeners happened to register in.
    //
    // Coalesced, so a burst of clicks costs one pass.
    let queued = false;
    function notifyChanged() {
        if (queued) return;
        queued = true;
        const run = function () {
            queued = false;
            for (let i = 0; i < listeners.length; i++) listeners[i]();
        };
        if (typeof setTimeout === "function") setTimeout(run, 0);
        else run();
    }

    let installed = false;
    function install() {
        if (installed || typeof document === "undefined" || !document.addEventListener) return;
        installed = true;
        document.addEventListener("click", function (event) {
            if (event.target.closest && event.target.closest(".masterycircle")) {
                notifyChanged();
            }
        });
    }

    // Marks every unready roll code so copyRollCode can refuse it and the
    // player can see why. Runs after the cards render and after every icon
    // click. Cheap: a handful of querySelectors per card.
    function syncRollCodes() {
        if (typeof document === "undefined") return;
        for (let c = 0; c < CONTAINER_IDS.length; c++) {
            const container = document.getElementById(CONTAINER_IDS[c]);
            if (!container) continue;
            const cards = container.querySelectorAll(".card");
            for (let i = 0; i < cards.length; i++) {
                const code = cards[i].querySelector(".rollcode");
                if (!code) continue;
                const reason = addBlockedReason(cards[i]);
                code.classList.toggle("locked", !!reason);
                code.title = reason || "Click to copy";
                // The roll code is a div with an onclick, so there is no
                // disabled state to set. aria-disabled is what tells a screen
                // reader the click will be refused.
                if (reason) code.setAttribute("aria-disabled", "true");
                else code.removeAttribute("aria-disabled");
            }
        }
    }

    onChange(syncRollCodes);

    return {
        addBlockedReason: addBlockedReason,
        onChange: onChange,
        notifyChanged: notifyChanged,
        install: install,
        syncRollCodes: syncRollCodes,
        CONTAINER_IDS: CONTAINER_IDS,
    };
})();

window.CardGate = CardGate;
