/**
 * CRICRI · Web Push (opcional)
 *
 * Se window.FASC_VAPID_PUBLIC_KEY estiver definida e houver service worker,
 * tenta subscribe. Caso contrário, só atualiza UI do #push-card e delega
 * avisos locais ao CricriNotifs.
 *
 * Não inventa tabela Supabase — só registra subscription se fascDb + tabela
 * push_subscriptions existir (best effort).
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function setStatus(text) {
    var el = $('push-status');
    if (el) el.textContent = text || '';
  }
  function setMsg(text, ok) {
    var el = $('push-msg');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
    el.classList.toggle('err', ok === false);
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function vapidKey() {
    return (window.FASC_VAPID_PUBLIC_KEY
      || (window.FASC_CONFIG && window.FASC_CONFIG.vapidPublicKey)
      || '').trim();
  }

  async function currentSub() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    try {
      var reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (_) {
      return null;
    }
  }

  async function enable() {
    setMsg('');
    if (!('Notification' in window)) {
      setMsg('Este navegador não suporta notificações.', false);
      return;
    }
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setMsg('Permissão negada. Ative nas configurações do navegador.', false);
      setStatus('Bloqueado');
      return;
    }

    // Sempre libera notificações locais via CricriNotifs
    if (window.CricriNotifs) {
      window.CricriNotifs.push({
        ico: '🔔',
        title: 'Notificações ativas',
        body: 'O Cri e o festival podem te avisar por aqui.',
        kind: 'system'
      });
    }

    var key = vapidKey();
    if (!key) {
      setStatus('Local ativo (sem Web Push — falta VAPID)');
      setMsg('Avisos locais ok. Web Push precisa da chave VAPID em config.js.', true);
      refreshUi();
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('Local ativo (sem PushManager)');
      setMsg('Notificações locais ok neste aparelho.', true);
      refreshUi();
      return;
    }

    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });

      // Best effort: grava se tabela existir
      try {
        if (window.fascAuth && window.fascDb) {
          var user = await window.fascAuth.user();
          if (user && user.id) {
            await window.fascDb.from('push_subscriptions').upsert({
              user_id: user.id,
              endpoint: sub.endpoint,
              subscription: sub.toJSON(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'endpoint' });
          }
        }
      } catch (e) {
        console.info('[push] skip cloud save', e && e.message);
      }

      setStatus('Web Push ativo');
      setMsg('Notificações ativadas.', true);
    } catch (e) {
      console.warn('[push]', e);
      setStatus('Local ativo');
      setMsg((e && e.message) || 'Falha no Web Push — locais ainda funcionam.', false);
    }
    refreshUi();
  }

  async function disable() {
    setMsg('');
    try {
      var sub = await currentSub();
      if (sub) await sub.unsubscribe();
    } catch (_) {}
    setStatus('Desativado');
    setMsg('Notificações desativadas neste aparelho.', true);
    refreshUi();
  }

  async function refreshUi() {
    var card = $('push-card');
    // UI existe mas estava forçada hidden no CSS legado — só mostra se #push-card não estiver permanentemente display:none via outras regras de página
    if (card) card.hidden = false;

    var btnOn = $('btn-push-enable');
    var btnOff = $('btn-push-disable');

    if (!('Notification' in window)) {
      setStatus('Não suportado');
      if (btnOn) btnOn.hidden = true;
      if (btnOff) btnOff.hidden = true;
      return;
    }

    var perm = Notification.permission;
    var sub = await currentSub();
    if (perm === 'granted' && sub) {
      setStatus('Web Push ativo');
      if (btnOn) btnOn.hidden = true;
      if (btnOff) btnOff.hidden = false;
    } else if (perm === 'granted') {
      setStatus(vapidKey() ? 'Permissão ok — ative o Push' : 'Local disponível');
      if (btnOn) btnOn.hidden = false;
      if (btnOff) btnOff.hidden = true;
    } else if (perm === 'denied') {
      setStatus('Bloqueado pelo navegador');
      if (btnOn) btnOn.hidden = false;
      if (btnOff) btnOff.hidden = true;
    } else {
      setStatus('Ainda não ativado');
      if (btnOn) btnOn.hidden = false;
      if (btnOff) btnOff.hidden = true;
    }
  }

  function wire() {
    var btnOn = $('btn-push-enable');
    var btnOff = $('btn-push-disable');
    if (btnOn) btnOn.addEventListener('click', function () { enable(); });
    if (btnOff) btnOff.addEventListener('click', function () { disable(); });
    refreshUi();
  }

  window.CricriPush = { enable: enable, disable: disable, refresh: refreshUi };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
