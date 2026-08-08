/**
 * CRICRI · Folha de visita de perfil (estilo Threads)
 * CricriVisit.open({ handle?, userId?, name?, photo_url? })
 */
(function () {
  'use strict';
  if (window.CricriVisit && window.CricriVisit.__v2) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function injectCss() {
    if (document.getElementById('cricri-visit-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-visit-css';
    s.textContent = [
      '#cricri-visit-sheet{position:fixed;inset:0;z-index:100080;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(5,1,6,.72);padding-bottom:env(safe-area-inset-bottom,0)}',
      '#cricri-visit-sheet[hidden]{display:none!important}',
      '#cricri-visit-sheet .vs-card{width:min(100%,420px);max-height:min(90vh,680px);overflow:auto;',
      'background:#141414;border-radius:22px 22px 0 0;border:1.5px solid rgba(255,255,255,.14);',
      'padding:1rem 1.1rem 1.4rem;color:#FAFAF7;box-shadow:0 -20px 50px rgba(0,0,0,.5)}',
      '#cricri-visit-sheet .vs-handle{width:40px;height:4px;border-radius:99px;background:rgba(255,255,255,.22);margin:0 auto .9rem}',
      /* threads layout */
      '#cricri-visit-sheet .vs-head{display:flex;flex-direction:column;align-items:center;text-align:center;gap:.55rem;margin-bottom:1rem}',
      '#cricri-visit-sheet .vs-av{width:88px;height:88px;border-radius:50%;overflow:hidden;flex:none;',
      'display:grid;place-items:center;font-size:2.2rem;background:rgba(0,0,0,.12);',
      'border:3px solid rgba(0,0,0,.5);box-shadow:0 0 0 4px rgba(0,0,0,.12),0 0 24px rgba(0,0,0,.25)}',
      '#cricri-visit-sheet .vs-av img{width:100%;height:100%;object-fit:cover}',
      '#cricri-visit-sheet .vs-meta{min-width:0;width:100%}',
      '#cricri-visit-sheet .vs-name{margin:0;font:700 1.2rem/1.2 "Inter",system-ui,sans-serif;letter-spacing:-0.01em;text-transform:none}',
      '#cricri-visit-sheet .vs-handle-txt{margin:.15rem 0 0;font-size:.88rem;color:#C1523E;font-family:"Inter",system-ui,sans-serif}',
      '#cricri-visit-sheet .vs-bio{margin:.35rem 0 0;font-size:.88rem;line-height:1.45;color:#A6A6A2;max-width:36ch;margin-left:auto;margin-right:auto}',
      '#cricri-visit-sheet .vs-tama{margin:0 0 1rem;padding:.85rem;border-radius:14px;display:flex;gap:.75rem;align-items:center;',
      'background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.12)}',
      '#cricri-visit-sheet .vs-tama-emoji{font-size:2.2rem;line-height:1;flex:none;filter:drop-shadow(0 0 10px rgba(0,0,0,.35))}',
      '#cricri-visit-sheet .vs-tama-meta{min-width:0;flex:1;font-size:.8rem;line-height:1.35;color:#A6A6A2}',
      '#cricri-visit-sheet .vs-tama-meta strong{color:#FAFAF7;font-size:.95rem;display:block;margin-bottom:.2rem;font-family:"Inter",system-ui,sans-serif;font-weight:700;letter-spacing:0;text-transform:none}',
      '#cricri-visit-sheet .vs-stats{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin:0 0 1rem}',
      '#cricri-visit-sheet .vs-stat{padding:.55rem .6rem;border-radius:12px;background:rgba(255,255,255,.04);',
      'border:1px solid rgba(255,255,255,.1);font-size:.68rem;color:#7A7A76;font-family:"IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.06em}',
      '#cricri-visit-sheet .vs-stat b{display:block;color:#FAFAF7;font-size:.95rem;font-family:"Inter",system-ui,sans-serif;margin-top:.15rem;letter-spacing:0;text-transform:none}',
      '#cricri-visit-sheet .vs-actions{display:flex;flex-direction:column;gap:.45rem}',
      '#cricri-visit-sheet .vs-btn{appearance:none;border-radius:999px;padding:.75rem 1rem;cursor:pointer;text-align:center;',
      'font:700 .78rem/1 "Inter",system-ui,sans-serif;letter-spacing:.02em;text-transform:none;text-decoration:none;border:1.5px solid transparent;display:block}',
      '#cricri-visit-sheet .vs-primary{background:#C1523E;',
      'animation:vs-holo 5s linear infinite;color:#0A0A0A;border:none}',
      '@keyframes vs-holo{to{background-position:300% 0}}',
      '#cricri-visit-sheet .vs-ghost{background:transparent;color:#FAFAF7;border-color:rgba(255,255,255,.22)}',
      '#cricri-visit-sheet .vs-msg{margin:.5rem 0 0;font-size:.78rem;color:#7A7A76;min-height:1.2em;text-align:center}',
      '#cricri-visit-sheet .vs-msg.ok{color:#C1523E}',
      '#cricri-visit-sheet .vs-msg.err{color:#F0D488}',
      '#cricri-visit-sheet .vs-empty-tama{opacity:.85;font-size:.85rem;color:#7A7A76;margin:0 0 1rem;padding:.75rem;border-radius:12px;border:1.5px dashed rgba(255,255,255,.14);text-align:center}',
      'html[data-theme="light"] #cricri-visit-sheet{background:rgba(32,21,38,.45)}',
      'html[data-theme="light"] #cricri-visit-sheet .vs-card,html[data-a11y-theme="light"] #cricri-visit-sheet .vs-card{background:#FFFFFF;color:#111111}',
      'html[data-theme="light"] #cricri-visit-sheet .vs-name{color:#111111}',
      'html[data-theme="light"] #cricri-visit-sheet .vs-handle-txt{color:#7A2E1F}',
      'html[data-theme="light"] #cricri-visit-sheet .vs-stat b{color:#111111}',
      'html[data-theme="light"] #cricri-visit-sheet .vs-ghost{color:#111111;border-color:rgba(32,21,38,.25)}'
    ].join('');
    document.head.appendChild(s);
  }

  function formLabel(id) {
    var map = { egg: 'Ovo', kitten: 'Filhote', teen: 'Jovem', adult: 'Adulto', legend: 'Lenda' };
    return map[id] || id || '';
  }

  function avatarHtml(pr) {
    if (pr.photo_url) {
      return '<div class="vs-av"><img src="' + esc(pr.photo_url) + '" alt="" /></div>';
    }
    var letter = (pr.name || pr.handle || '?').charAt(0).toUpperCase();
    return '<div class="vs-av" aria-hidden="true">' + esc(letter) + '</div>';
  }

  async function resolveProfile(opts) {
    var client = window.fascDb;
    if (!client) throw new Error('Sem conexão');
    if (opts.userId) {
      var byId = await client.from('profiles').select('id,name,handle,photo_url,bio').eq('id', opts.userId).maybeSingle();
      if (byId.error) throw byId.error;
      if (byId.data) return byId.data;
    }
    var handle = (opts.handle || '').replace(/^@/, '').trim();
    if (!handle) throw new Error('Perfil não encontrado');
    var byH = await client.from('profiles').select('id,name,handle,photo_url,bio').eq('handle', handle).maybeSingle();
    if (byH.error) throw byH.error;
    if (!byH.data) throw new Error('Perfil não encontrado');
    return byH.data;
  }

  async function loadTamaSummary(userId) {
    if (!userId || !window.fascDb) return null;
    try {
      if (window.CricriTamaState && window.CricriTamaState.summaryFor) {
        return await window.CricriTamaState.summaryFor(userId);
      }
    } catch (_) {}
    return null;
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
        '<p style="margin:0;text-align:center;color:#7A7A76;font-size:0.85rem">Carregando perfil…</p>' +
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
      var bio = (pr.bio || '').trim();
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
        if (pr.handle) {
          actions += '<a class="vs-btn vs-primary" href="profile.html?u=' + encodeURIComponent(pr.handle) + '">Ver perfil completo</a>';
        }
        if (isFriend) {
          actions += '<button type="button" class="vs-btn vs-ghost" disabled>Vocês já são amigos</button>';
        } else {
          actions += '<button type="button" class="vs-btn vs-ghost" data-vs="friend">Pedir amizade</button>';
        }
        if (pr.handle) {
          actions += '<a class="vs-btn vs-ghost" href="profile.html?u=' + encodeURIComponent(pr.handle) + '#caixinha-title">Mandar na caixinha</a>';
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
              (bio ? '<p class="vs-bio">' + esc(bio) + '</p>' : '') +
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
          '<p style="margin:0 0 0.75rem;color:#F0D488;text-align:center">' + esc((e && e.message) || 'Erro ao abrir perfil') + '</p>' +
          '<button type="button" class="vs-btn vs-ghost" data-vs="close">Fechar</button>' +
        '</div>';
      sheet.querySelector('[data-vs="close"]').addEventListener('click', close);
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-visit-handle], [data-visit-user], a.post-nick, a.post-avatar-link');
    if (!el) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var handle = el.getAttribute('data-visit-handle') || '';
    var userId = el.getAttribute('data-visit-user') || '';
    if (!handle && el.classList.contains('post-nick')) {
      var href = el.getAttribute('href') || '';
      var m = href.match(/[?&]u=([^&]+)/);
      if (m) handle = decodeURIComponent(m[1]);
    }
    if (!handle && el.classList.contains('post-avatar-link')) {
      var href2 = el.getAttribute('href') || '';
      var m2 = href2.match(/[?&]u=([^&]+)/);
      if (m2) handle = decodeURIComponent(m2[1]);
    }
    if (!handle && !userId) return;
    e.preventDefault();
    open({ handle: handle, userId: userId });
  });

  window.CricriVisit = { open: open, close: close, __v2: true };
})();
