// shared/pending-build.js
//
// Loading a saved build is a two-page hop: saved-builds.html sends the browser
// to index.html#import.<code>, which decodes the code into state and then
// forwards to build-sheet.html. The build code carries no custom actions — it
// is a fragment people paste into forum posts, and it must not grow — so the
// record's custom actions travel in this one localStorage key instead.
//
// Every read is defensive. The key may have been written by an older build of
// this site, and a half-written or hand-edited value must not be the thing
// that stops a build from loading.
(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.PendingBuild = api;
})(this, function () {
    "use strict";

    const KEY = "tsbuilder_pending_saved_build";

    function write(storage, payload) {
        if (!storage) return;
        try {
            storage.setItem(KEY, JSON.stringify({
                id: payload && payload.id ? String(payload.id) : null,
                customActions: Array.isArray(payload && payload.customActions)
                    ? payload.customActions : [],
            }));
        } catch (e) {
            // Private mode, a full quota, a blocked origin. The build still
            // loads; it just arrives without its custom actions.
        }
    }

    function read(storage) {
        if (!storage) return null;
        let raw = null;
        try {
            raw = storage.getItem(KEY);
        } catch (e) {
            return null;
        }
        if (!raw) return null;
        let parsed = null;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            return null;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        return {
            id: parsed.id == null ? null : String(parsed.id),
            customActions: Array.isArray(parsed.customActions) ? parsed.customActions : [],
        };
    }

    function clear(storage) {
        if (!storage) return;
        try {
            storage.removeItem(KEY);
        } catch (e) {
            // Nothing to do: a storage that refuses removal refused the write.
        }
    }

    return { KEY: KEY, write: write, read: read, clear: clear };
});
