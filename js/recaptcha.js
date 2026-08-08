/**
 * CRICRI · reCAPTCHA v3 (invisível)
 * Site key pública em FASC_CONFIG.recaptchaSiteKey
 * Secret só no Supabase: RECAPTCHA_SECRET_KEY
 */
(function (global) {
  'use strict';

  var SCRIPT_ID = 'cricri-recaptcha-v3';
  var loadPromise = null;

  function siteKey() {
    try {
      return (global.FASC_CONFIG && global.FASC_CONFIG.recaptchaSiteKey) || '';
    } catch (_) {
      return '';
    }
  }

  function loadScript() {
    var key = siteKey();
    if (!key) return Promise.resolve(false);
    if (global.grecaptcha && global.grecaptcha.execute) return Promise.resolve(true);
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve) {
      var existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.addEventListener('load', function () { resolve(!!global.grecaptcha); });
        existing.addEventListener('error', function () { resolve(false); });
        return;
      }
      var s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(key);
      s.async = true;
      s.defer = true;
      s.onload = function () { resolve(!!global.grecaptcha); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return loadPromise;
  }

  /**
   * @param {string} action — ex: 'denuncia', 'role_request', 'login'
   * @returns {Promise<string>} token ou '' se não configurado
   */
  async function getToken(action) {
    var key = siteKey();
    if (!key) return '';
    var ok = await loadScript();
    if (!ok || !global.grecaptcha) return '';
    try {
      await new Promise(function (resolve) {
        global.grecaptcha.ready(resolve);
      });
      var token = await global.grecaptcha.execute(key, { action: action || 'submit' });
      return token || '';
    } catch (e) {
      console.warn('[CRICRI recaptcha]', e);
      return '';
    }
  }

  global.CricriRecaptcha = {
    siteKey: siteKey,
    load: loadScript,
    getToken: getToken,
    enabled: function () { return !!siteKey(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
