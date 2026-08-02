// FASC+ — Web Push (permissão, subscribe, salva no Supabase)
(function () {
  'use strict';

  var SW_PATH = './sw.js';
  var TABLE = 'push_subscriptions';

  function $(id) {
    return document.getElementById(id);
  }

  function setMsg(text, ok) {
    var el = $('push-msg');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
    el.classList.toggle('err', !!(text && !ok));
  }

  function supported() {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  function vapidPublicKey() {
    if (window.FASC_VAPID_PUBLIC_KEY) return String(window.FASC_VAPID_PUBLIC_KEY).trim();
    if (window.FASC_CONFIG && window.FASC_CONFIG.vapidPublicKey) {
      return String(window.FASC_CONFIG.vapidPublicKey).trim();
    }
    return '';
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function ensureSW() {
    var reg = await navigator.serviceWorker.getRegistration();
    if (reg) return reg;
    reg = await navigator.serviceWorker.register(SW_PATH, { scope: './' });
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function currentSubscription() {
    if (!supported()) return null;
    try {
      var reg = await ensureSW();
      return await reg.pushManager.getSubscription();
    } catch (e) {
      console.warn('[FASC push] getSubscription', e.message || e);
      return null;
    }
  }

  async function saveSubscription(sub) {
    if (!window.fascDb || !window.fascAuth) {
      throw new Error('Supabase não está pronto.');
    }
    var user = await window.fascAuth.user();
    if (!user) throw new Error('Entre na conta para ativar notificações.');

    var json = sub.toJSON();
    var keys = json.keys || {};
    if (!json.endpoint || !keys.p256dh || !keys.auth) {
      throw new Error('Subscription incompleta do browser.');
    }

    var payload = {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: (navigator.userAgent || '').slice(0, 300)
    };

    var res = await window.fascDb
      .from(TABLE)
      .upsert(payload, { onConflict: 'endpoint' })
      .select('id')
      .single();

    if (res.error) throw res.error;
    return res.data;
  }

  async function removeSubscriptionLocalAndRemote() {
    var sub = await currentSubscription();
    if (sub) {
      try {
        if (window.fascDb && window.fascAuth) {
          var user = await window.fascAuth.user();
          if (user) {
            await window.fascDb
              .from(TABLE)
              .delete()
              .eq('user_id', user.id)
              .eq('endpoint', sub.endpoint);
          }
        }
      } catch (e) {
        console.warn('[FASC push] delete remote', e.message || e);
      }
      try {
        await sub.unsubscribe();
      } catch (e) {
        console.warn('[FASC push] unsubscribe', e.message || e);
      }
    }
  }

  async function enable() {
    if (!supported()) {
      throw new Error('Este navegador não suporta Web Push.');
    }
    if (!window.isSecureContext) {
      throw new Error('Push exige HTTPS (ou localhost). Não use file://.');
    }
    var key = vapidPublicKey();
    if (!key) {
      throw new Error('Falta a chave pública VAPID (window.FASC_VAPID_PUBLIC_KEY).');
    }

    var permission = Notification.permission;
    if (permission === 'denied') {
      throw new Error('Notificações bloqueadas no navegador. Libere nas configurações do site.');
    }
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada.');
      }
    }

    var reg = await ensureSW();
    var sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
    }

    await saveSubscription(sub);
    return sub;
  }

  async function disable() {
    await removeSubscriptionLocalAndRemote();
  }

  async function refreshUI() {
    var card = $('push-card');
    var btnOn = $('btn-push-enable');
    var btnOff = $('btn-push-disable');
    var status = $('push-status');

    if (!card) return;

    var user = window.fascAuth ? await window.fascAuth.user() : null;
    if (!user) {
      card.hidden = true;
      return;
    }
    card.hidden = false;

    if (!supported()) {
      if (status) status.textContent = 'Navegador sem suporte a push.';
      if (btnOn) btnOn.disabled = true;
      if (btnOff) btnOff.disabled = true;
      return;
    }

    var sub = await currentSubscription();
    var on = !!sub;
    if (status) {
      status.textContent = on
        ? 'Notificações ativas neste aparelho.'
        : (Notification.permission === 'denied'
          ? 'Bloqueadas pelo navegador.'
          : 'Desativadas neste aparelho.');
    }
    if (btnOn) {
      btnOn.hidden = on;
      btnOn.disabled = false;
    }
    if (btnOff) {
      btnOff.hidden = !on;
      btnOff.disabled = false;
    }
  }

  function wireButtons() {
    var btnOn = $('btn-push-enable');
    var btnOff = $('btn-push-disable');
    if (btnOn && btnOn.dataset.bound !== '1') {
      btnOn.dataset.bound = '1';
      btnOn.addEventListener('click', async function () {
        btnOn.disabled = true;
        setMsg('Ativando…', true);
        try {
          await enable();
          setMsg('Notificações ativadas.', true);
          await refreshUI();
        } catch (err) {
          setMsg(err.message || 'Falha ao ativar', false);
          btnOn.disabled = false;
        }
      });
    }
    if (btnOff && btnOff.dataset.bound !== '1') {
      btnOff.dataset.bound = '1';
      btnOff.addEventListener('click', async function () {
        btnOff.disabled = true;
        setMsg('Desativando…', true);
        try {
          await disable();
          setMsg('Notificações desativadas.', true);
          await refreshUI();
        } catch (err) {
          setMsg(err.message || 'Falha ao desativar', false);
          btnOff.disabled = false;
        }
      });
    }
  }

  async function boot() {
    if (!supported()) {
      console.info('[FASC push] sem suporte neste browser');
      return;
    }
    wireButtons();
    try {
      // Registra SW cedo (mesmo sem ativar push)
      await ensureSW();
    } catch (e) {
      console.warn('[FASC push] SW', e.message || e);
    }
    try {
      await refreshUI();
    } catch (e) {
      console.warn('[FASC push] UI', e.message || e);
    }

    if (window.fascAuth && window.fascAuth.onChange) {
      window.fascAuth.onChange(function () {
        refreshUI().catch(function () {});
      });
    }
    console.info('[FASC push] pronto');
  }

  window.fascPush = {
    enable: enable,
    disable: disable,
    currentSubscription: currentSubscription,
    refreshUI: refreshUI,
    supported: supported,
    boot: boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      boot().catch(function (e) { console.warn('[FASC push]', e); });
    });
  } else {
    boot().catch(function (e) { console.warn('[FASC push]', e); });
  }
})();
