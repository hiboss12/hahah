(function() {
  'use strict';

  const PENDING = {};

  window.addEventListener('bloxflare-relay-request', function(e) {
    const detail = e.detail;
    if (!detail || !detail.id || !detail.msg) return;

    chrome.runtime.sendMessage(detail.msg, function(response) {
      PENDING[detail.id] = response || { ok: false, error: 'No response from background' };
      window.dispatchEvent(new CustomEvent('bloxflare-relay-response', {
        detail: { id: detail.id, response: PENDING[detail.id] }
      }));
      delete PENDING[detail.id];
    });
  });
})();
