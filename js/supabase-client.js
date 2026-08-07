// FASC+ — client Supabase (vanilla)
(function () {
  const cfg = window.FASC_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    console.error('[FASC+] FASC_CONFIG ausente');
    window.fascAuth = null;
    return;
  }
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('[FASC+] supabase-js não carregou (CDN)');
    window.fascAuth = null;
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.fascDb = client;

  /** Pós-OAuth / e-mail: volta pro login (animação → mural). */
  function profileRedirect() {
    try {
      var u = new URL('login.html', window.location.href);
      return u.origin + u.pathname;
    } catch (e) {
      return window.location.origin.replace(/\/$/, '') + '/login.html';
    }
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error((label || 'operação') + ' demorou demais'));
        }, ms);
      })
    ]);
  }

  window.fascAuth = {
    withTimeout: withTimeout,
    async session() {
      try {
        var res = await withTimeout(client.auth.getSession(), 2500, 'sessão');
        if (res.error) console.warn('[FASC auth]', res.error.message);
        return (res.data && res.data.session) || null;
      } catch (e) {
        console.warn('[FASC auth] session:', e.message || e);
        return null;
      }
    },
    async user() {
      var s = await this.session();
      return s ? s.user : null;
    },
    async signUp(email, password, name) {
      var res = await client.auth.signUp({
        email: String(email || '').trim(),
        password: String(password || ''),
        options: {
          emailRedirectTo: profileRedirect(),
          data: { name: name || 'novo usuário' }
        }
      });
      if (res.error) {
        var msg = (res.error.message || '').toLowerCase();
        if (/already\s*registered|already\s*exists|user\s*already|email.*exist|duplicate/i.test(msg)) {
          var e = new Error('Este e-mail já está cadastrado. Tente outro ou entre com a senha.');
          e.code = res.error.code || 'user_already_exists';
          e.status = res.error.status;
          throw e;
        }
        throw res.error;
      }
      // Supabase às vezes retorna user sem session quando e-mail já existe (identities vazias)
      try {
        var u = res.data && res.data.user;
        if (u && Array.isArray(u.identities) && u.identities.length === 0) {
          throw new Error('Este e-mail já está cadastrado. Tente outro ou entre com a senha.');
        }
      } catch (x) {
        if (x && /já está cadastrado/i.test(x.message || '')) throw x;
      }
      return res.data;
    },
    async signIn(email, password) {
      var res = await client.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: String(password || '')
      });
      if (res.error) {
        var msg = (res.error.message || '').toLowerCase();
        if (/invalid\s*login|invalid\s*credentials|email\s*not\s*confirmed/i.test(msg)) {
          var e = new Error(
            /not\s*confirmed/i.test(msg)
              ? 'Confirme o e-mail antes de entrar (veja a caixa de entrada).'
              : 'E-mail ou senha incorretos. Tente de novo.'
          );
          e.code = res.error.code;
          throw e;
        }
        throw res.error;
      }
      return res.data;
    },
    async signInWithGoogle() {
      var redirectTo = profileRedirect();
      console.info('[FASC auth] Google redirectTo =', redirectTo);
      var res = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
          skipBrowserRedirect: false
        }
      });
      if (res.error) throw res.error;
      if (res.data && res.data.url) {
        window.location.assign(res.data.url);
      }
      return res.data;
    },
    async signOut() {
      var res = await client.auth.signOut();
      if (res.error) throw res.error;
    },
    onChange: function (cb) {
      var out = client.auth.onAuthStateChange(function (event, session) {
        try { cb(event, session); } catch (e) { console.warn(e); }
      });
      return out.data && out.data.subscription;
    }
  };

  console.info('[FASC+] Supabase client pronto ·', cfg.env || 'dev');
})();
