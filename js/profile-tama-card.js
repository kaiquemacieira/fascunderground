/**
 * CRICRI · cartão do bichinho + álbum no perfil (P0)
 * - Dono: estado próprio (resolveState)
 * - Público ?u=handle: somente leitura via RPC get_tama_public*
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function visitorHandle() {
    try {
      var params = new URLSearchParams(window.location.search);
      var h = (params.get('u') || params.get('to') || '').replace(/^@/, '').trim();
      return h || null;
    } catch (_) {
      return null;
    }
  }

  function renderEmpty(body, opts) {
    opts = opts || {};
    if (opts.publicView) {
      body.innerHTML =
        '<div class="tama-card-cta">' +
          '<p>Este perfil ainda não tem um CRICRI na roda.</p>' +
        '</div>';
      return;
    }
    body.innerHTML =
      '<div class="tama-card-cta">' +
        '<p>Você ainda não tem um bichinho nesta roda.</p>' +
        '<a class="btn" href="tamagotchi.html">Comece a cuidar do seu CRICRI</a>' +
      '</div>';
  }

  function renderActive(body, summary, opts) {
    opts = opts || {};
    var dead = summary.alive === false;
    var readonly = !!opts.readonly;
    var ownerName = opts.ownerLabel ? escapeHtml(opts.ownerLabel) : '';
    body.innerHTML =
      '<div class="tama-card-row">' +
        '<div class="tama-card-emoji" aria-hidden="true">' + escapeHtml(summary.emoji) + '</div>' +
        '<div class="tama-card-meta">' +
          '<p class="tama-card-kicker">' +
            (readonly
              ? (ownerName ? 'CRICRI de ' + ownerName : 'CRICRI público')
              : 'Seu CRICRI') +
          '</p>' +
          '<p class="tama-card-name">' + escapeHtml(summary.name) + '</p>' +
          '<div class="tama-card-stats">' +
            '<span>Estágio: <strong>' + escapeHtml(summary.stageLabel) + '</strong></span>' +
            '<span>Casca: <strong>' + escapeHtml(summary.shellLabel) + '</strong></span>' +
            '<span>Care: <strong>' + escapeHtml(String(summary.careScore)) + '</strong></span>' +
            (dead ? '<span><strong>descansando</strong></span>' : '') +
          '</div>' +
          (readonly
            ? '<p class="tama-card-readonly-hint">Somente leitura — sem cuidados nesta página</p>'
            : '<a class="tama-card-link" href="tamagotchi.html">Abrir Tamagotchi →</a>') +
        '</div>' +
      '</div>';
  }

  function cardCountOf(entry, api) {
    if (api && api.cardCount) return api.cardCount(entry);
    if (entry == null || entry === false) return 0;
    if (typeof entry === 'number') return Math.max(0, entry | 0);
    if (typeof entry === 'boolean') return entry ? 1 : 0;
    if (typeof entry === 'object' && entry.count != null) return Math.max(0, Number(entry.count) | 0);
    return 1;
  }

  function renderGiftPanel(host, opts) {
    if (!host) return;
    opts = opts || {};
    var dups = opts.duplicates || [];
    var toUserId = opts.toUserId;
    var ownerLabel = opts.ownerLabel || 'amigo';

    if (!toUserId || !dups.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    var parts = [];
    parts.push('<div class="tama-gift-panel">');
    parts.push('<h3 class="tama-gift-title">Presentear ' + escapeHtml(ownerLabel) + '</h3>');
    parts.push('<p class="tama-gift-hint">Você tem cópias extras. Presenteia 1 e fica com o restante.</p>');
    parts.push('<ul class="tama-gift-list" role="list">');
    for (var i = 0; i < dups.length; i++) {
      var d = dups[i];
      parts.push(
        '<li class="tama-gift-item">' +
          '<span class="tama-gift-emoji" aria-hidden="true">' + escapeHtml(d.emoji) + '</span>' +
          '<span class="tama-gift-meta">' +
            '<strong>' + escapeHtml(d.name) + '</strong>' +
            '<span class="tama-gift-count">×' + escapeHtml(String(d.count)) + '</span>' +
          '</span>' +
          '<button type="button" class="tama-gift-btn" data-gift-card="' + escapeHtml(d.id) + '"' +
            ' data-gift-to="' + escapeHtml(toUserId) + '">' +
            'Presentear ' + escapeHtml(d.name) +
          '</button>' +
        '</li>'
      );
    }
    parts.push('</ul>');
    parts.push('<p class="tama-gift-status" id="tama-gift-status" hidden></p>');
    parts.push('</div>');
    host.innerHTML = parts.join('');
    host.hidden = false;

    if (host.dataset.giftBound === '1') return;
    host.dataset.giftBound = '1';
    host.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-gift-card]') : null;
      if (!btn || btn.disabled) return;
      var cardId = btn.getAttribute('data-gift-card');
      var toId = btn.getAttribute('data-gift-to');
      if (!cardId || !toId) return;
      doGift(btn, cardId, toId, host);
    });
  }

  async function doGift(btn, cardId, toUserId, host) {
    var api = window.CricriTamaRead;
    var status = host.querySelector('#tama-gift-status');
    var prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    if (status) {
      status.hidden = true;
      status.textContent = '';
    }
    try {
      if (!api || !api.giftCard) throw new Error('Módulo de presente indisponível.');
      var result = await api.giftCard(toUserId, cardId);
      btn.textContent = 'Presenteado ✓';
      if (status) {
        status.hidden = false;
        status.textContent = 'Cartão enviado. Você ficou com ×' +
          (result && result.from_count != null ? result.from_count : '?') + '.';
      }
      // re-render painel com dups atualizados
      setTimeout(function () {
        var local = api.loadLocal ? api.loadLocal() : null;
        var dups = api.listDuplicates ? api.listDuplicates(local) : [];
        var labelEl = host.querySelector('.tama-gift-title');
        var ownerLabel = labelEl
          ? String(labelEl.textContent || '').replace(/^Presentear\s+/, '')
          : 'amigo';
        renderGiftPanel(host, {
          duplicates: dups,
          toUserId: toUserId,
          ownerLabel: ownerLabel
        });
        if (typeof window.__cricriRefreshTamaCard === 'function') {
          // não recarrega tudo; só status ok
        }
      }, 900);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = prev;
      if (status) {
        status.hidden = false;
        status.textContent = (err && err.message) || 'Falha ao presentear.';
      }
    }
  }

  function renderAlbum(albumEl, ownedMap, opts) {
    if (!albumEl) return;
    opts = opts || {};
    var api = window.CricriTamaRead;
    var catalog = (api && api.CARD_CATALOG) || [];
    var rarityLabel = (api && api.RARITY_LABEL) || { comum: 'Comum', raro: 'Raro', super: 'Super raro' };
    var typeLabel = (api && api.TYPE_LABEL) || {};
    ownedMap = ownedMap || {};

    var ownedCount = 0;
    var parts = [];
    parts.push('<div class="tama-album-head">');
    parts.push('<h2 class="tama-album-title">' +
      (opts.readonly ? 'Álbum público' : 'Álbum de figurinhas') +
      '</h2>');
    parts.push('<p class="tama-album-sub" id="tama-album-count"></p>');
    parts.push('</div>');
    parts.push('<ul class="tama-album-grid" role="list">');

    for (var i = 0; i < catalog.length; i++) {
      var c = catalog[i];
      var cnt = cardCountOf(ownedMap[c.id], api);
      var has = cnt > 0;
      if (has) ownedCount++;
      var rarity = c.rarity || 'comum';
      var itemType = c.type || 'geral';
      var typeName = typeLabel[itemType] || itemType;
      var title = c.name + ' — ' + typeName + ' · ' + (rarityLabel[rarity] || rarity) +
        (has ? (cnt > 1 ? ' ×' + cnt : '') : ' (ainda não)');
      parts.push(
        '<li class="tama-album-item tama-album-item--' + escapeHtml(rarity) +
          ' tama-type--' + escapeHtml(itemType) + (has ? ' is-owned' : ' is-locked') +
          '" data-card-id="' + escapeHtml(c.id) + '"' +
          ' data-rarity="' + escapeHtml(rarity) + '"' +
          ' data-type="' + escapeHtml(itemType) + '"' +
          ' data-owned="' + (has ? '1' : '0') + '"' +
          ' title="' + escapeHtml(title) + '">' +
          '<span class="tama-album-emoji" aria-hidden="true">' + escapeHtml(c.emoji) + '</span>' +
          '<span class="tama-album-name">' + escapeHtml(c.name) + '</span>' +
          '<span class="tama-album-type">' + escapeHtml(typeName) + '</span>' +
          '<span class="tama-album-rarity tama-album-rarity--' + escapeHtml(rarity) + '">' +
            escapeHtml(rarityLabel[rarity] || rarity) +
          '</span>' +
          (has && cnt > 1
            ? '<span class="tama-album-dup">×' + cnt + '</span>'
            : '') +
          (has
            ? '<span class="sr-only">Coletada' + (cnt > 1 ? ', ' + cnt + ' cópias' : '') + '</span>'
            : '<span class="sr-only">Bloqueada: ' + escapeHtml(c.how || '') + '</span>') +
        '</li>'
      );
    }
    parts.push('</ul>');
    albumEl.innerHTML = parts.join('');
    var countEl = albumEl.querySelector('#tama-album-count');
    if (countEl) countEl.textContent = ownedCount + ' / ' + catalog.length + ' coletadas';
    albumEl.hidden = false;
    albumEl.classList.toggle('is-readonly', !!opts.readonly);
  }

  function giftHost() {
    var el = $('tama-gift-host');
    if (el) return el;
    var card = $('tama-profile-card');
    if (!card || !card.parentNode) return null;
    el = document.createElement('div');
    el.id = 'tama-gift-host';
    el.className = 'tama-gift-host';
    el.hidden = true;
    var album = $('tama-album');
    if (album && album.parentNode) {
      album.parentNode.insertBefore(el, album);
    } else {
      card.parentNode.insertBefore(el, card.nextSibling);
    }
    return el;
  }

  function hideGift() {
    var host = $('tama-gift-host');
    if (!host) return;
    host.hidden = true;
    host.innerHTML = '';
  }


  function reactHost() {
    return $('pet-react-host');
  }

  function mountReactions(toUserId) {
    var host = reactHost();
    if (!host || !window.CricriPetReactions) return;
    window.CricriPetReactions.mount(host, { toUserId: toUserId });
  }

  function unmountReactions() {
    var host = reactHost();
    if (!host) return;
    if (window.CricriPetReactions && window.CricriPetReactions.unmount) {
      window.CricriPetReactions.unmount(host);
    } else {
      host.hidden = true;
      host.innerHTML = '';
    }
  }

  function hideAlbum(albumEl) {
    if (!albumEl) return;
    albumEl.hidden = true;
    albumEl.innerHTML = '';
    albumEl.classList.remove('is-readonly');
  }

  async function resolveVisitorProfile(handle) {
    if (!handle || !window.fascDb) return null;
    try {
      var h = String(handle).replace(/^@/, '').trim().toLowerCase();
      var res = await window.fascDb
        .from('profiles')
        .select('id,name,handle,photo_url')
        .eq('handle', h)
        .maybeSingle();
      if (res.error || !res.data) return null;
      return res.data;
    } catch (_) {
      return null;
    }
  }

  async function refreshTamaCard() {
    var card = $('tama-profile-card');
    var body = $('tama-card-body');
    var album = $('tama-album');
    if (!card || !body) return;

    var api = window.CricriTamaRead;
    var handle = visitorHandle();
    var me = null;
    try {
      if (window.fascAuth && window.fascAuth.user) me = await window.fascAuth.user();
    } catch (_) {}

    if (handle) {
      var target = await resolveVisitorProfile(handle);
      if (target) {
        var isSelf = !!(me && target.id === me.id);
        if (!isSelf) {
          card.hidden = false;
          card.classList.add('is-public-readonly');
          body.innerHTML = '<p class="tama-card-kicker">Carregando CRICRI…</p>';
          if (album) {
            album.hidden = false;
            album.innerHTML = '<p class="tama-album-sub">Carregando álbum…</p>';
          }

          if (!api || !api.loadPublicByUserId) {
            renderEmpty(body, { publicView: true });
            hideAlbum(album);
            return;
          }

          try {
            var pub = await api.loadPublicByUserId(target.id);
            if (!pub) pub = await api.loadPublicByHandle(handle);
            if (!pub || !pub.started) {
              renderEmpty(body, { publicView: true });
              hideAlbum(album);
              unmountReactions();
              return;
            }
            var state = Object.assign(api.defaultState ? api.defaultState() : {}, pub, { started: true });
            var summary = api.summarize(state);
            var label = target.name || ('@' + (target.handle || handle));
            renderActive(body, summary, { readonly: true, ownerLabel: label });
            renderAlbum(album, pub.cards || {}, { readonly: true });
            mountReactions(target.id);

            // P1.2 — presentear cartões duplicados do visitante logado
            if (me) {
              try {
                var myState = api.resolveState
                  ? await api.resolveState()
                  : (api.loadLocal ? api.loadLocal() : null);
                var dups = (api.listDuplicates && myState)
                  ? api.listDuplicates(myState)
                  : [];
                renderGiftPanel(giftHost(), {
                  duplicates: dups,
                  toUserId: target.id,
                  ownerLabel: label
                });
              } catch (_) {
                hideGift();
              }
            } else {
              hideGift();
            }
          } catch (e) {
            console.warn('[CRICRI tama public]', e && e.message || e);
            renderEmpty(body, { publicView: true });
            hideAlbum(album);
            unmountReactions();
            hideGift();
          }
          return;
        }
      }
    }

    card.classList.remove('is-public-readonly');
    hideGift();
    if (!me) {
      card.hidden = true;
      hideAlbum(album);
      unmountReactions();
      return;
    }

    card.hidden = false;
    unmountReactions();
    body.innerHTML = '<p class="tama-card-kicker">Carregando bichinho…</p>';
    if (album) {
      album.hidden = false;
      album.innerHTML = '<p class="tama-album-sub">Carregando álbum…</p>';
    }

    if (!api || !api.resolveState) {
      renderEmpty(body);
      hideAlbum(album);
      return;
    }

    try {
      var own = await api.resolveState();
      var sum = own ? api.summarize(own) : null;
      if (!sum) {
        renderEmpty(body);
        hideAlbum(album);
      } else {
        renderActive(body, sum, { readonly: false });
        var owned = api.ownedCards ? api.ownedCards(own) : (own.cards || {});
        renderAlbum(album, owned, { readonly: false });
      }
    } catch (e) {
      console.warn('[CRICRI tama-card]', e && e.message || e);
      renderEmpty(body);
      hideAlbum(album);
    }
  }

  window.__cricriRefreshTamaCard = refreshTamaCard;

  function bindAuth() {
    if (!window.fascAuth || !window.fascAuth.onChange) return;
    if (window.__cricriTamaCardAuthBound) return;
    window.__cricriTamaCardAuthBound = true;
    window.fascAuth.onChange(function (ev) {
      if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT' || ev === 'TOKEN_REFRESHED' || ev === 'INITIAL_SESSION') {
        refreshTamaCard();
      }
    });
  }

  function boot() {
    bindAuth();
    var tries = 0;
    function tick() {
      tries++;
      if (window.fascDb || tries > 20) refreshTamaCard();
      else setTimeout(tick, 150);
    }
    tick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
