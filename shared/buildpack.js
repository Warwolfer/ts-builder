// buildpack — v1 bit-packed build code (format spec:
// docs/superpowers/plans/2026-07-05-buildcode-bitpack.md).
//
// This IS the builder's share/import code, unlike shared/embedcode.js which is
// a separate, embed-only format. Two consequences: nothing is dropped (attack
// and rush are kept, unlike the embed code) and the character-data segment
// rides along verbatim, so a packed code round-trips builder state exactly.
//
// Format: "!" + base64url(gameBytes ++ charDataUtf8)
//
// The "!" marker is outside the base64url alphabet ([A-Za-z0-9_-]) and distinct
// from the embed code's "~", so its presence alone selects the packed decode
// path. Codes without it are legacy CSV codes and decode as they always have.
//
// No length prefix is needed: the reader consumes an exact bit count derived
// from the counts it reads, so gameByteLen = ceil(bitsRead / 8) and the char
// data is whatever bytes follow.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BuildPack = api;
})(this, function () {
  "use strict";

  const VERSION = 1;
  const MARKER = "!";

  // Index -> value, and the single letter the legacy segment uses.
  const ARMOR = [null, "heavy", "medium", "light"]; // 2 bits
  const ACCESSORY = [null, "combat", "utility", "magic"]; // 2 bits

  // Bit widths
  const W_VER = 4;
  const W_MCOUNT = 3, W_MID = 6, W_RANK = 3; // mastery (max id 41)
  const W_ECOUNT = 3, W_EID = 6; // expertise (max id 33); rank reuses W_RANK
  const W_ARMT = 2, W_ACCT = 2; // equipment type codes
  const W_ACOUNT = 5, W_AID = 9; // actions (max id 71, room to 511)

  function BitWriter() {
    this.bits = [];
  }
  BitWriter.prototype.write = function (value, n) {
    const v = value | 0;
    for (let i = n - 1; i >= 0; i--) this.bits.push((v >> i) & 1);
  };
  BitWriter.prototype.bytes = function () {
    const out = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] || 0);
      out.push(b);
    }
    return out;
  };

  function BitReader(bytes) {
    this.bits = [];
    for (let i = 0; i < bytes.length; i++) {
      for (let j = 7; j >= 0; j--) this.bits.push((bytes[i] >> j) & 1);
    }
    this.pos = 0;
  }
  BitReader.prototype.read = function (n) {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | (this.bits[this.pos++] || 0);
    return v;
  };
  // Bytes consumed so far, rounded up — where the char data starts.
  BitReader.prototype.byteLength = function () {
    return Math.ceil(this.pos / 8);
  };

  function toBase64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromBase64url(s) {
    let b = s.replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4 !== 0) b += "=";
    const bin = atob(b);
    const out = new Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // UTF-8 <-> byte array, via percent-encoding so no TextEncoder is required
  // (matches how the legacy encoder gets UTF-8 bytes before base64).
  function utf8Bytes(str) {
    const bin = encodeURIComponent(String(str)).replace(
      /%([0-9A-F]{2})/gi,
      (m, hex) => String.fromCharCode(parseInt(hex, 16)),
    );
    const out = new Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
    return out;
  }
  function utf8String(bytes) {
    let pct = "";
    for (let i = 0; i < bytes.length; i++) {
      pct += "%" + ("00" + bytes[i].toString(16)).slice(-2);
    }
    return decodeURIComponent(pct);
  }

  const clampRank = (r) => {
    const n = Number(r) || 0;
    return n < 0 ? 0 : n > 7 ? 7 : n;
  };
  const idMap = (list) => {
    const m = Object.create(null);
    for (const o of list || []) m[o.lookup] = o.id;
    return m;
  };

  // refs = { masteries, expertise, actionlist } (the data arrays).
  // Returns the game-field bytes only; char data is appended by encode().
  function packGameData(state, refs) {
    const mId = idMap(refs.masteries);
    const eId = idMap(refs.expertise);
    const aId = idMap(refs.actionlist);
    const w = new BitWriter();
    w.write(VERSION, W_VER);

    const masts = (state.chosenMasteries || []).slice(0, 7);
    w.write(masts.length, W_MCOUNT);
    masts.forEach((lk, i) => {
      w.write(mId[lk] || 0, W_MID);
      w.write(clampRank((state.chosenMasteriesRanks || [])[i]), W_RANK);
    });

    const exps = (state.chosenExpertise || []).slice(0, 7);
    w.write(exps.length, W_ECOUNT);
    exps.forEach((lk, i) => {
      w.write(eId[lk] || 0, W_EID);
      w.write(clampRank((state.chosenExpertiseRanks || [])[i]), W_RANK);
    });

    w.write(Math.max(0, ARMOR.indexOf(state.armorType || null)), W_ARMT);
    w.write(clampRank(state.armorRank), W_RANK);
    w.write(Math.max(0, ACCESSORY.indexOf(state.accessoryType || null)), W_ACCT);
    w.write(clampRank(state.accessoryRank), W_RANK);
    w.write(clampRank(state.weaponRank), W_RANK);

    // Unlike the embed code, keep every action including attack and rush.
    const acts = (state.chosenActions || []).slice(0, 31);
    w.write(acts.length, W_ACOUNT);
    acts.forEach((lk) => w.write(aId[lk] || 0, W_AID));

    return w.bytes();
  }

  // Unpacks the game bytes into the ten legacy pipe-delimited segments (indices
  // 0-9 of the compact format), leaving ID -> name resolution, rank parsing and
  // equipment letter expansion to the one decoder that already does all of it.
  // That keeps the packed and legacy paths from drifting apart.
  //
  // Returns { segments, byteLength }.
  function unpackGameData(bytes) {
    const r = new BitReader(bytes);

    const version = r.read(W_VER);
    if (version !== VERSION) {
      throw new Error("unsupported packed build code version " + version);
    }

    const masteryIds = [];
    const masteryRanks = [];
    const mCount = r.read(W_MCOUNT);
    for (let i = 0; i < mCount; i++) {
      masteryIds.push(r.read(W_MID));
      masteryRanks.push(r.read(W_RANK));
    }

    const expertiseIds = [];
    const expertiseRanks = [];
    const eCount = r.read(W_ECOUNT);
    for (let i = 0; i < eCount; i++) {
      expertiseIds.push(r.read(W_EID));
      expertiseRanks.push(r.read(W_RANK));
    }

    const armorType = ARMOR[r.read(W_ARMT)] || null;
    const armorRank = r.read(W_RANK);
    const accessoryType = ACCESSORY[r.read(W_ACCT)] || null;
    const accessoryRank = r.read(W_RANK);
    const weaponRank = r.read(W_RANK);

    const actionIds = [];
    const aCount = r.read(W_ACOUNT);
    for (let i = 0; i < aCount; i++) actionIds.push(r.read(W_AID));

    return {
      segments: [
        masteryIds.join(","), // 0: mastery IDs
        masteryRanks.join(""), // 1: mastery ranks
        expertiseIds.join(","), // 2: expertise IDs
        expertiseRanks.join(""), // 3: expertise ranks
        armorType ? armorType.charAt(0) : "", // 4: armor type
        armorRank, // 5: armor rank
        accessoryType ? accessoryType.charAt(0) : "", // 6: accessory type
        accessoryRank, // 7: accessory rank
        weaponRank, // 8: weapon rank
        actionIds.join(","), // 9: action IDs
      ],
      byteLength: r.byteLength(),
    };
  }

  function isPackedCode(code) {
    return typeof code === "string" && code.charAt(0) === MARKER;
  }

  // charData is the same "&"-joined string the legacy encoder builds for
  // segment 10 (may be empty).
  function encode(state, refs, charData) {
    const bytes = packGameData(state, refs).concat(utf8Bytes(charData || ""));
    return MARKER + toBase64url(bytes);
  }

  // Returns { segments, charData } — the pieces of an equivalent legacy compact
  // string, ready to be joined with "|" and handed to the legacy decoder.
  function decode(code) {
    if (!isPackedCode(code)) throw new Error("not a packed build code");
    const bytes = fromBase64url(code.slice(MARKER.length));
    const { segments, byteLength } = unpackGameData(bytes);
    return { segments, charData: utf8String(bytes.slice(byteLength)) };
  }

  return {
    encode,
    decode,
    packGameData,
    unpackGameData,
    isPackedCode,
    VERSION,
    MARKER,
    ARMOR,
    ACCESSORY,
  };
});
