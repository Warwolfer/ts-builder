"use strict";
// Load the browser-style shared/resource files under Node with a minimal window
// shim (no jsdom). The data files do `const x=[...]; window.x=x;` and the codecs
// do `window.X = X;` — assigning onto global.window, which we require to exist
// before loading them.
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

function load() {
  global.window = global.window || {};
  global.window.location = global.window.location || { pathname: "/build/" };
  global.window.navigator = global.window.navigator || { userAgent: "node" };
  if (typeof global.btoa !== "function") {
    global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
  }
  if (typeof global.atob !== "function") {
    global.atob = (s) => Buffer.from(s, "base64").toString("binary");
  }

  const files = [
    "resource/safecharacters.js",
    "resource/masteries.js",
    "resource/expertise.js",
    "resource/actions.js",
    "shared/embedcode.js",
    "shared/buildpack.js", // may not exist yet — tolerated below
    "shared/build-encoder.js",
    "shared/calculations.js",
  ];
  for (const f of files) {
    try {
      require(path.join(ROOT, f));
    } catch (e) {
      if (e && e.code === "MODULE_NOT_FOUND" && /buildpack/.test(String(e))) {
        continue; // buildpack.js not implemented yet; tests that need it will fail
      }
      throw e;
    }
  }

  return {
    BuildEncoder: global.window.BuildEncoder,
    BuildPack: global.window.BuildPack,
    masteries: global.window.masteries,
    expertise: global.window.expertise,
    actionlist: global.window.actionlist,
  };
}

module.exports = { load, ROOT };
