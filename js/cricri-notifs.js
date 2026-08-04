/**
 * CRICRI · Centro de notificações local
 *
 * - Inbox em localStorage (últimas 40)
 * - API: CricriNotifs.push / list / unread / markAllRead / clear
 * - Opcional: Notification API do browser (se permitido)
 * - Não depende de VAPID/backend; push.js pode plugar depois
 *
 * Uso:
 *   CricriNotifs.push({ title, body, ico, kind, href });
 *   kind: 'cri' | 'scrap' | 'festa' | 'system'
 */
(function () {
  'use strict';

  var STORAGE = 'cricri-notifs-v1';
  var MAX = 40;
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return { items: [], unread: 0 };
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return { items: [], unread: 0 };
      return parsed;
    } catch (_) {
      return { items: [], unread: 0 };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch (_) {}
  }

  function emit(state) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('cricri:notifs', { detail: state }));
    } catch (_) {}
  }

  function canBrowserNotify() {
    return typeof window.Notification === 'function' && Notification.permission === 'granted';
  }

  function browserNotify(item) {
    if (!canBrowserNotify()) return;
    try {
      var n = new Notification(item.title || 'CRICRI', {
        body: item.body || '',
        icon: item.icon || undefined,
        tag: item.kind ? ('cricri-' + item.kind) : 'cricri',
        data: { href: item.href || null }
      });
      n.onclick = function () {
        try {
          if (item.href) window.focus();
          if (item.href) window.location.href = item.href;
          n.close();
        } catch (_) {}
      };
    } catch (_) {}
  }

  function push(input) {
    if (!input) return null;
    var state = load();
    var item = {
      id: 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      title: String(input.title || 'CRICRI').slice(0, 80),
      body: String(input.body || '').slice(0, 180),
      ico: input.ico || '🔔',
      kind: input.kind || 'system',
      href: input.href || null,
      read: false
    };
    state.items.unshift(item);
    if (state.items.length > MAX) state.items = state.items.slice(0, MAX);
    state.unread = (state.unread || 0) + 1;
    save(state);
    emit(state);

    // Browser notification só se já tiver permissão (não pede aqui)
    if (input.browser !== false) browserNotify(item);

    return item;
  }

  function list() {
    return load().items.slice();
  }

  function unread() {
    return load().unread || 0;
  }

  function markAllRead() {
    var state = load();
    for (var i = 0; i < state.items.length; i++) state.items[i].read = true;
    state.unread = 0;
    save(state);
    emit(state);
  }

  function clear() {
    var state = { items: [], unread: 0 };
    save(state);
    emit(state);
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function off() {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  async function requestPermission() {
    if (typeof window.Notification !== 'function') {
      return 'unsupported';
    }
    try {
      var perm = await Notification.requestPermission();
      return perm;
    } catch (_) {
      return 'denied';
    }
  }

  // Atalhos do Cri Cabrunco
  var Cri = {
    born: function () {
      return push({
        ico: '🥚',
        title: 'Eita cabrunco… nasceu',
        body: 'O Cri chegou. Cuida dele no Tamagotchi.',
        kind: 'cri',
        href: 'tamagotchi.html'
      });
    },
    evolve: function (label) {
      return push({
        ico: '✨',
        title: 'Oxe… cresci, hein?',
        body: 'Cri evoluiu para ' + (label || 'nova fase') + '.',
        kind: 'cri',
        href: 'tamagotchi.html'
      });
    },
    hungry: function () {
      return push({
        ico: '🥟',
        title: 'Fome do cabrunco',
        body: 'O Cri tá com fome. Se oriente e alimenta.',
        kind: 'cri',
        href: 'tamagotchi.html'
      });
    },
    sick: function () {
      return push({
        ico: '💧',
        title: 'Esse cabrunco não tá legal…',
        body: 'Dá um remédio pro Cri.',
        kind: 'cri',
        href: 'tamagotchi.html'
      });
    },
    card: function (name) {
      return push({
        ico: '🃏',
        title: 'Photocard novo',
        body: name || 'Você desbloqueou um card.',
        kind: 'cri',
        href: 'tamagotchi.html'
      });
    },
    farewell: function () {
      return push({
        ico: '🌅',
        title: 'A roda está acabando…',
        body: 'Últimos carinhos com o Cri. Gratidão de São Cristóvão.',
        kind: 'festa',
        href: 'tamagotchi.html'
      });
    }
  };

  window.CricriNotifs = {
    push: push,
    list: list,
    unread: unread,
    markAllRead: markAllRead,
    clear: clear,
    onChange: onChange,
    requestPermission: requestPermission,
    Cri: Cri
  };
})();
