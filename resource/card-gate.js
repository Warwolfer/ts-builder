// One rule for "is this card ready to roll": a card that offers a mastery or
// type choice and has none lit is not. Plan Mode's + button and every card's
// click-to-copy roll code both gate on it, so it lives here rather than in
// either of them.
//
// Clicking an icon is what unblocks a card, and the icons have their own
// inline onclick handlers, so a single document-level listener watches for
// those clicks on the way up and runs every registered callback.
const CardGate = (function () {
    // Every container that holds cards with roll codes. #customdisplay does
    // not exist yet; getElementById returns null for it and it is skipped.
    const CONTAINER_IDS = ["freeactiondisplay", "actionsdisplay", "saveschecks", "customdisplay"];

    // A card that offers a choice but has none lit. The Saves and Expertise
    // Check cards light a save type and an expertise, not a mastery, so name
    // what the card is actually asking for.
    function addBlockedReason(card) {
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

    let installed = false;
    function install() {
        if (installed || typeof document === "undefined" || !document.addEventListener) return;
        installed = true;
        document.addEventListener("click", function (event) {
            if (event.target.closest && event.target.closest(".masterycircle")) {
                for (let i = 0; i < listeners.length; i++) listeners[i]();
            }
        });
    }

    // Marks every unready roll code so copyRollCode can refuse it and the
    // player can see why. Filled in by Task 3; here so the shape is stable.
    function syncRollCodes() {}

    return {
        addBlockedReason: addBlockedReason,
        onChange: onChange,
        install: install,
        syncRollCodes: syncRollCodes,
        CONTAINER_IDS: CONTAINER_IDS,
    };
})();

window.CardGate = CardGate;
