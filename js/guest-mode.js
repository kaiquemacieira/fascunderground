/**
 * CRICRI · modo convidado
 * - Visualização liberada; interações restritas
 * - Banner com dica de cadastro
 */
(function () {
  'use strict';

  var KEEP_KEY = 'cricri-keep-session';
  var SAVED_KEY = 'cricri-saved-user';

  function keepOn() {
    try { return localStorage.getItem(KEEP_KEY) !== '0'; } catch (_) { return true; }
  }
  function hasSavedUser() {
    try {
      var raw = localStorage.getItem(SAVED_KEY);
      if (!raw) return false;
      var u = JSON.parse(raw);
      return !!(u && (u.id || u.email || u.name));
    } catch (_) { return false; }
  }
  function hasSupabaseToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && /auth-token|supabase\.auth\.token/i.test(k)) {
          var v = localStorage.getItem(k);
          if (v && v.length > 40) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function hasLocalHint() {
    return keepOn() && (hasSavedUser() || hasSupabaseToken());
  }

  var _loggedIn = null;

  async function resolveAuth() {
    if (window.fascAuth && typeof window.fascAuth.session === 'function') {
      try {
        var s = await window.fascAuth.session();
        if (s && s.user) {
          _loggedIn = true;
          return true;
        }
      } catch (_) {}
    }
    _loggedIn = false;
    return false;
  }

  function isGuest() {
    if (_loggedIn === true) return false;
    if (_loggedIn === false) return true;
    return !hasLocalHint();
  }

  function injectBanner() {
    if (document.getElementById('cricri-guest-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'cricri-guest-banner';
    bar.className = 'cricri-guest-banner';
    bar.setAttribute('role', 'status');
    bar.innerHTML =
      '<p>Você está no <strong>modo convidado</strong> — pode olhar, mas pra interagir de verdade precisa de conta.</p>' +
      '<a class="cricri-guest-cta" href="login.html">Criar conta / Entrar</a>';
    var anchor = document.querySelector('main') || document.body;
    if (anchor.firstChild) anchor.insertBefore(bar, anchor.firstChild);
    else anchor.appendChild(bar);
  }

  function applyRestrictions() {
    document.documentElement.classList.add('is-guest');
    document.body.classList.add('is-guest');
    injectBanner();

    // Desabilita ações de escrita comuns
    // NÃO trava formulário de login/cadastro (#auth-form) — senão "Criar conta" quebra no perfil
    var selectors = [
      '#mural-post-btn',
      '#mural-post-body',
      '[data-action="feed"]',
      '[data-action="play"]',
      '[data-action="clean"]',
      '[data-action="sleep"]',
      '[data-action="medicine"]',
      '[data-action="after"]',
      '[data-action="scrap"]',
      '[data-action="start"]',
      '#denuncia-submit',
      '.btn-edit-profile',
      '#profile-edit-btn'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        // Nunca travar botões/inputs dentro do formulário de auth
        if (el.closest && el.closest('#auth-form, .auth-form, #login-form, form[data-auth]')) return;
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.setAttribute('readonly', 'readonly');
          el.setAttribute('placeholder', 'Entre na conta pra interagir');
        } else {
          el.setAttribute('disabled', 'disabled');
          el.setAttribute('title', 'Disponível para quem tem conta');
        }
        el.classList.add('is-guest-locked');
      });
    });
  }

  function clearGuest() {
    document.documentElement.classList.remove('is-guest');
    document.body.classList.remove('is-guest');
    var b = document.getElementById('cricri-guest-banner');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  async function boot() {
    var logged = await resolveAuth();
    if (!logged && !hasLocalHint()) {
      applyRestrictions();
    } else if (!logged && hasLocalHint()) {
      // pista local — espera fascAuth; se falhar, trata como convidado soft
      var tries = 0;
      var t = setInterval(async function () {
        tries++;
        if (window.fascAuth && typeof window.fascAuth.session === 'function') {
          clearInterval(t);
          var ok = await resolveAuth();
          if (!ok) applyRestrictions();
          else clearGuest();
        } else if (tries > 40) {
          clearInterval(t);
          // mantém hint local: não força guest hard
        }
      }, 100);
    } else {
      clearGuest();
    }
  }

  window.CricriGuest = {
    isGuest: isGuest,
    hasLocalHint: hasLocalHint,
    refresh: boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
