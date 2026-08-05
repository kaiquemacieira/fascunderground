/**
 * CRICRI · Web Push client
 *
 * - Pede permissão Notification
 * - Subscribe com VAPID (FASC_CONFIG.vapidPublicKey)
 * - Grava em public.push_subscriptions (endpoint, p256dh, auth)
 * - Fallback: CricriNotifs local se não houver VAPID/SW
 *
 * UI opcional: #push-card #btn-push-enable #btn-push-disable #push-status #push-msg
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function setStatus(text) {
    var el = $('push-status');
    if (el) el.textContent = text || '';
    var el2 = document.getElementById('cnb-push-status');
    if (el2) el2.textContent = text || '';
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

  function ensureSw() {
    if (!('serviceWorker' in navigator)) return Promise.reject(new Error('Sem Service Worker'));
    return navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg) return reg;
      return navigator.serviceWorker.register('./sw.js', { scope: './' });
    }).then(function () {
      return navigator.serviceWorker.ready;
    });
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

  function keysFromSub(sub) {
    var json = sub.toJSON();
    var keys = json.keys || {};
    return {
      endpoint: json.endpoint || sub.endpoint,
      p256dh: keys.p256dh || '',
      auth: keys.auth || ''
    };
  }

  async function saveSub(sub) {
    if (!window.fascDb || !window.fascAuth) return false;
    var user = null;
    try { user = await window.fascAuth.user(); } catch (_) {}
    if (!user || !user.id) return false;
    var k = keysFromSub(sub);
    if (!k.endpoint || !k.p256dh || !k.auth) {
      console.warn('[push] subscription incompleta');
      return false;
    }
    var payload = {
      user_id: user.id,
      endpoint: k.endpoint,
      p256dh: k.p256dh,
      auth: k.auth,
      user_agent: (navigator.userAgent || '').slice(0, 240),
      updated_at: new Date().toISOString()
    };
    var res = await window.fascDb
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'endpoint' });
    if (res.error) {
      console.warn('[push] upsert', res.error.message || res.error);
      return false;
    }
    return true;
  }

  async function removeSubCloud(sub) {
    if (!window.fascDb || !sub) return;
    try {
      var endpoint = sub.endpoint;
      await window.fascDb.from('push_subscriptions').delete().eq('endpoint', endpoint);
    } catch (_) {}
  }

  async function enable() {
    setMsg('');
    if (!('Notification' in window)) {
      setMsg('Este navegador não suporta notificações.', false);
      return false;
    }

    var perm = Notification.permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') {
      setMsg('Permissão negada. Ative nas configurações do navegador.', false);
      setStatus('Bloqueado');
      return false;
    }

    // locais sempre
    if (window.CricriNotifs && window.CricriNotifs.push) {
      try {
        window.CricriNotifs.push({
          ico: '🔔',
          title: 'Notificações ativas',
          body: 'Avisos do CRICRI neste aparelho.',
          kind: 'system'
        });
      } catch (_) {}
    }

    var key = vapidKey();
    if (!key) {
      setStatus('Alertas locais ativos');
      setMsg('Avisos locais ativos neste aparelho.', true);
      refreshUi();
      return true;
    }

    if (!('PushManager' in window)) {
      setStatus('Alertas locais ativos');
      setMsg('Notificações locais ok neste aparelho.', true);
      refreshUi();
      return true;
    }

    try {
      var reg = await ensureSw();
      var sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key)
        });
      }
      var saved = await saveSub(sub);
      setStatus(saved ? 'Web Push ativo' : 'Push no aparelho (cloud pendente)');
      setMsg(saved
        ? 'Alertas ativados neste aparelho.'
        : 'Alertas ok neste aparelho. Entre na conta pra sincronizar.',
        true);
      refreshUi();
      return true;
    } catch (e) {
      console.warn('[push]', e);
      setStatus('Alertas locais');
      setMsg((e && e.message) || 'Não deu pra ativar o alerta completo. Locais ainda funcionam.', false);
      refreshUi();
      return false;
    }
  }

  async function disable() {
    setMsg('');
    try {
      var sub = await currentSub();
      if (sub) {
        await removeSubCloud(sub);
        await sub.unsubscribe();
      }
    } catch (_) {}
    setStatus('Desativado');
    setMsg('Notificações desativadas neste aparelho.', true);
    refreshUi();
  }

  async function refreshUi() {
    // não força o card do perfil (UI vive no sininho)
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
      setStatus('Alertas ativos');
      if (btnOn) btnOn.hidden = true;
      if (btnOff) btnOff.hidden = false;
    } else if (perm === 'granted') {
      setStatus(vapidKey() ? 'Permissão ok — toque em Ativar' : 'Local (sem VAPID)');
      if (btnOn) btnOn.hidden = false;
      if (btnOff) btnOff.hidden = true;
    } else if (perm === 'denied') {
      setStatus('Bloqueado pelo navegador');
      if (btnOn) btnOn.hidden = false;
      if (btnOff) btnOff.hidden = true;
    } else {
      setStatus('Aguardando permissão');
      if (btnOn) btnOn.hidden = false;
      if (btnOff) btnOff.hidden = true;
    }
  }

  function bind() {
    var on = $('btn-push-enable');
    var off = $('btn-push-disable');
    if (on && on.dataset.bound !== '1') {
      on.dataset.bound = '1';
      on.addEventListener('click', function () { enable(); });
    }
    if (off && off.dataset.bound !== '1') {
      off.dataset.bound = '1';
      off.addEventListener('click', function () { disable(); });
    }
    refreshUi();
  }

  /**
   * Dispara push pra outro usuário via Edge Function send-push.
   * Requer login + function deployada + secrets VAPID.
   */
  async function notifyUser(toUserId, opts) {
    opts = opts || {};
    if (!toUserId) return { ok: false, error: 'to_user_id' };
    if (!window.fascDb || !window.fascAuth) return { ok: false, error: 'no client' };
    try {
      var session = await window.fascAuth.session();
      if (!session || !session.access_token) return { ok: false, error: 'no session' };
      var base = (window.FASC_CONFIG && window.FASC_CONFIG.supabaseUrl) || '';
      if (!base) return { ok: false, error: 'no url' };
      var url = base.replace(/\/$/, '') + '/functions/v1/send-push';
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
          apikey: (window.FASC_CONFIG && window.FASC_CONFIG.supabaseAnonKey) || ''
        },
        body: JSON.stringify({
          to_user_id: toUserId,
          title: opts.title || 'CRICRI',
          body: opts.body || opts.message || '',
          url: opts.url || opts.href || '/index.html',
          tag: opts.tag || 'cricri'
        })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) return { ok: false, error: data.error || res.status, data: data };
      return { ok: true, data: data };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'fetch failed' };
    }
  }

  async function sync() {
    var sub = await currentSub();
    if (sub) return saveSub(sub);
    return false;
  }

  // API pública
  window.CricriPush = {
    enable: enable,
    disable: disable,
    refresh: refreshUi,
    currentSub: currentSub,
    vapidKey: vapidKey,
    notifyUser: notifyUser,
    sync: sync,
    saveSub: saveSub
  };

  function boot() {
    // registra SW cedo
    if ('serviceWorker' in navigator) {
      ensureSw().catch(function () {});
    }
    bind();
    // re-bind se o card for injetado tarde
    setTimeout(bind, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
