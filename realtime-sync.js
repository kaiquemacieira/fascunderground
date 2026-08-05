/**
 * CRICRI · Sincronização em tempo real (Supabase Realtime)
 *
 * Canais:
 *  - tama_state   → pet entre aparelhos do mesmo usuário
 *  - profiles     → last_seen (amigos online)
 *  - inbox_anon   → novos Meows / replies
 *  - spots        → status do mapa (delega a fascSpots se existir)
 *
 * Uso:
 *   CricriRealtime.start()
 *   CricriRealtime.stop()
 *   CricriRealtime.status()
 *   window.addEventListener('cricri:realtime', (e) => { ... e.detail })
 */
(function (global) {
  'use strict';

  var channels = [];
  var started = false;
  var lastUserId = null;
  var stats = {
    startedAt: 0,
    tama: 0,
    presence: 0,
    inbox: 0,
    spots: 0,
    errors: 0,
    lastEvent: null
  };

  function db() {
    return global.fascDb || null;
  }

  function emit(kind, payload) {
    stats.lastEvent = { kind: kind, at: Date.now(), payload: payload || null };
    try {
      global.dispatchEvent(new CustomEvent('cricri:realtime', {
        detail: { kind: kind, at: Date.now(), data: payload || null }
      }));
    } catch (_) {}
  }

  function removeAll() {
    var client = db();
    if (!client) {
      channels = [];
      return;
    }
    for (var i = 0; i < channels.length; i++) {
      try { client.removeChannel(channels[i]); } catch (_) {}
    }
    channels = [];
  }

  async function currentUser() {
    try {
      if (!global.fascAuth || !global.fascAuth.user) return null;
      return await global.fascAuth.user();
    } catch (_) {
      return null;
    }
  }

  function track(ch) {
    if (ch) channels.push(ch);
    return ch;
  }

  /**
   * tama_state — só o próprio user_id (RLS)
   */
  function subTama(uid) {
    var client = db();
    if (!client || !uid) return null;
    var ch = client
      .channel('cricri-tama-' + uid)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tama_state',
          filter: 'user_id=eq.' + uid
        },
        function (payload) {
          stats.tama++;
          emit('tama', payload);
          try {
            if (typeof global.__cricriApplyRemoteTama === 'function') {
              global.__cricriApplyRemoteTama(payload);
            }
          } catch (e) {
            stats.errors++;
            console.warn('[realtime] tama apply', e && e.message);
          }
        }
      )
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.info('[CRICRI realtime] tama_state ok');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          stats.errors++;
          console.warn('[CRICRI realtime] tama_state', status);
        }
      });
    return track(ch);
  }

  /**
   * profiles.last_seen — atualiza lista de amigos
   */
  function subPresence() {
    var client = db();
    if (!client) return null;
    var ch = client
      .channel('cricri-presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: undefined
        },
        function (payload) {
          stats.presence++;
          emit('presence', payload);
          try {
            if (typeof global.__cricriLoadFriendsOnline === 'function') {
              // debounce leve
              clearTimeout(subPresence._t);
              subPresence._t = setTimeout(function () {
                global.__cricriLoadFriendsOnline();
              }, 400);
            }
          } catch (e) {
            stats.errors++;
          }
        }
      )
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.info('[CRICRI realtime] profiles ok');
        }
      });
    return track(ch);
  }

  /**
   * inbox_anon — recados para mim
   */
  function subInbox(uid) {
    var client = db();
    if (!client || !uid) return null;
    var ch = client
      .channel('cricri-inbox-' + uid)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_anon',
          filter: 'to_profile_id=eq.' + uid
        },
        function (payload) {
          stats.inbox++;
          emit('inbox', payload);
          try {
            if (typeof global.__cricriReloadInbox === 'function') {
              clearTimeout(subInbox._t);
              subInbox._t = setTimeout(function () {
                global.__cricriReloadInbox();
              }, 300);
            }
            // notificação suave
            if (payload.eventType === 'INSERT' && global.CricriNotifs && global.CricriNotifs.toast) {
              global.CricriNotifs.toast('Novo Meow na caixinha');
            }
          } catch (e) {
            stats.errors++;
          }
        }
      )
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.info('[CRICRI realtime] inbox_anon ok');
        }
      });
    return track(ch);
  }

  /**
   * spots — status do mapa
   */
  function subSpots() {
    if (global.fascSpots && typeof global.fascSpots.subscribeSpots === 'function') {
      var handle = global.fascSpots.subscribeSpots(function (payload) {
        stats.spots++;
        emit('spots', payload);
        try {
          if (typeof global.cricriRefreshSpots === 'function') {
            global.cricriRefreshSpots(payload);
          }
        } catch (_) {}
      });
      // fascSpots returns { unsubscribe }, not a channel — wrap
      if (handle && handle.unsubscribe) {
        channels.push({
          _fake: true,
          unsubscribe: handle.unsubscribe
        });
      }
      return handle;
    }
    var client = db();
    if (!client) return null;
    var ch = client
      .channel('cricri-spots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spots' },
        function (payload) {
          stats.spots++;
          emit('spots', payload);
        }
      )
      .subscribe();
    return track(ch);
  }

  async function start() {
    var client = db();
    if (!client) {
      console.info('[CRICRI realtime] sem fascDb — adiando');
      return false;
    }
    // evita duplicar
    removeAll();
    var user = await currentUser();
    var uid = user && user.id ? user.id : null;
    lastUserId = uid;
    started = true;
    stats.startedAt = Date.now();

    if (uid) {
      subTama(uid);
      subInbox(uid);
    }
    subPresence();
    subSpots();

    emit('started', { userId: uid });
    console.info('[CRICRI realtime] canais ativos · user=', uid ? uid.slice(0, 8) : 'anon');
    return true;
  }

  function stop() {
    removeAll();
    // fascSpots-style fakes
    for (var i = 0; i < channels.length; i++) {
      if (channels[i] && channels[i]._fake && channels[i].unsubscribe) {
        try { channels[i].unsubscribe(); } catch (_) {}
      }
    }
    channels = [];
    started = false;
    emit('stopped', null);
  }

  function status() {
    return {
      started: started,
      userId: lastUserId,
      channels: channels.length,
      stats: Object.assign({}, stats)
    };
  }

  // reconecta quando auth muda
  function wireAuth() {
    if (!global.fascAuth || typeof global.fascAuth.onChange !== 'function') return;
    try {
      global.fascAuth.onChange(function (event, session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          start();
        } else if (event === 'SIGNED_OUT') {
          stop();
          // ainda escuta spots/presence públicos se quiser — reabre sem user
          setTimeout(function () { start(); }, 200);
        }
      });
    } catch (_) {}
  }

  function boot() {
    wireAuth();
    // espera client supabase
    var tries = 0;
    function attempt() {
      tries++;
      if (db()) {
        start();
        return;
      }
      if (tries < 20) setTimeout(attempt, 300);
    }
    attempt();
  }

  global.CricriRealtime = {
    start: start,
    stop: stop,
    status: status,
    restart: function () { stop(); return start(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
