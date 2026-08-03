/**
 * CRICRI · P2/P3.1 — Encontro no mapa entre bichinhos de amigos
 *
 * Quando dois usuários com conexão MÚTUA estão no mesmo geofence de spot,
 * mostra toast leve: "Seu CRICRI encontrou o de [nome] em [spot]".
 *
 * Privacidade:
 * - Só conexões mútuas (A→B e B→A na tabela connections)
 * - Nunca desconhecidos
 * - Presença escrita só pelo dono; leitura de amigos só via RPC get_cricri_meets
 * - Depende do consentimento de geoloc já usado no mapa
 */
(function (global) {
  'use strict';

  var POLL_MS = 45000;
  var FRESH_SEC = 300;
  var TOAST_COOLDOWN_MS = 30 * 60 * 1000; // não repetir mesmo amigo+spot em 30 min
  var HEARTBEAT_MS = 90000;
  var pollTimer = null;
  var beatTimer = null;
  var currentSpot = null; // { id, name }
  var started = false;

  function ended() {
    return typeof global.fascEventEnded === 'function' && global.fascEventEnded();
  }

  function toastKey(friendId, spotId) {
    return 'cricri_meet_' + friendId + '_' + spotId;
  }

  function alreadyToasted(friendId, spotId) {
    try {
      var raw = sessionStorage.getItem(toastKey(friendId, spotId));
      if (!raw) return false;
      return Date.now() - Number(raw) < TOAST_COOLDOWN_MS;
    } catch (_) {
      return false;
    }
  }

  function markToasted(friendId, spotId) {
    try {
      sessionStorage.setItem(toastKey(friendId, spotId), String(Date.now()));
    } catch (_) {}
  }

  function showMeetToast(label, spotName) {
    var title = 'CRICRI encontrou um amigo';
    var body =
      'Seu CRICRI encontrou o de ' + label + ' em ' + (spotName || 'um spot') + '.';
    if (typeof global.showScrapToast === 'function') {
      global.showScrapToast('🐾 ' + body);
    }
    if (global.CricriNotifs && typeof global.CricriNotifs.push === 'function') {
      global.CricriNotifs.push({
        ico: '🐾',
        title: title,
        body: body,
        kind: 'meet'
      });
    }
  }

  async function recordCheckin(spotId, spotName) {
    if (!global.fascDb) return;
    try {
      await global.fascDb.rpc('record_event_checkin', {
        p_spot_id: spotId || null,
        p_spot_name: spotName || null
      });
    } catch (e) {
      if (!/function|schema cache|does not exist/i.test((e && e.message) || '')) {
        console.info('[cricri-meet] checkin', e && e.message);
      }
    }
  }

  async function setPresence(spotId, spotName) {
    if (!global.fascDb) return;
    if (ended()) return;
    try {
      var user = global.fascAuth && global.fascAuth.user ? await global.fascAuth.user() : null;
      if (!user) return;
      await global.fascDb.rpc('set_my_spot_presence', {
        p_spot_id: spotId || null,
        p_spot_name: spotName || null
      });
      // P2/P3.3 — 1 check-in por dia (selo de presença)
      if (spotId) await recordCheckin(spotId, spotName);
    } catch (e) {
      console.info('[cricri-meet] presence', e && e.message);
    }
  }

  async function clearPresence() {
    currentSpot = null;
    await setPresence(null, null);
  }

  async function checkMeets() {
    if (!global.fascDb || !currentSpot || ended()) return;
    try {
      var user = global.fascAuth && global.fascAuth.user ? await global.fascAuth.user() : null;
      if (!user) return;
      var res = await global.fascDb.rpc('get_cricri_meets', { p_fresh_seconds: FRESH_SEC });
      if (res.error) {
        // tabela/RPC ainda não migrados
        if (!/function|schema cache|does not exist/i.test(res.error.message || '')) {
          console.info('[cricri-meet]', res.error.message);
        }
        return;
      }
      (res.data || []).forEach(function (row) {
        var fid = row.friend_id;
        var sid = row.spot_id || (currentSpot && currentSpot.id);
        if (!fid || alreadyToasted(fid, sid)) return;
        var label = row.name || (row.handle ? '@' + row.handle : 'um amigo');
        var spotName = row.spot_name || (currentSpot && currentSpot.name) || sid;
        markToasted(fid, sid);
        showMeetToast(label, spotName);
      });
    } catch (e) {
      console.info('[cricri-meet] meets', e && e.message);
    }
  }

  function onGeofence(ev) {
    var d = (ev && ev.detail) || {};
    if (d.type === 'enter' && d.id) {
      currentSpot = { id: d.id, name: d.name || d.id };
      setPresence(currentSpot.id, currentSpot.name).then(checkMeets);
    } else if (d.type === 'leave') {
      // se ainda há outros spots (raro), mock só notifica um a um
      if (currentSpot && d.id === currentSpot.id) {
        clearPresence();
      }
    }
  }

  function start() {
    if (started) return;
    started = true;
    global.addEventListener('projano:geofence', onGeofence);

    pollTimer = setInterval(function () {
      if (currentSpot) checkMeets();
    }, POLL_MS);

    beatTimer = setInterval(function () {
      if (currentSpot) setPresence(currentSpot.id, currentSpot.name);
    }, HEARTBEAT_MS);

    // se já estiver dentro de um fence (mapa montou antes / getActiveFences)
    try {
      var api = global.projanoMap;
      if (api && typeof api.getActiveFences === 'function') {
        var inside = api.getActiveFences() || [];
        if (inside.length) {
          var s = inside[0];
          currentSpot = { id: s.id, name: s.name || s.id };
          setPresence(currentSpot.id, currentSpot.name).then(checkMeets);
        }
      }
    } catch (_) {}
  }

  function stop() {
    started = false;
    global.removeEventListener('projano:geofence', onGeofence);
    if (pollTimer) clearInterval(pollTimer);
    if (beatTimer) clearInterval(beatTimer);
    pollTimer = beatTimer = null;
  }

  global.CricriMeet = {
    start: start,
    stop: stop,
    check: checkMeets,
    clear: clearPresence
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
