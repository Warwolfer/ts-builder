"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { load } = require("./helpers/load.js");

const { BuildEncoder: BE } = load();

// First real code supplied by the user (Lune, 6m/6e/11a, full char data).
const REF =
  "MzgsMjIsMTQsMTEsMjQsM3wyMjIyMjJ8NywxMywzMCwzLDgsMnwyMjIyMjJ8aHwzfGN8MnwzfDMsNCw1LDEyLDEzLDE4LDI1LDI2LDU0LDU1LDcxfG46THVuZSZyOkh1bWFuJnQ64p2uX0FsZV9RdWVlbl/ina8mYzoyNzA2JmI6MTM1LmpwZz8xNzcyOTEwOTc3JmE6aHR0cHMlM0ElMkYlMkZ0ZXJyYXJwLmNvbSUyRmRhdGElMkZhdmF0YXJzJTJGbSUyRjAlMkYxMzUuanBnJTNGMTc3MTMyMjc3MCZuZzox";

// Game fields we assert on for round-trip identity.
const GAME_FIELDS = [
  "chosenMasteries",
  "chosenMasteriesRanks",
  "chosenExpertise",
  "chosenExpertiseRanks",
  "armorType",
  "armorRank",
  "accessoryType",
  "accessoryRank",
  "weaponRank",
  "chosenActions",
];
const CHAR_FIELDS = [
  "characterName",
  "characterRace",
  "characterTitle",
  "threadCode",
  "note",
  "profileBannerUrl",
  "avatarUrl",
  "ng",
];

function pick(obj, keys) {
  const o = {};
  for (const k of keys) o[k] = obj[k];
  return o;
}
// Full URL with baseURL; strip to the code after the hash.
function codeOf(url) {
  const i = url.indexOf("#import.");
  return i >= 0 ? url.slice(i + "#import.".length) : url;
}
function legacyCode(state) {
  return codeOf(BE.generateCompactBuildCode(state));
}
function packedCode(state) {
  return codeOf(
    BE.generateCompactBuildCode(state, "https://terrarp.com/build/", { pack: true }),
  );
}

// The reference-decoded state (used to drive re-encoding).
const refState = BE.decodeBuildString(REF);

const STATES = {
  reference: refState,
  minimal: {
    chosenMasteries: ["power"],
    chosenMasteriesRanks: [3],
    chosenExpertise: [],
    chosenExpertiseRanks: [],
    armorType: null,
    armorRank: 0,
    accessoryType: null,
    accessoryRank: 0,
    weaponRank: 0,
    chosenActions: [],
    characterName: "",
  },
  sixSix: {
    chosenMasteries: [
      "power", "guard-arts", "illusion-magic", "hemomancy", "aeromancy", "cryomancy",
    ],
    chosenMasteriesRanks: [5, 4, 3, 3, 4, 2],
    chosenExpertise: [
      "acrobatics", "coordination", "fine-arts", "blacksmithing", "architecture", "academia",
    ],
    chosenExpertiseRanks: [3, 2, 1, 2, 3, 4],
    armorType: "heavy",
    armorRank: 3,
    accessoryType: "utility",
    accessoryRank: 2,
    weaponRank: 4,
    chosenActions: ["attack", "rush", "heal", "empower"],
    characterName: "Y",
  },
  equipmentOnly: {
    chosenMasteries: ["power"],
    chosenMasteriesRanks: [1],
    chosenExpertise: [],
    chosenExpertiseRanks: [],
    armorType: "light",
    armorRank: 5,
    accessoryType: "magic",
    accessoryRank: 4,
    weaponRank: 3,
    chosenActions: [],
    characterName: "",
  },
};

// 1. Legacy baseline — reference decodes to the expected values (passes today).
test("legacy reference decodes to expected fields", () => {
  const d = BE.decodeBuildString(REF);
  assert.deepStrictEqual(d.chosenMasteries, [
    "metamorph", "animancy", "power", "astramancy", "harmonic-magic", "beast-arts",
  ]);
  assert.deepStrictEqual(d.chosenMasteriesRanks, [2, 2, 2, 2, 2, 2]);
  assert.strictEqual(d.chosenExpertise.length, 6);
  assert.strictEqual(d.armorType, "heavy");
  assert.strictEqual(d.armorRank, 3);
  assert.strictEqual(d.accessoryType, "combat");
  assert.strictEqual(d.weaponRank, 3);
  assert.strictEqual(d.chosenActions.length, 11);
});

// 2. Marker routing.
test("packed code starts with '!'; legacy does not", () => {
  assert.strictEqual(packedCode(STATES.sixSix)[0], "!");
  assert.notStrictEqual(legacyCode(STATES.sixSix)[0], "!");
});

// 3. Round-trip identity: game + char fields.
for (const [name, state] of Object.entries(STATES)) {
  test(`round-trip identity (${name})`, () => {
    const viaLegacy = BE.decodeBuildString(legacyCode(state));
    const viaPacked = BE.decodeBuildString(packedCode(state));
    assert.deepStrictEqual(
      pick(viaPacked, GAME_FIELDS),
      pick(viaLegacy, GAME_FIELDS),
    );
    assert.deepStrictEqual(
      pick(viaPacked, CHAR_FIELDS),
      pick(viaLegacy, CHAR_FIELDS),
    );
  });
}

// 4. Packed is shorter.
test("packed code is shorter than legacy", () => {
  assert.ok(packedCode(refState).length < legacyCode(refState).length);
  assert.ok(packedCode(STATES.sixSix).length < legacyCode(STATES.sixSix).length);
});

// 5. Equipment ranks + null types preserved.
test("equipment ranks and null types round-trip", () => {
  const d = BE.decodeBuildString(packedCode(STATES.equipmentOnly));
  assert.strictEqual(d.armorType, "light");
  assert.strictEqual(d.armorRank, 5);
  assert.strictEqual(d.accessoryType, "magic");
  assert.strictEqual(d.accessoryRank, 4);
  assert.strictEqual(d.weaponRank, 3);
  const dm = BE.decodeBuildString(packedCode(STATES.minimal));
  assert.strictEqual(dm.armorType, null);
  assert.strictEqual(dm.accessoryType, null);
});

// 6. attack/rush retained (unlike embedcode).
test("packed build code keeps attack and rush", () => {
  const d = BE.decodeBuildString(packedCode(STATES.sixSix));
  assert.ok(d.chosenActions.includes("attack"));
  assert.ok(d.chosenActions.includes("rush"));
});

// 7. Reference packs + round-trips exactly.
test("reference re-packed round-trips all game fields", () => {
  const repacked = BE.decodeBuildString(packedCode(refState));
  assert.deepStrictEqual(
    pick(repacked, GAME_FIELDS),
    pick(refState, GAME_FIELDS),
  );
});

// 8. Phase-1 safety: legacy code still decodes with the packed path present.
test("legacy code still decodes after packed path exists", () => {
  const d = BE.decodeBuildString(REF);
  assert.strictEqual(d.characterName, "Lune");
  assert.strictEqual(d.chosenMasteries[0], "metamorph");
});
