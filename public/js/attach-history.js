(function () {
  var SECTION_ID = 'signedFormsInHistory';
  var lastAssetId = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isVisible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  // Remember which asset the user clicked (History / View button)
  document.addEventListener('click', function (e) {
    if (e.target.closest('#attachFormModal')) return;
    var holder = e.target.closest('[data-asset-id]');
    if (!holder) {
      var row = e.target.closest('tr, li, .asset-row, .asset-card');
      if (row) holder = row.querySelector('[data-asset-id]');
    }
    if (holder) lastAssetId = holder.getAttribute('data-asset-id');
  }, true);

  function findHistoryHeading() {
    var nodes = document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.children.length === 0 && n.textContent.trim() === 'Assignment History' && isVisible(n)) return n;
    }
    return null;
  }

  async function fillSection(box, assetId) {
    var out = box.querySelector('.sf-list');
    try {
      var r = await fetch('/api/attachments/' + encodeURIComponent(assetId));
      var d = await r.json();
      if (!d.success || !d.attachments.length) {
        out.textContent = 'No signed form attached yet.';
        return;
      }
      out.innerHTML = d.attachments.map(function (a) {
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #e5e7eb;">' +
          '<a href="/api/attachments/files/' + encodeURIComponent(a.file_name) + '" target="_blank" style="color:#1d4ed8;word-break:break-all;">' + esc(a.original_name || a.file_name) + '</a>' +
          '<span style="color:#6b7280;font-size:12px;white-space:nowrap;">' + esc(a.uploaded_at || '') + '</span></div>';
      }).join('');
    } catch (e) {
      out.textContent = 'Could not load signed forms.';
    }
  }

  function check() {
    var heading = findHistoryHeading();
    var existing = document.getElementById(SECTION_ID);
    if (!heading) {
      if (existing) existing.remove();
      return;
    }
    if (!lastAssetId) return;
    if (existing && existing.getAttribute('data-asset') === lastAssetId && document.body.contains(existing)) return;
    if (existing) existing.remove();

    var box = document.createElement('div');
    box.id = SECTION_ID;
    box.setAttribute('data-asset', lastAssetId);
    box.style.cssText = 'margin-top:18px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:rgba(255,255,255,.6);';
    box.innerHTML = '<div style="font-weight:600;margin-bottom:6px;">Signed Issuance Forms</div><div class="sf-list" style="font-size:14px;">Loading...</div>';
    heading.parentElement.appendChild(box);
    fillSection(box, lastAssetId);
  }

  var timer = null;
  new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(check, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();