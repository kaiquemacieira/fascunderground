/**
 * CRICRI · notificações de novas conexões / amizade mútua
 *
 * - Lê connections onde to_id = eu (alguém me adicionou)
 * - Compara com IDs já vistos (localStorage)
 * - Empurra em CricriNotifs (inbox local + browser se permitido)
 * - Detecta mutual (eu também adicionei) → notif especial
 *
 * Requer: migration 202608050002 (SELECT onde to_id = auth.uid())
 *          js/cricri-notifs.js (CricriNotifs.push)
 */
(function () {
  'use strict';

  var SEEN_KEY = 'cricri-conn-seen-v1';
  var POLL_MS = 15000;
  var timer = null;
  var booted = false;

  function db() {
    return window.fascDb || null;
  }

  function loadSeen() {
    try {
      var raw = localStorage.getItem(SEEN_KEY);
      if (!raw) return { ids: {}, seeded: false };
      var p = JSON.parse(raw);
      return { ids: p.ids || {}, seeded: !!p.seeded };
    } catch (_) {
      return { ids: {}, seeded: false };
    }
  }

  function saveSeen(state) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  async function myId() {
    try {
      if (!window.fascAuth || !window.fascAuth.user) return null;
      var u = await window.fascAuth.user();
      return u && u.id ? u.id : null;
    } catch (_) {
      return null;
    }
  }

  function pushNotif(item) {
    if (!window.CricriNotifs || typeof window.CricriNotifs.push !== 'function') {
      console.info('[CRICRI conn-notif]', item && item.title, item && item.body);
      return;
    }
    try {
      window.CricriNotifs.push(item);
    } catch (e) {
      console.warn('[CRICRI conn-notif]', e && e.message || e);
    }
  }

  async function fetchIncoming(me) {
    var client = db();
    if (!client || !me) return [];
    // tenta pending primeiro (schema novo)
    var res = await client
      .from('connections')
      .select('id, from_id, status, created_at')
      .eq('to_id', me)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(40);
    if (res.error) {
      // coluna status pode não existir — fallback legado
      if (/status|column/i.test(res.error.message || '')) {
        res = await client
          .from('connections')
          .select('id, from_id, created_at')
          .eq('to_id', me)
          .order('created_at', { ascending: false })
          .limit(40);
      } else if (/policy|permission|RLS/i.test(res.error.message || '')) {
        console.info('[CRICRI conn-notif] RLS bloqueia leitura de pedidos recebidos — rode migration connections_incoming_select');
        return [];
      }
    }
    if (res.error) {
      console.warn('[CRICRI conn-notif]', res.error.message);
      return [];
    }
    return res.data || [];
  }

  async function fetchProfiles(ids) {
    if (!ids.length || !db()) return {};
    try {
      var res = await db()
        .from('profiles')
        .select('id, name, handle')
        .in('id', ids);
      if (res.error) return {};
      var map = {};
      (res.data || []).forEach(function (p) { map[p.id] = p; });
      return map;
    } catch (_) {
      return {};
    }
  }

  async function iFollow(me, otherId) {
    if (!db() || !me || !otherId) return false;
    try {
      var res = await db()
        .from('connections')
        .select('id')
        .eq('from_id', me)
        .eq('to_id', otherId)
        .maybeSingle();
      return !!(res.data && res.data.id);
    } catch (_) {
      return false;
    }
  }

  function labelFor(profile) {
    if (!profile) return 'alguém';
    if (profile.handle) return '@' + profile.handle;
    if (profile.name) return profile.name;
    return 'alguém';
  }

  async function checkOnce() {
    var me = await myId();
    if (!me || !db()) return;

    var incoming = await fetchIncoming(me);
    var seen = loadSeen();

    // Primeira vez: só marca como vistos, sem flood de notifs antigas
    if (!seen.seeded) {
      incoming.forEach(function (row) {
        if (row && row.id) seen.ids[row.id] = 1;
      });
      seen.seeded = true;
      saveSeen(seen);
      return;
    }

    var fresh = incoming.filter(function (row) {
      return row && row.id && !seen.ids[row.id];
    });
    if (!fresh.length) return;

    var fromIds = fresh.map(function (r) { return r.from_id; }).filter(Boolean);
    var profiles = await fetchProfiles(fromIds);

    for (var i = 0; i < fresh.length; i++) {
      var row = fresh[i];
      seen.ids[row.id] = 1;
      var p = profiles[row.from_id];
      var who = labelFor(p);
      var mutual = await iFollow(me, row.from_id);

      if (mutual) {
        pushNotif({
          ico: '🤝',
          title: 'Amizade mútua',
          body: who + ' também está na sua roda — agora são amigos.',
          kind: 'friend',
          href: p && p.handle ? ('profile.html?u=' + encodeURIComponent(p.handle)) : 'profile.html'
        });
        if (window.CricriFriends && window.CricriFriends.invalidate) {
          try { window.CricriFriends.invalidate(); } catch (_) {}
        }
      } else {
        pushNotif({
          ico: '👥',
          title: 'Nova conexão',
          body: who + ' te adicionou nas conexões.',
          kind: 'follower',
          href: p && p.handle ? ('profile.html?u=' + encodeURIComponent(p.handle)) : 'profile.html'
        });
      }
    }
    saveSeen(seen);
  }

  /**
   * Chamado após EU adicionar alguém — se já me seguiam, vira mutual agora.
   */
  async function onIConnected(toProfile) {
    if (!toProfile || !toProfile.id) return;
    var me = await myId();
    if (!me) return;
    // eles me têm?
    var incoming = await fetchIncoming(me);
    var theyFollow = incoming.some(function (r) { return r.from_id === toProfile.id; });
    var who = labelFor(toProfile);
    if (theyFollow) {
      pushNotif({
        ico: '🤝',
        title: 'Amizade mútua',
        body: 'Você e ' + who + ' se conectaram. Feed Agora liberado entre vocês.',
        kind: 'friend',
        href: toProfile.handle
          ? ('profile.html?u=' + encodeURIComponent(toProfile.handle))
          : 'profile.html'
      });
    } else {
      pushNotif({
        ico: '➕',
        title: 'Conexão adicionada',
        body: who + ' entrou na sua lista. Quando te adicionar de volta, vira amizade.',
        kind: 'follower',
        href: toProfile.handle
          ? ('profile.html?u=' + encodeURIComponent(toProfile.handle))
          : 'profile.html'
      });
    }
    if (window.CricriFriends && window.CricriFriends.invalidate) {
      try { window.CricriFriends.invalidate(); } catch (_) {}
    }
  }

  function startPolling() {
    if (timer) return;
    timer = setInterval(function () {
      checkOnce().catch(function () {});
    }, POLL_MS);
  }

  function stopPolling() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  async function boot() {
    if (booted) return;
    booted = true;
    // espera client
    var tries = 0;
    function tick() {
      tries++;
      if (db() && window.fascAuth) {
        checkOnce().then(function () { startPolling(); subscribeRealtime(); }).catch(function () { startPolling(); subscribeRealtime(); });
        return;
      }
      if (tries < 40) setTimeout(tick, 150);
    }
    tick();

    if (window.fascAuth && window.fascAuth.onChange) {
      window.fascAuth.onChange(function (ev) {
        if (ev === 'SIGNED_IN') {
          checkOnce().catch(function () {});
          startPolling();
        }
        if (ev === 'SIGNED_OUT') stopPolling();
      });
    }
  }


  function subscribeRealtime() {
    try {
      var client = db();
      if (!client || typeof client.channel !== 'function') return;
      myId().then(function (me) {
        if (!me) return;
        try {
          var ch = client
            .channel('connections-in-' + me)
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'connections',
              filter: 'to_id=eq.' + me
            }, function () {
              checkOnce().catch(function () {});
            })
            .subscribe(function (status) {
              console.info('[CRICRI conn-notif] realtime', status);
            });
          window.__cricriConnChannel = ch;
        } catch (e) {
          console.info('[CRICRI conn-notif] realtime fail', e && e.message);
        }
      });
    } catch (e) {
      console.info('[CRICRI conn-notif] realtime skip', e && e.message);
    }
  }

  window.CricriConnectionNotifs = {
    check: checkOnce,
    onIConnected: onIConnected,
    start: startPolling,
    stop: stopPolling
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
