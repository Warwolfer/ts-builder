// TerraSphere - Saved Builds page logic
// Renders the saved builds list and wires load / rename / delete actions.

(function () {
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function render(records) {
    const list = document.getElementById("saved-builds-list");
    if (!list) return;

    if (!records || records.length === 0) {
      list.innerHTML = `<p class="saved-builds-empty">No saved builds yet.</p>`;
      return;
    }

    list.innerHTML = records
      .map(
        (r) => `
        <div class="saved-build-row" data-id="${escapeHtml(r.id)}">
          <span class="saved-build-name" data-action="load">${escapeHtml(r.name)}</span>
          <div class="saved-build-actions">
            <button class="saved-build-edit" data-action="rename" title="Rename">&#9998;</button>
            <button class="saved-build-delete" data-action="delete" title="Delete">&#128465;</button>
          </div>
        </div>`,
      )
      .join("");
  }

  async function refresh() {
    const records = await window.SavedBuildsStore.getAll();
    render(records);
    return records;
  }

  function loadBuild(record) {
    window.location.href = "index.html#import." + record.buildCode;
  }

  async function renameBuild(record) {
    const next = window.prompt("Build name:", record.name);
    if (next === null) return; // cancelled
    const name = next.trim() || record.name;
    record.name = name;
    await window.SavedBuildsStore.save(record);
    await refresh();
  }

  async function deleteBuild(record) {
    const ok = window.confirm(`Delete "${record.name}"?`);
    if (!ok) return;
    await window.SavedBuildsStore.delete(record.id);
    await refresh();
  }

  async function init() {
    const list = document.getElementById("saved-builds-list");
    if (!list) return;

    let records = await refresh();

    list.addEventListener("click", async (e) => {
      const row = e.target.closest(".saved-build-row");
      if (!row) return;
      const id = row.getAttribute("data-id");
      const record = records.find((r) => r.id === id);
      if (!record) return;

      const action = e.target.getAttribute("data-action");
      if (action === "load") {
        loadBuild(record);
      } else if (action === "rename") {
        await renameBuild(record);
        records = await window.SavedBuildsStore.getAll();
      } else if (action === "delete") {
        await deleteBuild(record);
        records = await window.SavedBuildsStore.getAll();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
