// TerraSphere - Saved Builds Store
// Vanilla IndexedDB wrapper for persisting saved builds in the browser.
// Exposed as window.SavedBuildsStore. No DOM dependencies.

const SavedBuildsStore = (() => {
  const DB_NAME = "tsbuilder-db";
  const DB_VERSION = 1;
  const STORE_NAME = "saved-builds";

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, mode);
          const store = transaction.objectStore(STORE_NAME);
          let result;
          const req = fn(store);
          if (req) req.onsuccess = () => (result = req.result);
          transaction.oncomplete = () => resolve(result);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        }),
    );
  }

  // Return all saved builds, newest first.
  function getAll() {
    return tx("readonly", (store) => store.getAll()).then((records) =>
      (records || []).sort((a, b) => b.createdAt - a.createdAt),
    );
  }

  // Insert or update a record (put-based, keyed by id).
  function save(record) {
    return tx("readwrite", (store) => store.put(record));
  }

  // Delete a record by id.
  function remove(id) {
    return tx("readwrite", (store) => store.delete(id));
  }

  // Generate a unique id for a new record.
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

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
    getAll,
    save,
    delete: remove,
    generateId,
    formatTimestamp,
    computeDefaultName,
  };
})();

if (typeof window !== "undefined") {
  window.SavedBuildsStore = SavedBuildsStore;
}
