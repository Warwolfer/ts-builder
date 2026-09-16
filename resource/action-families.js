// Which family of roll each action belongs to.
//
// Consumed by BuildSheet (for the Lethal / Blessed / Combat Focus passive
// splices) and by shared/plan-queue.js, which is pure and cannot construct a
// BuildSheet. Lives here rather than being derived from actions.js because the
// attack family cannot be expressed as a query: it includes Protect, Counter,
// Ultra Protect and Ultra Counter, which are Defense-category actions.
//
// test/action-families.test.js pins mainAction to use.includes("main").
const ActionFamilies = (function () {
    // Attacks that take the Lethal and Combat Focus modifiers.
    const attack = [
        "attack", "counter", "protect", "ultra-protect", "ultra-counter",
        "stable-attack", "burst-attack", "sneak-attack", "critical-attack",
        "sharp-attack", "reckless-attack",
    ];
    const heal = ["heal", "power-heal"];
    const buff = ["buff", "power-buff"];

    // Everything occupying the Main Action slot: the 15 actions whose roll is
    // "MR + WR + other bonuses". Equal to use.includes("main") in actions.js.
    const mainAction = attack.concat(heal, buff);

    // The three cards in #saveschecks have no actions.js entry, so queue rows
    // built from them carry these reserved lookups. The "@" prefix cannot
    // collide with a real lookup. They only ever consume buffs, never produce.
    const save = ["@save"];
    const masteryCheck = ["@mastery-check"];
    const expertiseCheck = ["@expertise-check"];

    // customCheck has no entry here on purpose: every other family is a fixed
    // list of lookups, but a custom action is its own id (@custom:<id>), so
    // there is no list to put it in. familiesOf recognizes the @custom:
    // prefix directly instead of matching against ALL.
    const ALL = {
        attack: attack,
        heal: heal,
        buff: buff,
        mainAction: mainAction,
        save: save,
        masteryCheck: masteryCheck,
        expertiseCheck: expertiseCheck,
    };

    // Which family a custom action's roll belongs to depends on the type the
    // player lit on the card, not on the lookup — the same pasted action can
    // be rolled as a Fortitude save or as a Mastery check. That is why
    // familiesOf takes the row and not just a lookup string.
    const CUSTOM_KIND_FAMILY = {
        fortitude: "save",
        reflex: "save",
        will: "save",
        mastery: "masteryCheck",
        expertise: "expertiseCheck",
    };

    // A lookup belongs to several families at once — Reckless Attack is both
    // "attack" and "mainAction" — so this returns all of them.
    //
    // Accepts either a lookup string (every existing caller) or a row object
    // with a .lookup and, for a custom row, a .kind — a bare string has no
    // kind to read, so it can only ever report "customCheck".
    function familiesOf(rowOrLookup) {
        const row = typeof rowOrLookup === "string" ? { lookup: rowOrLookup } : (rowOrLookup || {});
        const lookup = row.lookup;

        if (typeof lookup === "string" && lookup.indexOf("@custom:") === 0) {
            const family = CUSTOM_KIND_FAMILY[row.kind];
            return family ? ["customCheck", family] : ["customCheck"];
        }

        const out = [];
        for (const name of Object.keys(ALL)) {
            if (ALL[name].indexOf(lookup) !== -1) out.push(name);
        }
        return out;
    }

    // Returning ALL itself (plus familiesOf) rather than restating the seven
    // keys in a second literal: familiesOf() reads ALL, so a family added only
    // to a hand-restated return object would be invisible to it — appliesTo
    // would silently never match, and the appliesTo test validates against
    // this same returned object, so it would pass regardless.
    return Object.assign({}, ALL, { familiesOf: familiesOf });
})();

window.ActionFamilies = ActionFamilies;
