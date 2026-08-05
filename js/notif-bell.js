/**
 * CRICRI · API de avisos (UI na página notifications.html + badge no menu)
 * Sininho flutuante desativado de propósito.
 */
(function () {
  'use strict';
  if (window.__cricriNotifBellMounted) return;
  window.__cricriNotifBellMounted = true;

  var STORAGE = 'cricri-notifs-v1';
  var pendingRequests = [];

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  function saveLocal(list) {
    try { localStorage.setItem(STORAGE, JSON.stringify((list || []).slice(0, 40))); } catch (_) {}
  }

  function notifCount() {
    return pendingRequests.length + loadLocal().length;
  }

  function pushNotif(item) {
    var list = loadLocal();
    list.unshift({
      id: item.id || ('n-' + Date.now()),
      ico: item.ico || '•',
      title: item.title || 'CRICRI',
      body: item.body || '',
      kind: item.kind || 'info',
      at: item.at || Date.now(),
      href: item.href || null
    });
    saveLocal(list);
    updateBadge();
  }

  function updateBadge() {
    var n = notifCount();
    if (window.CricriBottomNav && window.CricriBottomNav.updateNotifBadge) {
      window.CricriBottomNav.updateNotifBadge(n);
    }
    try {
      window.dispatchEvent(new CustomEvent('cricri:notifs-changed', { detail: { count: n } }));
    } catch (_) {}
  }

  async function refreshRequests() {
    if (!window.CricriFriends || !window.CricriFriends.listIncomingRequests) {
      pendingRequests = [];
      return;
    }
    try {
      pendingRequests = await window.CricriFriends.listIncomingRequests();
    } catch (_) {
      pendingRequests = [];
    }
  }

  async function refreshAll() {
    await refreshRequests();
    updateBadge();
  }

  window.CricriNotifBell = {
    push: pushNotif,
    refresh: refreshAll,
    count: notifCount,
    open: function () {
      window.location.href = 'notifications.html';
    }
  };

  function boot() {
    setTimeout(refreshAll, 700);
    setInterval(function () {
      if (document.visibilityState === 'visible') refreshRequests().then(updateBadge);
    }, 45000);
    window.addEventListener('cricri:friend-accepted', function () {
      if (window.CricriFriends && window.CricriFriends.invalidate) window.CricriFriends.invalidate();
      refreshAll();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
