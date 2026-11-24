(function () {
  "use strict";
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const FIELDS = [
    { k: "asset_type", l: "Asset Type", req: 1, list: 1 },
    { k: "brand", l: "Brand", req: 1, list: 1 },
    { k: "model", l: "Model" },
    { k: "serial_number", l: "Serial Number", req: 1 },
    { k: "condition", l: "Condition", req: 1, list: 1 },
    { k: "location", l: "Location", req: 1, list: 1 },
    { k: "department", l: "Department", list: 1 },
    { k: "vendor", l: "Vendor", list: 1 },
    { k: "purchase_date", l: "Purchase Date", type: "date" },
    { k: "purchase_cost", l: "Purchase Cost", type: "number" },
    { k: "warranty_expiry", l: "Warranty Expiry", type: "date" },
    { k: "remarks", l: "Remarks" }
  ];
  const canEdit = () => { try { return typeof can === "function" ? can("asset_edit") : true; } catch (e) { return true; } };

  function inject() {
    if (!canEdit()) return;
    document.querySelectorAll("button[data-asset-id]").forEach((b) => {
      const p = b.parentElement;
      if (!p || p.querySelector('[data-action="edit"]')) return;
      if (b.dataset.action === "edit") return;
      const e = document.createElement("button");
      e.type = "button";
      e.className = b.className;
      e.dataset.action = "edit";
      e.dataset.assetId = b.dataset.assetId;
      e.textContent = "Edit";
      p.insertBefore(e, p.firstElementChild);
    });
  }
  let timer;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(inject, 50); })
    .observe(document.body, { childList: true, subtree: true });
  inject();

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest('[data-action="edit"]');
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    openEdit(btn.dataset.assetId);
  }, true);

  async function openEdit(id) {
    try {
      const d = await (await fetch("/api/assets/edit-data/" + encodeURIComponent(id))).json();
      if (!d.success) return alert(d.message || "Could not load asset.");
      let all = [];
      try {
        const l = await (await fetch("/api/assets")).json();
        all = Array.isArray(l) ? l : (l.assets || l.data || []);
      } catch (e) {}
      showModal(d.asset, all);
    } catch (e) {
      alert("Could not load asset.");
    }
  }

  function showModal(a, all) {
    const old = document.getElementById("assetEditModal");
    if (old) old.remove();
    const opts = (k) => [...new Set(all.map((x) => x[k]).filter(Boolean))];
    const rows = FIELDS.filter((f) => f.req || f.k in a).map((f) => {
      const lid = "ae_list_" + f.k;
      const dl = f.list ? `<datalist id="${lid}">${opts(f.k).map((o) => `<option value="${esc(o)}">`).join("")}</datalist>` : "";
      const val = f.type === "date" ? String(a[f.k] || "").slice(0, 10) : a[f.k];
      return `<label style="display:flex;flex-direction:column;font-size:16px;font-weight:600;gap:6px">${f.l}${f.req ? " *" : ""}<input data-k="${f.k}" type="${f.type || "text"}" ${f.list ? `list="${lid}"` : ""} value="${esc(val)}" style="padding:12px;border:1px solid #ccc;border-radius:8px;font-size:17px;font-weight:400">${dl}</label>`;
    }).join("");
    const m = document.createElement("div");
    m.id = "assetEditModal";
    m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:12px";
    m.innerHTML = `<form style="background:#fff;color:#222;border-radius:10px;padding:28px;width:min(960px,96vw);max-height:90vh;overflow:auto"><h3 style="margin:0 0 18px;font-size:24px">Edit Asset: ${esc(a.asset_id)}</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px">${rows}</div><p id="aeMsg" style="color:#c0392b;margin:10px 0 0;min-height:18px"></p><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button type="button" id="aeCancel" style="padding:12px 24px;font-size:16px">Cancel</button><button type="submit" style="padding:12px 24px;font-size:16px;background:#1f6feb;color:#fff;border:0;border-radius:6px">Save Changes</button></div></form>`;
    document.body.appendChild(m);
    m.querySelector("#aeCancel").onclick = () => m.remove();
    m.querySelector("form").onsubmit = async (ev) => {
      ev.preventDefault();
      const msg = m.querySelector("#aeMsg");
      const body = {};
      m.querySelectorAll("input[data-k]").forEach((i) => {
        const v = i.value.trim();
        body[i.dataset.k] = v === "" ? null : v;
      });
      try {
        const r = await fetch("/api/assets/" + encodeURIComponent(a.asset_id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const d = await r.json();
        if (!d.success) { msg.textContent = d.message || "Save failed."; return; }
        m.remove();
        if (typeof loadAssets === "function") await loadAssets(); else location.reload();
      } catch (e) {
        msg.textContent = "Network error.";
      }
    };
  }
})();


