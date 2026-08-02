// FASC+ profile app — auth e-mail/senha + Google + perfil + caixinha
(function () {
  var AVATARS = ["🎨","🔥","🤙","🌀","💀","🖤","🧿","🧱","🕶️","🧃","🐸","🐯","🐉","⚡","🌙","💣","🎯","📡","🏙️","🎭","🔊","✨","🪩","🌶️"];
  var selectedAvatar = '🎨';
  var mode = 'login'; // login | signup
  var authBound = false;

  function $(id) { return document.getElementById(id); }
  function msg(id, text, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'msg' + (text ? (ok ? ' ok' : ' err') : '');
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  // ---- a11y FAB ----
  function wireA11y() {
    var toggle = $('a11y-toggle');
    var drawer = $('a11y-drawer');
    var wrap = $('a11y-wrap');
    if (!toggle || !drawer || !wrap) return;
    function open() { drawer.hidden = false; toggle.setAttribute('aria-expanded', 'true'); }
    function close() { drawer.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    toggle.onclick = function (e) { e.stopPropagation(); drawer.hidden ? open() : close(); };
    var closeBtn = $('a11y-close');
    if (closeBtn) closeBtn.onclick = function (e) { e.stopPropagation(); close(); };
    document.addEventListener('click', function (e) {
      if (!drawer.hidden && wrap && !wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    // chips
    wrap.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var k = chip.getAttribute('data-k');
      var v = chip.getAttribute('data-v');
      if (!k) return;
      wrap.querySelectorAll('.chip[data-k="' + k + '"]').forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
      var h = document.documentElement;
      if (v === 'default' || v === 'md') h.removeAttribute('data-a11y-' + k);
      else h.setAttribute('data-a11y-' + k, v);
      if (k === 'text') {
        h.style.fontSize = v === 'lg' ? '112%' : v === 'xl' ? '125%' : '';
      }
      if (k === 'theme') {
        if (v === 'light') { document.body.style.background = '#f3ecdc'; document.body.style.color = '#1c1511'; }
        else if (v === 'dark') { document.body.style.background = '#000'; document.body.style.color = '#fff'; }
        else { document.body.style.background = ''; document.body.style.color = ''; }
      }
      if (k === 'contrast' && v === 'high') {
        document.body.style.background = '#000'; document.body.style.color = '#fff';
      } else if (k === 'contrast') {
        /* leave theme to handle */
      }
    });
  }

  // ---- avatars ----
  function renderAvatars() {
    var grid = $('avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    AVATARS.forEach(function (em) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = em;
      b.setAttribute('aria-pressed', em === selectedAvatar ? 'true' : 'false');
      b.onclick = function () {
        selectedAvatar = em;
        if ($('pphoto')) $('pphoto').value = '';
        updateAvatar();
        grid.querySelectorAll('button').forEach(function (x) {
          x.setAttribute('aria-pressed', x.textContent === selectedAvatar ? 'true' : 'false');
        });
      };
      grid.appendChild(b);
    });
  }
  function updateAvatar() {
    var box = $('avatar');
    if (!box) return;
    var url = ($('pphoto') && $('pphoto').value.trim()) || '';
    if (url) {
      box.innerHTML = '';
      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Foto';
      img.onerror = function () { box.textContent = selectedAvatar; };
      box.appendChild(img);
    } else {
      box.textContent = selectedAvatar;
    }
  }

  // ---- session UI ----

  function syncHero() {
    var name = ($('pname') && $('pname').value.trim()) || 'Seu nome';
    var handle = ($('phandle') && $('phandle').value.trim().replace(/^@/, '')) || 'nick';
    var bio = ($('pbio') && $('pbio').value.trim()) || '';
    if ($('display-name')) $('display-name').textContent = name;
    if ($('handle-line')) $('handle-line').textContent = '@' + handle;
    if ($('bio-preview')) $('bio-preview').textContent = bio;
    updateAvatar();
  }

  function showLoggedOut() {
    if ($('login-card')) $('login-card').hidden = false;
    if ($('profile-wrap')) $('profile-wrap').hidden = true;
    if ($('inbox-card')) $('inbox-card').hidden = true;
  }
  function showLoggedIn(user) {
    if ($('login-card')) $('login-card').hidden = true;
    if ($('profile-wrap')) $('profile-wrap').hidden = false;
    if ($('inbox-card')) $('inbox-card').hidden = false;
    if ($('uid')) $('uid').textContent = '' + user.id;
  }

  async function loadProfile(uid) {
    if (!window.fascDb) return;
    try {
      var res = await Promise.race([
        window.fascDb.from('profiles').select('id,name,handle,photo_url,bio,city').eq('id', uid).maybeSingle(),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 4000); })
      ]);
      if (res.error || !res.data) return;
      var d = res.data;
      if ($('pname')) $('pname').value = d.name || '';
      if ($('phandle')) $('phandle').value = d.handle || '';
      if ($('pbio')) $('pbio').value = d.bio || '';
      if (d.photo_url && String(d.photo_url).indexOf('emoji:') === 0) {
        selectedAvatar = d.photo_url.slice(6) || '🎨';
        if ($('pphoto')) $('pphoto').value = '';
      } else if (d.photo_url) {
        if ($('pphoto')) $('pphoto').value = d.photo_url;
      }
      renderAvatars();
      syncHero();
    } catch (e) {
      console.warn('[profile]', e.message || e);
    }
  }

  async function refreshSession() {
    // Login form stays visible until we KNOW there is a user
    showLoggedOut();
    if (!window.fascAuth) {
      msg('auth-msg', 'Não foi possível conectar ao servidor de login. Tente de novo em instantes.', false);
      return;
    }
    try {
      var user = await window.fascAuth.user();
      if (!user) return;
      showLoggedIn(user);
      await loadProfile(user.id);
      loadInbox();
      updateShareHint();
    } catch (e) {
      console.warn('[session]', e);
      showLoggedOut();
    }
  }

  // ---- auth form ----
  function wireAuth() {
    var tabLogin = $('tab-login');
    var tabSignup = $('tab-signup');
    var nameWrap = $('name-wrap');
    var submit = $('auth-submit');
    var form = $('auth-form');

    function setMode(m) {
      mode = m;
      var signup = m === 'signup';
      if (tabLogin) tabLogin.setAttribute('aria-selected', signup ? 'false' : 'true');
      if (tabSignup) tabSignup.setAttribute('aria-selected', signup ? 'true' : 'false');
      if (nameWrap) nameWrap.hidden = !signup;
      if (submit) submit.textContent = signup ? 'Criar conta' : 'Entrar';
      if ($('password')) $('password').autocomplete = signup ? 'new-password' : 'current-password';
      msg('auth-msg', '', true);
    }
    if (tabLogin) tabLogin.onclick = function () { setMode('login'); };
    if (tabSignup) tabSignup.onclick = function () { setMode('signup'); };

    if (form) {
      form.onsubmit = async function (e) {
        e.preventDefault();
        if (!window.fascAuth) {
          msg('auth-msg', 'Login indisponível (Supabase não carregou).', false);
          return;
        }
        var email = ($('email') && $('email').value.trim()) || '';
        var password = ($('password') && $('password').value) || '';
        if (submit) submit.disabled = true;
        try {
          if (mode === 'signup') {
            msg('auth-msg', 'Criando conta…', true);
            var name = ($('name') && $('name').value.trim()) || '';
            var data = await window.fascAuth.signUp(email, password, name);
            if (data && data.session) {
              msg('auth-msg', 'Conta criada.', true);
              await refreshSession();
            } else {
              msg('auth-msg', 'Conta criada. Confirme o e-mail (só uma vez) e depois entre com a senha.', true);
              setMode('login');
            }
          } else {
            msg('auth-msg', 'Entrando…', true);
            await window.fascAuth.signIn(email, password);
            msg('auth-msg', 'Ok.', true);
            await refreshSession();
          }
        } catch (err) {
          msg('auth-msg', err.message || 'Falha na autenticação', false);
        } finally {
          if (submit) submit.disabled = false;
        }
      };
    }

    var g = $('btn-google');
    if (g) {
      g.onclick = async function () {
        if (!window.fascAuth) {
          msg('auth-msg', 'Login indisponível.', false);
          return;
        }
        msg('auth-msg', 'Abrindo Google…', true);
        try {
          await window.fascAuth.signInWithGoogle();
        } catch (err) {
          msg('auth-msg', err.message || 'Ative o provider Google no Supabase.', false);
        }
      };
    }

    if ($('btn-logout')) {
      $('btn-logout').onclick = async function () {
        try { await window.fascAuth.signOut(); } catch (_) {}
        showLoggedOut();
        msg('auth-msg', 'Saiu da conta.', true);
      };
    }

    if ($('btn-save')) {
      $('btn-save').onclick = async function () {
        if (!window.fascAuth || !window.fascDb) return;
        var user = await window.fascAuth.user();
        if (!user) return;
        var handle = ($('phandle') && $('phandle').value.trim().replace(/^@/, '').toLowerCase()) || '';
        if (!handle) {
          msg('profile-msg', 'Nick é obrigatório.', false);
          if ($('phandle')) $('phandle').focus();
          return;
        }
        if (!/^[a-z0-9._]{3,40}$/.test(handle)) {
          msg('profile-msg', 'Nick: 3–40 caracteres (letras minúsculas, números, . ou _).', false);
          return;
        }
        var photoUrl = ($('pphoto') && $('pphoto').value.trim()) || '';
        var photo = photoUrl || ('emoji:' + selectedAvatar);
        var name = ($('pname') && $('pname').value.trim()) || handle;
        var bio = ($('pbio') && $('pbio').value.trim()) || null;
        msg('profile-msg', 'Salvando…', true);
        try {
          var payload = { id: user.id, name: name, handle: handle, photo_url: photo, city: 'São Cristóvão' };
          var res = await window.fascDb.from('profiles').upsert(Object.assign({}, payload, { bio: bio }), { onConflict: 'id' });
          if (res.error && /bio/i.test(res.error.message || '')) {
            res = await window.fascDb.from('profiles').upsert(payload, { onConflict: 'id' });
          }
          if (res.error) throw res.error;
          msg('profile-msg', 'Perfil salvo.', true);
          if (typeof syncHero === 'function') syncHero();
          else {
            if ($('display-name')) $('display-name').textContent = name;
            if ($('handle-line')) $('handle-line').textContent = '@' + handle;
            if ($('bio-preview')) $('bio-preview').textContent = bio || '';
          }
          updateShareHint();
        } catch (err) {
          msg('profile-msg', err.message || 'Erro ao salvar', false);
        }
      };
    }

    if ($('pphoto')) $('pphoto').oninput = function(){ updateAvatar(); syncHero(); };
    ['pname','phandle','pbio'].forEach(function(id){ var el=$(id); if(el) el.addEventListener('input', syncHero); });
  }

  // ---- inbox ----
  async function loadInbox() {
    var list = $('inbox-list');
    if (!list || !window.fascDb || !window.fascAuth) return;
    try {
      var user = await window.fascAuth.user();
      if (!user) return;
      var res = await Promise.race([
        window.fascDb.from('inbox_anon').select('id,body,is_anonymous,answer,created_at')
          .eq('to_profile_id', user.id).eq('is_hidden', false)
          .order('created_at', { ascending: false }).limit(40),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 4000); })
      ]);
      if (res.error) {
        list.innerHTML = '<p class="lead">Caixinha indisponível (rode o SQL STEP_C no Supabase).</p>';
        return;
      }
      var rows = res.data || [];
      if (!rows.length) {
        list.innerHTML = '<p class="lead">Nenhum recado ainda.</p>';
        return;
      }
      list.innerHTML = rows.map(function (m) {
        return '<div style="border:1px solid rgba(28,21,17,0.15);border-radius:6px;padding:0.65rem;margin-bottom:0.5rem;background:#fffef8">' +
          '<div style="font-size:0.75rem;color:#7a7166">' + (m.is_anonymous ? 'anônimo' : 'identificado') + '</div>' +
          '<p style="margin:0.35rem 0">' + escapeHtml(m.body) + '</p>' +
          (m.answer ? '<div style="border-left:3px solid #d42f62;padding-left:0.5rem;font-size:0.88rem"><b>Resposta:</b> ' + escapeHtml(m.answer) + '</div>' : '') +
          '</div>';
      }).join('');
    } catch (e) {
      console.warn('[inbox]', e.message || e);
    }
  }

  async function updateShareHint() {
    var hint = $('share-hint');
    if (!hint || !window.fascDb || !window.fascAuth) return;
    try {
      var user = await window.fascAuth.user();
      if (!user) return;
      var res = await window.fascDb.from('profiles').select('handle').eq('id', user.id).maybeSingle();
      var h = res.data && res.data.handle;
      if (h) {
        hint.hidden = false;
        hint.innerHTML = 'Compartilha: <code>profile.html?u=' + escapeHtml(h) + '</code>';
      }
    } catch (_) {}
  }

  async function wireSend() {
    var params = new URLSearchParams(window.location.search);
    var handle = (params.get('u') || params.get('to') || '').replace(/^@/, '').trim();
    var card = $('send-card');
    if (!handle || !window.fascDb || !card) return;
    try {
      var res = await Promise.race([
        window.fascDb.from('profiles').select('id,name,handle').eq('handle', handle).maybeSingle(),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 4000); })
      ]);
      if (res.error || !res.data) return;
      var target = res.data;
      var me = window.fascAuth ? await window.fascAuth.user() : null;
      if (me && me.id === target.id) return;
      card.hidden = false;
      if ($('send-title')) $('send-title').textContent = 'Recado anônimo pra ' + (target.name || target.handle);
      if ($('send-sub')) $('send-sub').textContent = '@' + (target.handle || '');
      var form = $('send-form');
      if (form) {
        form.onsubmit = async function (e) {
          e.preventDefault();
          if (!window.fascAuth) {
            msg('send-msg', 'Entre na sua conta para enviar.', false);
            return;
          }
          var user = await window.fascAuth.user();
          if (!user) {
            msg('send-msg', 'Entre na sua conta para enviar.', false);
            return;
          }
          var body = ($('send-body') && $('send-body').value.trim()) || '';
          var identify = $('send-identify') && $('send-identify').checked;
          try {
            var ins = await window.fascDb.from('inbox_anon').insert({
              to_profile_id: target.id,
              body: body.slice(0, 280),
              is_anonymous: !identify,
              from_profile_id: identify ? user.id : null
            });
            if (ins.error) throw ins.error;
            if ($('send-body')) $('send-body').value = '';
            msg('send-msg', 'Enviado.', true);
          } catch (err) {
            msg('send-msg', err.message || 'Falha', false);
          }
        };
      }
    } catch (e) {
      console.warn('[send]', e.message || e);
    }
  }

  function boot() {
    // UI visível imediatamente — zero espera
    showLoggedOut();
    wireA11y();
    renderAvatars();
    updateAvatar();
    wireAuth();
    wireSend();

    // sessão em paralelo, com falha silenciosa
    setTimeout(function () {
      refreshSession().catch(function (e) { console.warn(e); });
    }, 0);

    if (!authBound && window.fascAuth && window.fascAuth.onChange) {
      authBound = true;
      window.fascAuth.onChange(function (event) {
        // evita loop: só reage a eventos úteis
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          refreshSession().catch(function () {});
        }
      });
    }
    window.__fascProfileBooted = true;
    console.info('[FASC] profile-app pronto');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
