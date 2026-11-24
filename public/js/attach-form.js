(function () {
  var LABEL = 'Attach Signed Form';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function loadList(assetId) {
    var box = document.getElementById('attachFormList');
    if (!box) return;
    box.textContent = 'Loading...';
    try {
      var r = await fetch('/api/attachments/' + encodeURIComponent(assetId));
      var d = await r.json();
      if (!d.success || !d.attachments.length) {
        box.textContent = 'No signed form attached yet.';
        return;
      }
      box.innerHTML = d.attachments.map(function (a) {
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #e5e7eb;">' +
          '<a href="/api/attachments/files/' + encodeURIComponent(a.file_name) + '" target="_blank" style="color:#1d4ed8;word-break:break-all;">' + esc(a.original_name || a.file_name) + '</a>' +
          '<span style="color:#6b7280;font-size:12px;white-space:nowrap;">' + esc(a.uploaded_at || '') + '</span></div>';
      }).join('');
    } catch (e) {
      box.textContent = 'Could not load attachments.';
    }
  }

  window.openAttachModal = function (assetId) {
    var old = document.getElementById('attachFormModal');
    if (old) old.remove();

    var wrap = document.createElement('div');
    wrap.id = 'attachFormModal';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99999;display:flex;align-items:center;justify-content:center;';
    wrap.innerHTML =
      '<div style="background:#fff;border-radius:12px;padding:22px;width:460px;max-width:92vw;max-height:85vh;overflow:auto;font-family:inherit;">' +
        '<h5 style="margin:0 0 4px 0;">Signed Issuance Form</h5>' +
        '<div style="color:#6b7280;font-size:13px;margin-bottom:14px;">Asset: ' + esc(assetId) + '</div>' +
        '<input type="file" id="attachFormFile" accept=".pdf,.jpg,.jpeg,.png" style="width:100%;margin-bottom:10px;">' +
        '<div id="attachFormStatus" style="font-size:13px;min-height:18px;margin-bottom:10px;"></div>' +
        '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
          '<button id="attachFormUpload" style="background:#1d4ed8;color:#fff;border:0;border-radius:6px;padding:8px 16px;cursor:pointer;">Upload</button>' +
          '<button id="attachFormClose" style="background:#e5e7eb;border:0;border-radius:6px;padding:8px 16px;cursor:pointer;">Close</button>' +
        '</div>' +
        '<div style="font-weight:600;margin-bottom:6px;">Attached forms</div>' +
        '<div id="attachFormList" style="font-size:14px;"></div>' +
      '</div>';
    document.body.appendChild(wrap);

    document.getElementById('attachFormClose').onclick = function () { wrap.remove(); };
    wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.remove(); });

    document.getElementById('attachFormUpload').onclick = async function () {
      var status = document.getElementById('attachFormStatus');
      var f = document.getElementById('attachFormFile').files[0];
      if (!f) { status.style.color = '#b91c1c'; status.textContent = 'Please choose a file first.'; return; }
      var fd = new FormData();
      fd.append('file', f);
      status.style.color = '#374151';
      status.textContent = 'Uploading...';
      try {
        var r = await fetch('/api/attachments/' + encodeURIComponent(assetId), { method: 'POST', body: fd });
        var d = await r.json();
        if (d.success) {
          status.style.color = '#15803d';
          status.textContent = 'Signed form attached successfully.';
          document.getElementById('attachFormFile').value = '';
          loadList(assetId);
        } else {
          status.style.color = '#b91c1c';
          status.textContent = d.error || 'Upload failed.';
        }
      } catch (e) {
        status.style.color = '#b91c1c';
        status.textContent = 'Upload failed.';
      }
    };

    loadList(assetId);
  };

  function scan() { return;
    document.querySelectorAll('[onclick*="openAssignAsset("]').forEach(function (el) {
      var host = el.closest('li') || el;
      if (host.dataset.attachDone) return;
      host.dataset.attachDone = '1';
      var m = (el.getAttribute('onclick') || '').match(/openAssignAsset\(\s*['"]?([^'",)\s]+)/);
      if (!m) return;
      var clone = host.cloneNode(true);
      clone.dataset.attachDone = '1';
      var btn = clone.matches('[onclick]') ? clone : clone.querySelector('[onclick]');
      if (!btn) return;
      btn.setAttribute('onclick', "openAttachModal('" + m[1] + "')");
      btn.textContent = LABEL;
      host.parentNode.insertBefore(clone, host.nextSibling);
    });
  }

  var timer = null;
  new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(scan, 150);
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', scan);
  scan();
})();