// ==UserScript==
// ==/UserScript==
(function () {
  'use strict';

  // ===== EDIT THESE TWO =====
  var CONFIG_URL = 'https://CHANGE-ME.trycloudflare.com/config';
  var BRIDGE_URL = 'https://CHANGE-ME-2.trycloudflare.com';
  // ==========================

  var BRIDGE_ORIGIN = 'http://localhost:8765';
  var LICENSE_URL = CONFIG_URL.replace(/\/config$/, '/license');

  var KEYS = ['larp_target_userid','larp_target_username','larp_target_displayname',
    'larp_target_avatar','larp_fake_robux','larp_verified_badge','larp_notif_count',
    'larp_messages_count','larp_connect_count','larp_fake_buying_enabled',
    'larp_fakewear_enabled','larp_avatar_spoof_enabled','larp_autoexec_path'];

  var nativeFetch = window.fetch.bind(window);

  // Route the executor bridge at the PC instead of the phone's localhost
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url);
    if (url && url.indexOf(BRIDGE_ORIGIN) === 0) {
      var fixed = BRIDGE_URL + url.slice(BRIDGE_ORIGIN.length);
      input = typeof input === 'string' ? fixed : new Request(fixed, input);
    }
    return nativeFetch(input, init);
  };

  // Stand-in for relay.js + background.js
  window.addEventListener('bloxflare-relay-request', function (e) {
    var d = e.detail || {};
    function reply(r) {
      window.dispatchEvent(new CustomEvent('bloxflare-relay-response', {
        detail: { id: d.id, response: r }
      }));
    }
    if (d.msg && d.msg.type === 'license-validate') {
      nativeFetch(LICENSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d.msg)
      }).then(function (r) { return r.json(); }).then(reply)
        .catch(function (err) { reply({ ok: false, error: String(err) }); });
    } else {
      reply({ ok: false, error: 'unhandled ' + (d.msg && d.msg.type) });
    }
  });

  // Pull config from the PC. Cached copy lands synchronously on load.
  function apply(cfg) {
    if (!cfg) return;
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (k in cfg && cfg[k] !== null && cfg[k] !== '') localStorage.setItem(k, cfg[k]);
    }
  }

  var cache = localStorage.bfCfg;
  if (cache) { try { apply(JSON.parse(cache)); } catch (e) {} }

  function pull() {
    nativeFetch(CONFIG_URL, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (cfg.__rev && cfg.__rev === localStorage.bfRev) return;
        localStorage.bfCfg = JSON.stringify(cfg);
        localStorage.bfRev = cfg.__rev;
        apply(cfg);
      }).catch(function () {});
  }

  pull();
  setInterval(pull, 5000);
})();
