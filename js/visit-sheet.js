/**
 * CRICRI · Folha de visita de perfil
 * Card fluido: foto, CRI, stats, pedir amizade, ver perfil, meow
 *
 * CricriVisit.open({ handle?, userId?, name?, photo_url? })
 */
(function () {
  'use strict';
  if (window.CricriVisit) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function injectCss() {
    if (document.getElementById('cricri-visit-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-visit-css';
    s.textContent = [
      '#cricri-visit-sheet{position:fixed;inset:0;z-index:100080;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,0.55);padding:0;padding-bottom:env(safe-area-inset-bottom,0px)}',
      '#cricri-visit-sheet[hidden]{display:none!important}',
      '#cricri-visit-sheet .vs-card{width:min(100%,420px);max-height:min(88vh,640px);overflow:auto;',
      'background:linear-gradient(165deg,#1c1612 0%,#120e0c 100%);border:1.5px solid rgba(230,220,196,0.14);',
      'border-radius:18px 18px 0 0;padding:1.15rem 1.1rem 1.35rem;color:#ebe3cf;',
      'box-shadow:0 -16px 48px rgba(0,0,0,0.5);animation:vs-up .28s ease}',
      '@keyframes vs-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
      '#cricri-visit-sheet .vs-handle{width:40px;height:4px;border-radius:99px;background:rgba(230,220,196,0.25);margin:0 auto 0.85rem}',
      '#cricri-visit-sheet .vs-head{display:flex;gap:0.85rem;align-items:center;margin-bottom:1rem}',
      '#cricri-visit-sheet .vs-av{width:64px;height:64px;border-radius:16px;overflow:hidden;flex:none;',
      'background:rgba(227,61,107,0.22);display:flex;align-items:center;justify-content:center;',
      'font-size:1.6rem;font-weight:700;font-family:Oswald,system-ui,sans-serif;border:2px solid rgba(227,61,107,0.35)}',
      '#cricri-visit-sheet .vs-av img{width:100%;height:100%;object-fit:cover}',
      '#cricri-visit-sheet .vs-meta{min-width:0;flex:1}',
      '#cricri-visit-sheet .vs-name{margin:0;font:700 1.15rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:.03em}',
      '#cricri-visit-sheet .vs-handle-txt{margin:0.15rem 0 0;font-size:0.85rem;color:#e33d6b}',
      '#cricri-visit-sheet .vs-tama{margin:0 0 1rem;padding:0.85rem;border-radius:14px;',
      'border:1.5px solid rgba(227,61,107,0.28);background:rgba(227,61,107,0.08);',
      'display:flex;gap:0.75rem;align-items:center}',
      '#cricri-visit-sheet .vs-tama-emoji{font-size:2.4rem;line-height:1;flex:none;filter:drop-shadow(0 0 10px rgba(227,61,107,0.35))}',
      '#cricri-visit-sheet .vs-tama-meta{min-width:0;flex:1;font-size:0.8rem;line-height:1.35;color:#cfc5b4}',
      '#cricri-visit-sheet .vs-tama-meta strong{color:#ebe3cf;font-size:0.95rem;display:block;margin-bottom:0.2rem}',
      '#cricri-visit-sheet .vs-stats{display:grid;grid-template-columns:1fr 1fr;gap:0.45rem;margin:0 0 1rem}',
      '#cricri-visit-sheet .vs-stat{padding:0.55rem 0.6rem;border-radius:10px;background:rgba(230,220,196,0.05);',
      'border:1px solid rgba(230,220,196,0.08);font-size:0.72rem;color:#a89f90}',
      '#cricri-visit-sheet .vs-stat b{display:block;color:#ebe3cf;font-size:0.92rem;font-family:Oswald,system-ui,sans-serif;margin-top:0.1rem}',
      '#cricri-visit-sheet .vs-actions{display:flex;flex-direction:column;gap:0.45rem}',
      '#cricri-visit-sheet .vs-btn{appearance:none;border-radius:12px;padding:0.7rem 1rem;cursor:pointer;',
      'font:600 0.8rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;border:1.5px solid transparent;text-align:center;text-decoration:none}',
      '#cricri-visit-sheet .vs-primary{background:#e33d6b;color:#fff;border-color:#e33d6b}',
      '#cricri-visit-sheet .vs-ghost{background:transparent;color:#ebe3cf;border-color:rgba(230,220,196,0.22)}',
      '#cricri-visit-sheet .vs-msg{margin:0.5rem 0 0;font-size:0.78rem;color:#8c8376;min-height:1.2em}',
      '#cricri-visit-sheet .vs-msg.ok{color:#7ecf9a}',
      '#cricri-visit-sheet .vs-msg.err{color:#f5a3b8}',
      '#cricri-visit-sheet .vs-empty-tama{opacity:0.75;font-size:0.85rem;color:#8c8376;margin:0 0 1rem;padding:0.75rem;border-radius:12px;border:1px dashed rgba(230,220,196,0.15)}',
      'html[data-theme="light"] #cricri-visit-sheet .vs-card,html[data-a11y-theme="light"] #cricri-visit-sheet .vs-card{background:#fffef8;color:#17120e}',
      'html[data-theme="light"] #cricri-visit-sheet .vs-stat b{color:#17120e}'
    ].join('');
    document.head.appendChild(s);
  }

  function avatarHtml(pr) {
    pr = pr || {};
    var photo = (pr.photo_url || '').toString();
    if (photo.indexOf('emoji:') === 0) {
      return '<div class="vs-av" aria-hidden="true">' + esc(photo.slice(6) || '🎨') + '</div>';
    }
    if (/^https?:\/\//i.test(photo)) {
      return '<div class="vs-av"><img src="' + esc(photo) + '" alt=""></div>';
    }
    var letter = ((pr.handle || pr.name || '?') + '').replace(/^@/, '').charAt(0).toUpperCase();
    return '<div class="vs-av">' + esc(letter) + '</div>';
  }

  function formLabel(id) {
    var map = {
      barroco: 'Forma Barroca',
      azulejo: 'Forma Azulejo',
      cortejo: 'Forma Cortejo',
      lenda: 'Forma Lenda',
      total: 'Cabrunco Total'
    };
    return map[id] || '';
  }

  async function resolveProfile(opts) {
    opts = opts || {};
    var client = window.fascDb;
    if (!client) throw new Error('Sem conexão');
    if (opts.userId) {
      var byId = await client.from('profiles').select('id,name,handle,photo_url,bio').eq('id', opts.userId).maybeSingle();
      if (byId.error) throw byId.error;
      if (byId.data) return byId.data;
    }
    var handle = (opts.handle || '').replace(/^@/, '').trim();
    if (!handle) throw new Error('Perfil sem nick');
    var byH = await client.from('profiles').select('id,name,handle,photo_url,bio').eq('handle', handle).maybeSingle();
    if (byH.error) throw byH.error;
    if (!byH.data) throw new Error('Perfil não encontrado');
    return byH.data;
  }

  async function loadTamaSummary(userId) {
    if (!userId || !window.fascDb) return null;
    try {
      // tenta RPC pública se existir
      if (window.fascDb.rpc) {
        var rpc = await window.fascDb.rpc('get_tama_public', { p_user_id: userId });
        if (!rpc.error && rpc.data) {
          var d = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
          if (d) return d;
        }
      }
    } catch (_) {}
    try {
      var res = await window.fascDb.from('tama_state').select('state').eq('user_id', userId).maybeSingle();
      if (res.error || !res.data || !res.data.state) return null;
      var st = res.data.state;
      if (typeof st === 'string') {
        try { st = JSON.parse(st); } catch (_) { return null; }
      }
      if (window.CricriTamaRead && window.CricriTamaRead.summarize) {
        return window.CricriTamaRead.summarize(st);
      }
      // fallback mínimo
      if (!st || !st.started) return null;
      return {
        name: st.name || 'Cri',
        stageLabel: st.stageId || '—',
        emoji: '🐾',
        shellLabel: st.shell || '—',
        careScore: st.careScore || 0,
        alive: st.alive !== false,
        formId: st.formId || null,
        formLabel: formLabel(st.formId),
        evolutions: st.evolutions || 0
      };
    } catch (_) {
      return null;
    }
  }

  function close() {
    var el = document.getElementById('cricri-visit-sheet');
    if (el) el.hidden = true;
  }

  async function open(opts) {
    opts = opts || {};
    injectCss();
    var sheet = document.getElementById('cricri-visit-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cricri-visit-sheet';
      sheet.hidden = true;
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) close();
      });
    }

    sheet.hidden = false;
    sheet.innerHTML =
      '<div class="vs-card" role="dialog" aria-modal="true" aria-label="Visitar perfil">' +
        '<div class="vs-handle" aria-hidden="true"></div>' +
        '<p style="margin:0;text-align:center;color:#8c8376;font-size:0.85rem">Carregando perfil…</p>' +
      '</div>';

    try {
      var pr = await resolveProfile(opts);
      var tama = await loadTamaSummary(pr.id);
      var me = null;
      try {
        if (window.fascAuth && window.fascAuth.user) me = await window.fascAuth.user();
      } catch (_) {}
      var isSelf = me && me.id === pr.id;
      var isFriend = false;
      if (!isSelf && me && window.CricriFriends && window.CricriFriends.isMutualFriend) {
        try { isFriend = await window.CricriFriends.isMutualFriend(pr.id); } catch (_) {}
      }

      var nick = pr.handle ? '@' + pr.handle : '';
      var tamaBlock = '';
      if (tama) {
        var form = tama.formLabel || formLabel(tama.formId) || '';
        tamaBlock =
          '<div class="vs-tama">' +
            '<div class="vs-tama-emoji" aria-hidden="true">' + esc(tama.emoji || '🐾') + '</div>' +
            '<div class="vs-tama-meta">' +
              '<strong>' + esc(tama.name || 'Cri') + '</strong>' +
              '<span>' + esc(tama.stageLabel || '—') +
                (form ? ' · ' + esc(form) : '') +
                (tama.alive === false ? ' · descansando' : '') +
              '</span>' +
            '</div>' +
          '</div>' +
          '<div class="vs-stats">' +
            '<div class="vs-stat">Care<b>' + esc(String(tama.careScore != null ? tama.careScore : '—')) + '</b></div>' +
            '<div class="vs-stat">Casca<b>' + esc(tama.shellLabel || '—') + '</b></div>' +
            '<div class="vs-stat">Evoluções<b>' + esc(String(tama.evolutions != null ? tama.evolutions : '—')) + '</b></div>' +
            '<div class="vs-stat">Forma<b>' + esc(form || '—') + '</b></div>' +
          '</div>';
      } else {
        tamaBlock = '<p class="vs-empty-tama">Este perfil ainda não tem um CRICRI na roda.</p>';
      }

      var actions = '';
      if (!isSelf) {
        if (isFriend) {
          actions += '<button type="button" class="vs-btn vs-ghost" disabled>Vocês já são amigos</button>';
        } else {
          actions += '<button type="button" class="vs-btn vs-primary" data-vs="friend">Pedir amizade</button>';
        }
        if (pr.handle) {
          actions += '<a class="vs-btn vs-ghost" href="profile.html?u=' + encodeURIComponent(pr.handle) + '">Ver perfil completo</a>';
          actions += '<a class="vs-btn vs-ghost" href="profile.html?u=' + encodeURIComponent(pr.handle) + '#caixinha-title">Mandar Meow</a>';
        }
      } else {
        actions += '<a class="vs-btn vs-primary" href="profile.html">Meu perfil</a>';
        actions += '<a class="vs-btn vs-ghost" href="tamagotchi.html">Abrir meu CRICRI</a>';
      }
      actions += '<button type="button" class="vs-btn vs-ghost" data-vs="close">Fechar</button>';

      sheet.innerHTML =
        '<div class="vs-card" role="dialog" aria-modal="true" aria-label="Perfil de ' + esc(pr.name || pr.handle || 'usuário') + '">' +
          '<div class="vs-handle" aria-hidden="true"></div>' +
          '<div class="vs-head">' +
            avatarHtml(pr) +
            '<div class="vs-meta">' +
              '<p class="vs-name">' + esc(pr.name || pr.handle || 'Alguém') + '</p>' +
              (nick ? '<p class="vs-handle-txt">' + esc(nick) + '</p>' : '') +
            '</div>' +
          '</div>' +
          tamaBlock +
          '<div class="vs-actions">' + actions + '</div>' +
          '<p class="vs-msg" id="vs-msg" role="status"></p>' +
        '</div>';

      sheet.querySelectorAll('[data-vs="close"]').forEach(function (b) {
        b.addEventListener('click', close);
      });
      var friendBtn = sheet.querySelector('[data-vs="friend"]');
      if (friendBtn) {
        friendBtn.addEventListener('click', async function () {
          var msg = document.getElementById('vs-msg');
          if (!window.CricriFriends || !window.CricriFriends.requestFriend) {
            if (msg) { msg.textContent = 'Faça login pra pedir amizade.'; msg.className = 'vs-msg err'; }
            return;
          }
          friendBtn.disabled = true;
          try {
            var result = await window.CricriFriends.requestFriend(pr.id);
            if (msg) {
              msg.className = 'vs-msg ok';
              msg.textContent = (result && result.mutual)
                ? 'Amizade confirmada — os dois veem online!'
                : 'Pedido enviado — a pessoa aceita em Avisos.';
            }
            friendBtn.textContent = result && result.mutual ? 'Amigos ✓' : 'Pedido enviado';
          } catch (e) {
            friendBtn.disabled = false;
            if (msg) {
              msg.className = 'vs-msg err';
              msg.textContent = (e && e.message) || 'Não foi possível enviar';
            }
          }
        });
      }
    } catch (e) {
      sheet.innerHTML =
        '<div class="vs-card">' +
          '<div class="vs-handle"></div>' +
          '<p style="margin:0 0 0.75rem;color:#f5a3b8">' + esc((e && e.message) || 'Erro ao abrir perfil') + '</p>' +
          '<button type="button" class="vs-btn vs-ghost" data-vs="close">Fechar</button>' +
        '</div>';
      sheet.querySelector('[data-vs="close"]').addEventListener('click', close);
    }
  }

  // delegação global: data-visit-user / data-visit-handle
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-visit-handle], [data-visit-user], a.post-nick, a.post-avatar-link');
    if (!el) return;
    // deixa link normal com modifier
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var handle = el.getAttribute('data-visit-handle') || '';
    var userId = el.getAttribute('data-visit-user') || '';
    if (!handle && el.classList.contains('post-nick')) {
      var href = el.getAttribute('href') || '';
      var m = href.match(/[?&]u=([^&]+)/);
      if (m) handle = decodeURIComponent(m[1]);
    }
    if (!handle && !userId) return;
    e.preventDefault();
    open({ handle: handle, userId: userId });
  });

  window.CricriVisit = { open: open, close: close };
})();
