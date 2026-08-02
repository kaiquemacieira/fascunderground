// FASC+ — página de perfil + a11y local
(function () {
  const AVATARS = ['🎨','🤙','🔥','🌀','💀','🖤','🧿','🗯️','🧱','📼','🕶️','🧃','🐸','🐯','🐉',' Crowley','⚡','🌙','💣','🎯','📡','🏙️','🎭','🔊'];
  const KEY = 'fasc-a11y-v1';
  const defaults = {
    text: 'md', contrast: 'default', theme: 'default', motion: 'default',
    font: 'default', spacing: 'default', links: 'default', color: 'default', cursor: 'default'
  };

  function $(id) { return document.getElementById(id); }

  function loadA11y() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch { return Object.assign({}, defaults); }
  }
  function saveA11y(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }
  function applyA11y(state) {
    const h = document.documentElement;
    const map = {
      text: 'data-a11y-text', contrast: 'data-a11y-contrast', theme: 'data-a11y-theme',
      motion: 'data-a11y-motion', font: 'data-a11y-font', spacing: 'data-a11y-spacing',
      links: 'data-a11y-links', color: 'data-a11y-color', cursor: 'data-a11y-cursor'
    };
    Object.keys(map).forEach(function (k) {
      var v = state[k] || defaults[k];
      if (!v || v === 'default' || v === 'md') h.removeAttribute(map[k]);
      else h.setAttribute(map[k], v);
    });
    document.querySelectorAll('#a11y-panel-profile [data-a11y-set]').forEach(function (btn) {
      var raw = btn.getAttribute('data-a11y-set') || '';
      var parts = raw.split(':');
      btn.setAttribute('aria-pressed', state[parts[0]] === parts[1] ? 'true' : 'false');
    });
  }
  
  function wireA11yDrawer() {
    var toggle = $('profile-a11y-toggle');
    var drawer = $('profile-a11y-drawer');
    var wrap = $('profile-a11y-wrap');
    if (!toggle || !drawer || !wrap) {
      console.warn('[FASC a11y] drawer elements missing', {
        toggle: !!toggle, drawer: !!drawer, wrap: !!wrap
      });
      return;
    }

    var ignoreDocClickUntil = 0;

    function isOpen() {
      return !drawer.hasAttribute('hidden');
    }

    function open() {
      drawer.removeAttribute('hidden');
      drawer.style.display = 'block';
      toggle.setAttribute('aria-expanded', 'true');
      ignoreDocClickUntil = Date.now() + 300;
      console.info('[FASC a11y] aberto');
    }

    function close() {
      drawer.setAttribute('hidden', '');
      drawer.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
      console.info('[FASC a11y] fechado');
    }

    // API global (usada pelos onclick inline)
    window.fascA11yOpen = open;
    window.fascA11yClose = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      close();
    };
    window.fascA11yToggle = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isOpen()) close();
      else open();
    };

    // pointerdown = mais confiável em mobile que click
    function onPointer(e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#profile-a11y-close') || t.closest('#profile-a11y-close-bottom')) {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (t.closest('#profile-a11y-toggle')) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen()) close();
        else open();
      }
    }

    wrap.addEventListener('pointerdown', onPointer, true);
    wrap.addEventListener('click', onPointer, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        e.preventDefault();
        close();
      }
    });

    document.addEventListener('pointerdown', function (e) {
      if (Date.now() < ignoreDocClickUntil) return;
      if (!isOpen()) return;
      if (wrap.contains(e.target)) return;
      close();
    }, true);

    // estado inicial
    if (drawer.hasAttribute('hidden')) {
      drawer.style.display = 'none';
    }

    console.info('[FASC a11y] drawer pronto · toggle/close via pointerdown + onclick');
  }

  function wireA11y() {
    var state = loadA11y();
    applyA11y(state);
    var panel = $('a11y-panel-profile');
    if (!panel) return;
    panel.addEventListener('click', function (e) {
      if (e.target.closest('#a11y-reset-profile')) {
        state = Object.assign({}, defaults);
        applyA11y(state);
        saveA11y(state);
        return;
      }
      var btn = e.target.closest('[data-a11y-set]');
      if (!btn) return;
      var raw = btn.getAttribute('data-a11y-set') || '';
      var parts = raw.split(':');
      if (!parts[0]) return;
      state[parts[0]] = parts[1];
      applyA11y(state);
      saveA11y(state);
    });
  }

  var selectedAvatar = '🎨';
  var photoUrl = '';

  function renderAvatarGrid() {
    var grid = $('avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    AVATARS.forEach(function (emoji) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-opt';
      b.textContent = emoji;
      b.setAttribute('aria-label', 'Avatar ' + emoji);
      b.setAttribute('aria-pressed', emoji === selectedAvatar ? 'true' : 'false');
      b.addEventListener('click', function () {
        selectedAvatar = emoji;
        photoUrl = '';
        if ($('profile-photo')) $('profile-photo').value = '';
        updatePreview();
        grid.querySelectorAll('.avatar-opt').forEach(function (x) {
          x.setAttribute('aria-pressed', x.textContent === selectedAvatar ? 'true' : 'false');
        });
      });
      grid.appendChild(b);
    });
  }

  function updatePreview() {
    var box = $('avatar-preview');
    if (!box) return;
    var url = ($('profile-photo') && $('profile-photo').value.trim()) || photoUrl;
    if (url) {
      box.innerHTML = '';
      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Foto de perfil';
      img.onerror = function () { box.textContent = selectedAvatar; };
      box.appendChild(img);
    } else {
      box.textContent = selectedAvatar;
    }
  }

  function setMsg(id, text, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
    el.classList.toggle('err', !!(text && !ok));
  }

  async function loadProfile(uid) {
    if (!window.fascDb) return;
    var res;
    try {
      var q = window.fascDb.from('profiles').select('*').eq('id', uid).maybeSingle();
      res = await (window.fascAuth && window.fascAuth.withTimeout
        ? window.fascAuth.withTimeout(q, 4000, 'perfil')
        : q);
    } catch (e) {
      console.warn('[profile]', e.message || e);
      return;
    }
    if (res.error) { console.warn('[profile]', res.error.message); return; }
    var data = res.data;
    if (!data) return;
    if ($('profile-name')) $('profile-name').value = data.name || '';
    if ($('profile-handle')) $('profile-handle').value = data.handle || '';
    if ($('profile-bio')) $('profile-bio').value = data.bio || '';
    if (data.photo_url) {
      if (String(data.photo_url).indexOf('emoji:') === 0) {
        selectedAvatar = data.photo_url.slice(6) || '🎨';
        photoUrl = '';
        if ($('profile-photo')) $('profile-photo').value = '';
      } else {
        photoUrl = data.photo_url;
        if ($('profile-photo')) $('profile-photo').value = data.photo_url;
      }
    }
    renderAvatarGrid();
    updatePreview();
  }

  async function showSession() {
    var loginCard = $('login-card');
    var profileCard = $('profile-card');
    var status = $('auth-status');

    // Sempre mostra o formulário de login até confirmar usuário
    if (loginCard) {
      loginCard.hidden = false;
      loginCard.style.display = '';
    }
    if (status) status.textContent = 'Verificando sessão…';

    try {
      if (!window.fascAuth) {
        if (status) status.textContent = '';
        if (profileCard) profileCard.hidden = true;
        return null;
      }
      var user = await window.fascAuth.user();
      if (!user) {
        if (status) status.textContent = '';
        if (profileCard) profileCard.hidden = true;
        return null;
      }
      // Usuário ok → esconde login, mostra perfil
      if (loginCard) loginCard.hidden = true;
      if (profileCard) {
        profileCard.hidden = false;
        profileCard.style.display = '';
      }
      if ($('profile-uid')) $('profile-uid').textContent = 'id: ' + user.id;
      if (status) status.textContent = '';
      // loadProfile não bloqueia a UI se falhar
      try { await loadProfile(user.id); } catch (e) { console.warn(e); }
      return user;
    } catch (err) {
      console.warn('[session]', err);
      if (status) status.textContent = '';
      if (loginCard) loginCard.hidden = false;
      if (profileCard) profileCard.hidden = true;
      return null;
    }
  }

  function wireAuthForms() {
    var form = $('profile-login-form');
    var tabLogin = $('tab-login');
    var tabSignup = $('tab-signup');
    var nameWrap = $('signup-name-wrap');
    var submit = $('login-submit');
    var pass = $('login-password');

    function setMode(mode) {
      if (!form) return;
      form.dataset.mode = mode;
      var isSignup = mode === 'signup';
      if (tabLogin) tabLogin.setAttribute('aria-selected', isSignup ? 'false' : 'true');
      if (tabSignup) tabSignup.setAttribute('aria-selected', isSignup ? 'true' : 'false');
      if (nameWrap) nameWrap.hidden = !isSignup;
      if (submit) submit.textContent = isSignup ? 'Criar conta' : 'Entrar';
      if (pass) pass.autocomplete = isSignup ? 'new-password' : 'current-password';
      setMsg('login-msg', '', true);
    }

    if (tabLogin) tabLogin.addEventListener('click', function () { setMode('login'); });
    if (tabSignup) tabSignup.addEventListener('click', function () { setMode('signup'); });

    if (form && form.dataset.bound !== '1') {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var email = ($('login-email') && $('login-email').value.trim()) || '';
        var password = ($('login-password') && $('login-password').value) || '';
        var mode = form.dataset.mode || 'login';
        if (!window.fascAuth) {
          setMsg('login-msg', 'Supabase não carregou. Confira a rede.', false);
          return;
        }
        if (submit) submit.disabled = true;
        try {
          if (mode === 'signup') {
            var name = ($('signup-name') && $('signup-name').value.trim()) || '';
            setMsg('login-msg', 'Criando conta…', true);
            var data = await window.fascAuth.signUp(email, password, name);
            if (data.session) {
              setMsg('login-msg', 'Conta criada. Entrando…', true);
              await showSession();
            } else {
              setMsg('login-msg', 'Conta criada. Confirme o link no e-mail (só uma vez) e depois entre com senha.', true);
              setMode('login');
            }
          } else {
            setMsg('login-msg', 'Entrando…', true);
            await window.fascAuth.signIn(email, password);
            setMsg('login-msg', 'Login ok.', true);
            await showSession();
          }
        } catch (err) {
          setMsg('login-msg', err.message || 'Falha na autenticação', false);
        } finally {
          if (submit) submit.disabled = false;
        }
      });
    }

    var gbtn = $('btn-google');
    if (gbtn && gbtn.dataset.bound !== '1') {
      gbtn.dataset.bound = '1';
      gbtn.addEventListener('click', async function () {
        if (!window.fascAuth) {
          setMsg('login-msg', 'Supabase não carregou.', false);
          return;
        }
        setMsg('login-msg', 'Abrindo Google…', true);
        try {
          await window.fascAuth.signInWithGoogle();
        } catch (err) {
          setMsg('login-msg', err.message || 'Google indisponível — ative o provider no Supabase.', false);
        }
      });
    }
  }

  function wire() {
    wireA11y();
    wireA11yDrawer();
    renderAvatarGrid();
    updatePreview();
    wireAuthForms();
    if ($('profile-photo')) $('profile-photo').addEventListener('input', updatePreview);
    if ($('profile-save')) $('profile-save').addEventListener('click', function () { saveProfile(); });
    if ($('profile-logout')) {
      $('profile-logout').addEventListener('click', async function () {
        try {
          await window.fascAuth.signOut();
        } catch (_) {}
        setMsg('profile-msg', '', true);
        showSession();
      });
    }
    // UI nunca fica presa: login visível na hora
    var lc = $('login-card');
    var pc = $('profile-card');
    if (lc) { lc.hidden = false; lc.style.display = ''; }
    if (pc) pc.hidden = true;
    var st = $('auth-status');
    if (st) st.textContent = '';
    setTimeout(function () {
      showSession().catch(function (e) { console.warn(e); });
    }, 0);
    if (!window.__fascAuthBound && window.fascAuth && window.fascAuth.onChange) {
      window.__fascAuthBound = true;
      window.fascAuth.onChange(function () {
        showSession().catch(function (e) { console.warn(e); });
      });
    }
    console.info('[FASC] profile page pronta');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
