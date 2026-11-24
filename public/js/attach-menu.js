(function () {
  function addAttach() {
    document.querySelectorAll('button[data-action="photos"][data-asset-id]').forEach(function (btn) {
      var menu = btn.parentElement;
      if (!menu || menu.querySelector('[data-action="attach-form"]')) return;
      var assetId = btn.getAttribute('data-asset-id');
      var clone = btn.cloneNode(true);
      clone.setAttribute('data-action', 'attach-form');
      clone.textContent = 'Attach Signed Form';
      clone.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.openAttachModal === 'function') window.openAttachModal(assetId);
      });
      btn.insertAdjacentElement('afterend', clone);
    });
  }

  var timer = null;
  new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(addAttach, 100);
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', function () { setTimeout(addAttach, 50); }, true);
  addAttach();
})();