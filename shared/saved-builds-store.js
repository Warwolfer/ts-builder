// TerraSphere - Saved Builds Store
// Vanilla IndexedDB wrapper for the builder's browser-side records. Exposed as
// window.SavedBuildsStore and window.SavedScreensStore. No DOM dependencies.
//
// One database, two object stores. The file keeps its original name because
// every page already loads it by that name; renaming would touch seven pages
// for nothing. DB_VERSION went 1 -> 2 when saved-screens was added; the
// upgrade only creates what is missing, so existing saved builds are never
// touched.

const SavedStoreShared = (() => {
  const DB_NAME = "tsbuilder-db";
  const DB_VERSION = 2;
  const STORES = ["saved-builds", "saved-screens"];

  let dbPromise = null;

  // Creates whatever object stores the database does not have yet. Pure over
  // the db handle it is given, so the upgrade path can be tested without an
  // IndexedDB.
  function ensureStores(db) {
    for (const name of STORES) {
      if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, { keyPath: "id" });
      }
    }
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => ensureStores(event.target.result);
      request.onsuccess = () => {
        // A later version bump in another tab must not find THIS tab
        // holding the database open. Closing here is what keeps that
        // upgrade from blocking; it cannot help the current one,
        // because the tab blocking us is running older code.
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      // Without this the promise neither resolves nor rejects and every
      // caller waits forever, silently.
      request.onblocked = () => reject(new Error(
        "Another TerraSphere tab is open with an older version. Close it and reload this page."
      ));
    });
    return dbPromise;
  }

  function tx(storeName, mode, fn) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, mode);
          const store = transaction.objectStore(storeName);
          let result;
          const req = fn(store);
          if (req) req.onsuccess = () => (result = req.result);
          transaction.oncomplete = () => resolve(result);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        }),
    );
  }

  // The CRUD trio for one object store, newest first on read.
  function makeStore(storeName) {
    return {
      getAll() {
        return tx(storeName, "readonly", (store) => store.getAll()).then((records) =>
          (records || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
        );
      },
      save(record) {
        return tx(storeName, "readwrite", (store) => store.put(record));
      },
      delete(id) {
        return tx(storeName, "readwrite", (store) => store.delete(id));
      },
    };
  }

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  return { DB_VERSION, STORES, ensureStores, makeStore, generateId };
})();

const SavedBuildsStore = (() => {
  const store = SavedStoreShared.makeStore("saved-builds");

  // Format an epoch-ms timestamp as MM-DD-YYYY HH:MM:SS (local time).
  function formatTimestamp(epochMs) {
    const d = new Date(epochMs);
    const p = (n) => String(n).padStart(2, "0");
    const date = `${p(d.getMonth() + 1)}-${p(d.getDate())}-${d.getFullYear()}`;
    const time = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    return `${date} ${time}`;
  }

  // Compute the default display name for a build.
  // title = threadName || threadCode || "Unnamed Build <timestamp>"
  // name  = note ? `${title} - ${note}` : title
  function computeDefaultName({ threadName, threadCode, note, createdAt }) {
    const cleanName = (threadName || "").trim();
    const cleanCode = (threadCode || "").trim();
    const cleanNote = (note || "").trim();
    const title =
      cleanName ||
      cleanCode ||
      `Unnamed Build ${formatTimestamp(createdAt || Date.now())}`;
    return cleanNote ? `${title} - ${cleanNote}` : title;
  }

  return {
    getAll: store.getAll,
    save: store.save,
    delete: store.delete,
    generateId: SavedStoreShared.generateId,
    formatTimestamp,
    computeDefaultName,
  };
})();

const SavedScreensStore = (() => {
  const store = SavedStoreShared.makeStore("saved-screens");
  return {
    getAll: store.getAll,
    save: store.save,
    delete: store.delete,
    generateId: SavedStoreShared.generateId,
  };
})();

if (typeof window !== "undefined") {
  window.SavedBuildsStore = SavedBuildsStore;
  window.SavedScreensStore = SavedScreensStore;
  window.SavedStoreInternals = {
    DB_VERSION: SavedStoreShared.DB_VERSION,
    STORES: SavedStoreShared.STORES,
    ensureStores: SavedStoreShared.ensureStores,
  };
}
