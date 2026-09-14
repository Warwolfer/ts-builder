// The one nav bar. Every page used to carry its own pasted copy of this
// markup, so adding a link meant editing seven files and hoping none was
// missed. Now each page holds <div id="site-nav"></div> and this fills it.
//
// The markup is unchanged from what the pages had, so the rules in app.css
// (#mw-navigation, .navbar-brand, .nav-left, .link) apply untouched. Links are
// relative, so a local copy of the site works as well as terrarp.com/build/.
const SiteNav = (function () {
    // Which nav entry a page belongs to. The whole build flow is one entry.
    const PAGES = {
        "index.html": "planner",
        "mastery-selector.html": "planner",
        "expertise-selector.html": "planner",
        "rank-selector.html": "planner",
        "action-selector.html": "planner",
        "build-sheet.html": "planner",
        "saved-builds.html": "saved",
        "dm-screen.html": "dm",
    };

    const LINKS = [
        { key: "planner", href: "index.html", label: "Build Planner", color: "#47cbdd" },
        { key: "saved", href: "saved-builds.html", label: "Saved Builds", color: "#f97316" },
        { key: "dm", href: "dm-screen.html", label: "DM Screen", color: "#a78bfa" },
    ];

    function render(currentFile) {
        const active = PAGES[String(currentFile || "")] || null;
        const links = LINKS.map(function (link) {
            const cls = link.key === active ? ' class="active"' : "";
            return '<div class="link"><a' + cls + ' href="' + link.href +
                '" style="color:' + link.color + '">' + link.label + "</a></div>";
        }).join("\n        ");

        return '<nav id="mw-navigation" class="fixed-top">\n' +
            '    <div class="container">\n' +
            '      <a href="https://terrarp.com/build/" class="navbar-brand">\n' +
            '        <img src="https://terrarp.com/db/logo/logo-xs.png">\n' +
            "      </a>\n" +
            '      <div class="nav-left">\n' +
            "        " + links + "\n" +
            "      </div>\n" +
            "    </div>\n" +
            "  </nav>";
    }

    // The file name of the page being viewed, from the URL. "" at a directory
    // root (terrarp.com/build/), which index.html handles by being the
    // default.
    function currentFileFromLocation() {
        if (typeof location === "undefined") return "";
        const segments = String(location.pathname || "").split("/");
        return segments[segments.length - 1] || "index.html";
    }

    function mount(currentFile) {
        if (typeof document === "undefined") return;
        const host = document.getElementById("site-nav");
        if (!host) return;
        host.innerHTML = render(currentFile === undefined ? currentFileFromLocation() : currentFile);
    }

    return { PAGES: PAGES, render: render, mount: mount };
})();

if (typeof window !== "undefined") {
    window.SiteNav = SiteNav;
    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () { SiteNav.mount(); });
        } else {
            SiteNav.mount();
        }
    }
}
