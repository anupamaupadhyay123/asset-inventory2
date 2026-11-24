(function () {
  "use strict";
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const label = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const canEmp = () => { try { return typeof can === "function" ? can("asset_employee_edit") : true; } catch (e) { return true; } };
  function inject() {
    if (!canEmp()) return;
    document.querySelectorAll('button[data-action="photos"][data-asset-id]').forEach((p) => {
      const menu = p.parentElement;
      if (!menu || menu.querySelector('[data-action="edit-employee"]')) return;
      if (!/return/i.test(menu.textContent)) return;
      const e = document.createElement("button");
      e.type = "button";
      e.className = p.className;
      e.dataset.action = "edit-employee";
      e.dataset.assetId = p.dataset.assetId;
      e.textContent = "Edit Employee";
      menu.insertBefore(e, menu.firstElementChild);
    });
  }
  let timer;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(inject, 50); })
    .observe(document.body, { childList: true, subtree: true });
  inject();

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest('[data-action="edit-employee"]');
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    openForm(btn.dataset.assetId);
  }, true);

  async function openForm(assetId) {
    try {
      const d = await (await fetch("/api/assets/assignment-edit/" + encodeURIComponent(assetId))).json();
      if (!d.success) return alert(d.message || "Could not load employee details.");
      showModal(assetId, d.fields);
    } catch (e) {
      alert("Could not load employee details.");
    }
  }

  function showModal(assetId, fields) {
    const old = document.getElementById("employeeEditModal");
    if (old) old.remove();
    const rows = Object.keys(fields).map((k) => {
      const isDate = /date/.test(k);
      const val = isDate ? String(fields[k] || "").slice(0, 10) : fields[k];
      return '<label style="display:flex;flex-direction:column;font-size:16px;font-weight:600;gap:6px">' + esc(label(k)) + (k === "employee_name" ? " *" : "") +
        '<input data-k="' + esc(k) + '" type="' + (isDate ? "date" : "text") + '" value="' + esc(val) +
        '" style="padding:12px;border:1px solid #ccc;border-radius:8px;font-size:17px;font-weight:400"></label>';
    }).join("");
    const m = document.createElement("div");
    m.id = "employeeEditModal";
    m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:12px";
    m.innerHTML = '<form style="background:#fff;color:#222;border-radius:10px;padding:28px;width:min(960px,96vw);max-height:90vh;overflow:auto">' +
      '<h3 style="margin:0 0 18px;font-size:24px">Edit Employee Details: ' + esc(assetId) + '</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px">' + rows + '</div>' +
      '<p id="eeMsg" style="color:#c0392b;margin:10px 0 0;min-height:18px"></p>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">' +
      '<button type="button" id="eeCancel" style="padding:12px 24px;font-size:16px">Cancel</button>' +
      '<button type="submit" style="padding:12px 24px;font-size:16px;background:#1f6feb;color:#fff;border:0;border-radius:6px">Save Changes</button></div></form>';
    document.body.appendChild(m);
    m.querySelector("#eeCancel").onclick = () => m.remove();
    m.querySelector("form").onsubmit = async (ev) => {
      ev.preventDefault();
      const msg = m.querySelector("#eeMsg");
      const body = {};
      m.querySelectorAll("input[data-k]").forEach((i) => {
        const v = i.value.trim();
        body[i.dataset.k] = v;
      });
      try {
        const r = await fetch("/api/assets/assignment-edit/" + encodeURIComponent(assetId), {
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


