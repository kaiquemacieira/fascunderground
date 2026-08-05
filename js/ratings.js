/**
 * CRICRI · Sistema de avaliações (1–5 estrelas)
 *
 * CricriRatings.summary(type, id) → { avg, count }
 * CricriRatings.rate(type, id, score, comment?)
 * CricriRatings.widgetHtml(type, id, name?)
 * CricriRatings.mountIn(container)
 * CricriRatings.refreshPopup(type, id) — atualiza DOM data-rating
 */
(function () {
  'use strict';
  if (window.CricriRatings) return;

  var cache = {}; // key -> { avg, count, mine }

  function keyOf(type, id) {
    return String(type || '') + '::' + String(id || '');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function starsHtml(avg, interactive, mine) {
    var v = interactive ? (mine || 0) : Math.round(Number(avg) || 0);
    var parts = [];
    for (var i = 1; i <= 5; i++) {
      var on = i <= v;
      if (interactive) {
        parts.push(
          '<button type="button" class="cr-star' + (on ? ' is-on' : '') + '" data-score="' + i + '" aria-label="' + i + ' estrela' + (i > 1 ? 's' : '') + '">' +
            (on ? '★' : '☆') +
          '</button>'
        );
      } else {
        parts.push('<span class="cr-star-static' + (on ? ' is-on' : '') + '" aria-hidden="true">' + (on ? '★' : '☆') + '</span>');
      }
    }
    return parts.join('');
  }

  function injectCss() {
    if (document.getElementById('cricri-ratings-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-ratings-css';
    s.textContent = [
      '.cr-rate{margin-top:.55rem;padding-top:.5rem;border-top:1px solid rgba(230,220,196,.12);font-family:Inter,system-ui,sans-serif}',
      '.cr-rate-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.35rem}',
      '.cr-rate-avg{font:700 .78rem/1 Oswald,system-ui,sans-serif;letter-spacing:.04em;color:#ebe3cf}',
      '.cr-rate-avg b{color:#d49a2c;font-size:.95rem}',
      '.cr-rate-count{font-size:.68rem;color:#8c8376}',
      '.cr-stars{display:flex;gap:.15rem;align-items:center}',
      '.cr-star,.cr-star-static{appearance:none;border:none;background:transparent;padding:0 .05rem;cursor:default;',
      'font-size:1.15rem;line-height:1;color:#5a4e42}',
      '.cr-star{cursor:pointer;transition:transform .12s,color .12s}',
      '.cr-star.is-on,.cr-star-static.is-on{color:#d49a2c;text-shadow:0 0 8px rgba(212,154,44,.45)}',
      '.cr-star:hover,.cr-star:focus-visible{color:#e33d6b;transform:scale(1.12);outline:none}',
      '.cr-rate-msg{margin:.35rem 0 0;font-size:.72rem;color:#8c8376;min-height:1em}',
      '.cr-rate-msg.ok{color:#7ecf9a}',
      '.cr-rate-msg.err{color:#f5a3b8}',
      '.cr-rate-comment{width:100%;box-sizing:border-box;margin-top:.4rem;border-radius:8px;',
      'border:1px solid rgba(230,220,196,.16);background:rgba(0,0,0,.25);color:#ebe3cf;',
      'padding:.4rem .5rem;font-size:.78rem;resize:vertical;min-height:2.2rem}',
      '.cr-rate-send{margin-top:.35rem;appearance:none;border:none;border-radius:8px;padding:.4rem .7rem;',
      'background:#e33d6b;color:#fff;font:700 .68rem/1 Oswald,system-ui,sans-serif;letter-spacing:.05em;',
      'text-transform:uppercase;cursor:pointer}',
      '.leaflet-popup-content .cr-rate{min-width:200px;max-width:260px}',
      '.cr-comments{margin-top:.45rem;display:flex;flex-direction:column;gap:.35rem;max-height:120px;overflow:auto}',
      '.cr-comment{padding:.35rem .45rem;border-radius:8px;background:rgba(230,220,196,.06);border:1px solid rgba(230,220,196,.1)}',
      '.cr-comment-stars{display:block;font-size:.7rem;color:#d49a2c;letter-spacing:.05em;margin-bottom:.15rem}',
      '.cr-comment-body{margin:0;font-size:.75rem;line-height:1.35;color:#cfc5b4}',
      '.cr-comments-empty,.cr-comments-loading{margin:0;font-size:.72rem;color:#8c8376}',
      '.cr-filter-bar{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0 .35rem;align-items:center}',
      '.cr-filter-label{font:600 .68rem/1 Oswald,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#e33d6b;margin-right:.25rem}',
      '.cr-filter-chip{appearance:none;border:1.5px solid rgba(230,220,196,.22);background:rgba(230,220,196,.06);',
      'color:#cfc5b4;border-radius:999px;padding:.35rem .65rem;font:600 .68rem/1 Oswald,system-ui,sans-serif;',
      'letter-spacing:.04em;text-transform:uppercase;cursor:pointer}',
      '.cr-filter-chip.is-on{border-color:rgba(212,154,44,.55);background:rgba(212,154,44,.15);color:#ebe3cf}'
    ].join('');
    document.head.appendChild(s);
  }

  async function currentUserId() {
    try {
      if (window.fascAuth && window.fascAuth.user) {
        var u = await window.fascAuth.user();
        return u && u.id ? u.id : null;
      }
      if (window.fascDb && window.fascDb.auth) {
        var r = await window.fascDb.auth.getUser();
        return r.data && r.data.user && r.data.user.id;
      }
    } catch (_) {}
    return null;
  }

  async function fetchSummary(type, id) {
    var k = keyOf(type, id);
    if (!window.fascDb) {
      return cache[k] || { avg: 0, count: 0, mine: 0 };
    }
    try {
      var sum = await window.fascDb
        .from('ratings_summary')
        .select('avg_score, count')
        .eq('target_type', type)
        .eq('target_id', String(id))
        .maybeSingle();
      var avg = 0;
      var count = 0;
      if (!sum.error && sum.data) {
        avg = Number(sum.data.avg_score) || 0;
        count = Number(sum.data.count) || 0;
      } else {
        // fallback: aggregate client-side
        var all = await window.fascDb
          .from('ratings')
          .select('score, user_id')
          .eq('target_type', type)
          .eq('target_id', String(id));
        if (!all.error && all.data && all.data.length) {
          count = all.data.length;
          var t = 0;
          all.data.forEach(function (r) { t += Number(r.score) || 0; });
          avg = Math.round((t / count) * 100) / 100;
        }
      }
      var mine = 0;
      var uid = await currentUserId();
      if (uid) {
        var mineRes = await window.fascDb
          .from('ratings')
          .select('score')
          .eq('target_type', type)
          .eq('target_id', String(id))
          .eq('user_id', uid)
          .maybeSingle();
        if (!mineRes.error && mineRes.data) mine = Number(mineRes.data.score) || 0;
      }
      cache[k] = { avg: avg, count: count, mine: mine };
      return cache[k];
    } catch (e) {
      console.warn('[ratings]', e);
      return cache[k] || { avg: 0, count: 0, mine: 0 };
    }
  }

  async function rate(type, id, score, comment) {
    score = Math.max(1, Math.min(5, Math.round(Number(score) || 0)));
    if (!score) throw new Error('Escolha de 1 a 5 estrelas');
    var uid = await currentUserId();
    if (!uid) throw new Error('Entre na conta pra avaliar');
    if (!window.fascDb) throw new Error('Sem conexão');

    var row = {
      user_id: uid,
      target_type: type,
      target_id: String(id),
      score: score,
      comment: (comment || '').trim().slice(0, 280) || null,
      updated_at: new Date().toISOString()
    };

    var res = await window.fascDb
      .from('ratings')
      .upsert(row, { onConflict: 'user_id,target_type,target_id' })
      .select('id')
      .maybeSingle();

    if (res.error) throw res.error;

    delete cache[keyOf(type, id)];
    return fetchSummary(type, id);
  }


  async function listComments(type, id, limit) {
    limit = limit || 8;
    if (!window.fascDb) return [];
    try {
      var res = await window.fascDb
        .from('ratings')
        .select('score, comment, created_at, user_id')
        .eq('target_type', type)
        .eq('target_id', String(id))
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (res.error) throw res.error;
      return (res.data || []).filter(function (r) {
        return r.comment && String(r.comment).trim();
      });
    } catch (e) {
      console.warn('[ratings comments]', e);
      return [];
    }
  }

  async function renderComments(root) {
    if (!root) return;
    var type = root.getAttribute('data-cr-type');
    var id = root.getAttribute('data-cr-id');
    var box = root.querySelector('[data-cr-comments]');
    if (!box) return;
    box.innerHTML = '<p class="cr-comments-loading">Carregando comentários…</p>';
    var rows = await listComments(type, id, 6);
    if (!rows.length) {
      box.innerHTML = '<p class="cr-comments-empty">Nenhum comentário ainda — avalie e deixe o seu.</p>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var stars = '';
      var sc = Number(r.score) || 0;
      for (var i = 1; i <= 5; i++) stars += i <= sc ? '★' : '☆';
      return (
        '<div class="cr-comment">' +
          '<span class="cr-comment-stars" aria-label="' + sc + ' estrelas">' + stars + '</span>' +
          '<p class="cr-comment-body">' + esc(r.comment) + '</p>' +
        '</div>'
      );
    }).join('');
  }

  function widgetHtml(type, id, opts) {
    opts = opts || {};
    injectCss();
    var k = keyOf(type, id);
    var s = cache[k] || { avg: 0, count: 0, mine: 0 };
    var avgLabel = s.count ? (Number(s.avg).toFixed(1) + ' · ' + s.count + (s.count === 1 ? ' aval.' : ' aval.')) : 'Sem avaliações ainda';
    return (
      '<div class="cr-rate" data-cr-type="' + esc(type) + '" data-cr-id="' + esc(id) + '">' +
        '<div class="cr-rate-head">' +
          '<span class="cr-rate-avg"><b data-cr-avg>' + (s.count ? Number(s.avg).toFixed(1) : '—') + '</b></span>' +
          '<span class="cr-rate-count" data-cr-count>' + esc(avgLabel) + '</span>' +
        '</div>' +
        '<div class="cr-stars" role="group" aria-label="Avaliar">' +
          starsHtml(s.avg, true, s.mine) +
        '</div>' +
        (opts.withComment
          ? '<textarea class="cr-rate-comment" maxlength="280" placeholder="Comentário opcional…" data-cr-comment></textarea>' +
            '<button type="button" class="cr-rate-send" data-cr-send>Enviar avaliação</button>'
          : '') +
        '<p class="cr-rate-msg" data-cr-msg></p>' +
      '</div>'
    );
  }

  function paintWidget(root, summary) {
    if (!root || !summary) return;
    var avgEl = root.querySelector('[data-cr-avg]');
    var countEl = root.querySelector('[data-cr-count]');
    if (avgEl) avgEl.textContent = summary.count ? Number(summary.avg).toFixed(1) : '—';
    if (countEl) {
      countEl.textContent = summary.count
        ? (Number(summary.avg).toFixed(1) + ' · ' + summary.count + (summary.count === 1 ? ' aval.' : ' aval.'))
        : 'Sem avaliações ainda';
    }
    var stars = root.querySelector('.cr-stars');
    if (stars) {
      stars.innerHTML = starsHtml(summary.avg, true, summary.mine);
    }
  }

  async function hydrate(root) {
    if (!root) return;
    var type = root.getAttribute('data-cr-type');
    var id = root.getAttribute('data-cr-id');
    if (!type || !id) return;
    var s = await fetchSummary(type, id);
    paintWidget(root, s);
    renderComments(root);
  }

  async function applyScore(root, score) {
    var type = root.getAttribute('data-cr-type');
    var id = root.getAttribute('data-cr-id');
    var msg = root.querySelector('[data-cr-msg]');
    var commentEl = root.querySelector('[data-cr-comment]');
    var comment = commentEl ? commentEl.value : '';
    if (msg) { msg.className = 'cr-rate-msg'; msg.textContent = 'Salvando…'; }
    try {
      var s = await rate(type, id, score, comment);
      paintWidget(root, s);
      renderComments(root);
      if (msg) { msg.className = 'cr-rate-msg ok'; msg.textContent = 'Obrigado! Avaliação registrada.'; }
      try {
        window.dispatchEvent(new CustomEvent('cricri:rated', { detail: { type: type, id: id, summary: s } }));
      } catch (_) {}
    } catch (e) {
      if (msg) {
        msg.className = 'cr-rate-msg err';
        msg.textContent = (e && e.message) || 'Falha ao avaliar';
      }
    }
  }

  function bindDelegation() {
    if (document.__cricriRatingsBound) return;
    document.__cricriRatingsBound = true;
    document.addEventListener('click', function (e) {
      var star = e.target.closest('.cr-star');
      if (star) {
        var root = star.closest('.cr-rate');
        if (!root) return;
        e.preventDefault();
        e.stopPropagation();
        var score = Number(star.getAttribute('data-score'));
        // highlight immediately
        root.querySelectorAll('.cr-star').forEach(function (btn) {
          var s = Number(btn.getAttribute('data-score'));
          btn.classList.toggle('is-on', s <= score);
          btn.textContent = s <= score ? '★' : '☆';
        });
        if (!root.querySelector('[data-cr-send]')) {
          applyScore(root, score);
        } else {
          root.dataset.pendingScore = String(score);
          var msg = root.querySelector('[data-cr-msg]');
          if (msg) { msg.className = 'cr-rate-msg'; msg.textContent = score + ' estrela' + (score > 1 ? 's' : '') + ' — pode comentar e enviar'; }
        }
        return;
      }
      var send = e.target.closest('[data-cr-send]');
      if (send) {
        var root2 = send.closest('.cr-rate');
        if (!root2) return;
        e.preventDefault();
        e.stopPropagation();
        var sc = Number(root2.dataset.pendingScore || 0);
        if (!sc) {
          var msg2 = root2.querySelector('[data-cr-msg]');
          if (msg2) { msg2.className = 'cr-rate-msg err'; msg2.textContent = 'Escolha as estrelas antes.'; }
          return;
        }
        applyScore(root2, sc);
      }
    });
  }

  /** HTML snippet to append inside Leaflet popup strings */
  function popupBlock(type, id) {
    injectCss();
    bindDelegation();
    return (
      '<div class="cr-rate" data-cr-type="' + esc(type) + '" data-cr-id="' + esc(id) + '" data-cr-hydrate="1">' +
        '<div class="cr-rate-head">' +
          '<span class="cr-rate-avg"><b data-cr-avg>—</b></span>' +
          '<span class="cr-rate-count" data-cr-count>carregando…</span>' +
        '</div>' +
        '<div class="cr-stars" role="group" aria-label="Avaliar">' + starsHtml(0, true, 0) + '</div>' +
        '<textarea class="cr-rate-comment" maxlength="280" placeholder="Comentário (opcional)…" data-cr-comment></textarea>' +
        '<button type="button" class="cr-rate-send" data-cr-send>Enviar avaliação</button>' +
        '<p class="cr-rate-msg" data-cr-msg></p>' +
        '<div class="cr-comments" data-cr-comments></div>' +
      '</div>'
    );
  }

  function onPopupOpen() {
    document.querySelectorAll('.cr-rate[data-cr-hydrate="1"]').forEach(function (el) {
      hydrate(el);
    });
  }

  function boot() {
    injectCss();
    bindDelegation();
    // hydrate any static widgets
    document.querySelectorAll('.cr-rate[data-cr-type]').forEach(function (el) {
      hydrate(el);
    });
    document.addEventListener('popupopen', onPopupOpen, true);
    // Leaflet fires on map
    setTimeout(function () {
      try {
        var map = window.projanoMap && window.projanoMap.map;
        if (map && map.on) {
          map.on('popupopen', function () {
            setTimeout(onPopupOpen, 30);
          });
        }
      } catch (_) {}
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  var minFilter = 0;

  function setMinFilter(n) {
    minFilter = Math.max(0, Math.min(5, Number(n) || 0));
    try {
      window.dispatchEvent(new CustomEvent('cricri:rating-filter', { detail: { min: minFilter } }));
    } catch (_) {}
    return minFilter;
  }

  function getMinFilter() { return minFilter; }

  /** true se o alvo passa no filtro atual (sem filtro = sempre true) */
  async function passesFilter(type, id) {
    if (!minFilter) return true;
    var s = await fetchSummary(type, id);
    if (!s.count) return false;
    return Number(s.avg) >= minFilter;
  }

  function mountFilterBar(host) {
    if (!host || host.querySelector('.cr-filter-bar')) return;
    injectCss();
    var bar = document.createElement('div');
    bar.className = 'cr-filter-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Filtrar por nota');
    bar.innerHTML =
      '<span class="cr-filter-label">Nota</span>' +
      [0, 3, 4, 5].map(function (n) {
        var label = n === 0 ? 'Todas' : n + '+ ★';
        return '<button type="button" class="cr-filter-chip' + (n === minFilter ? ' is-on' : '') +
          '" data-cr-min="' + n + '">' + label + '</button>';
      }).join('');
    host.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cr-min]');
      if (!btn) return;
      var n = Number(btn.getAttribute('data-cr-min'));
      setMinFilter(n);
      bar.querySelectorAll('.cr-filter-chip').forEach(function (b) {
        b.classList.toggle('is-on', Number(b.getAttribute('data-cr-min')) === n);
      });
    });
  }

  window.CricriRatings = {
    summary: fetchSummary,
    rate: rate,
    listComments: listComments,
    widgetHtml: widgetHtml,
    popupBlock: popupBlock,
    hydrate: hydrate,
    setMinFilter: setMinFilter,
    getMinFilter: getMinFilter,
    passesFilter: passesFilter,
    mountFilterBar: mountFilterBar,
    refresh: function (type, id) {
      delete cache[keyOf(type, id)];
      return fetchSummary(type, id);
    }
  };
})();
