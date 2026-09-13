// Closes the last cache gap: an HTML page the browser kept from before an
// upload references old stamped assets, so it works, but it is old and cannot
// know a newer build exists. This asks the server for version.json past every
// cache and reloads once when the build differs. A reload revalidates the HTML
// with the server, and the new HTML's new stamps pull the new JS and CSS.
//
// Must be loaded after shared/app-version.js (which defines window.TS_BUILD).
(function () {
    "use strict";

    var KEY = "tsbuilder_reloaded_for";

    // Pure, so it is unit-tested. reloadedFor is the build this tab already
    // reloaded for; a second reload for the same build would loop forever if
    // the upload were half done (version.json new, HTML still old).
    function shouldReload(current, fetched, reloadedFor) {
        return !!fetched && fetched !== current && reloadedFor !== fetched;
    }

    function probe() {
        if (typeof fetch !== "function" || typeof location === "undefined") return;
        // Random query defeats the browser cache and Cloudflare; no-cache
        // forces a revalidation for good measure. Relative, so it works at
        // terrarp.com/build/ and on a local copy alike.
        fetch("version.json?_=" + Date.now(), { cache: "no-cache" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var build = data && data.build;
                var seen = null;
                try { seen = sessionStorage.getItem(KEY); } catch (e) { /* private mode */ }
                if (!shouldReload(window.TS_BUILD, build, seen)) return;
                // If the guard cannot be written, do not reload: without it the
                // next load would reload again, forever.
                try { sessionStorage.setItem(KEY, build); } catch (e) { return; }
                location.reload();
            })
            .catch(function () { /* offline or blocked: nothing to do */ });
    }

    window.UpdateCheck = { shouldReload: shouldReload, probe: probe };

    if (typeof document !== "undefined" && document.addEventListener) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", probe);
        } else {
            probe();
        }
    }
})();
