/**
 * CRICRI · reações rápidas no bichinho (P0.4)
 * Emojis: 🔥 😍 🥹 👑 — insert + contagem via RPC
 */
(function (global) {
  'use strict';

  var EMOJIS = ['🔥', '😍', '🥹', '👑'];

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  async function currentUserId() {
    try {
      if (!global.fascAuth || !global.fascAuth.user) return null;
      var u = await global.fascAuth.user();
      return u && u.id ? u.id : null;
    } catch (_) {
      return null;
    }
  }

  async function fetchCounts(toUserId) {
    if (!toUserId || !global.fascDb) return {};
    try {
      var res = await global.fascDb.rpc('get_pet_reaction_counts', { p_to_user: toUserId });
      if (res.error) {
        console.warn('[pet-reactions counts]', res.error.message || res.error);
        return {};
      }
      return res.data && typeof res.data === 'object' ? res.data : {};
    } catch (e) {
      console.warn('[pet-reactions counts]', e && e.message || e);
      return {};
    }
  }

  /** Emojis que EU já enviei para toUserId (RLS: select sent) */
  async function fetchMySent(toUserId) {
    var from = await currentUserId();
    if (!from || !toUserId || !global.fascDb) return {};
    try {
      var res = await global.fascDb
        .from('pet_reactions')
        .select('emoji')
        .eq('from_user', from)
        .eq('to_user', toUserId);
      if (res.error) {
        console.warn('[pet-reactions sent]', res.error.message || res.error);
        return {};
      }
      var map = {};
      (res.data || []).forEach(function (row) {
        if (row && row.emoji) map[row.emoji] = true;
      });
      return map;
    } catch (e) {
      console.warn('[pet-reactions sent]', e && e.message || e);
      return {};
    }
  }

  function isUniqueViolation(err) {
    if (!err) return false;
    var code = err.code || err.code;
    var msg = String(err.message || err.details || err.hint || '');
    return code === '23505' || /duplicate|unique|pet_reactions_from_to_emoji/i.test(msg);
  }

  async function sendReaction(toUserId, emoji) {
    if (!toUserId) throw new Error('Destino inválido');
    if (EMOJIS.indexOf(emoji) < 0) throw new Error('Emoji não permitido');
    var from = await currentUserId();
    if (!from) throw new Error('Entre na conta para reagir');
    if (from === toUserId) throw new Error('Não dá pra reagir no próprio bichinho por aqui');
    if (!global.fascDb) throw new Error('Banco indisponível');

    // validação única no client (UX); banco garante com unique index
    var sent = await fetchMySent(toUserId);
    if (sent[emoji]) {
      throw new Error('Você já reagiu com ' + emoji + ' neste CRICRI');
    }

    var res = await global.fascDb.from('pet_reactions').insert({
      from_user: from,
      to_user: toUserId,
      emoji: emoji
    }).select('id').single();

    if (res.error) {
      if (isUniqueViolation(res.error)) {
        throw new Error('Você já reagiu com ' + emoji + ' neste CRICRI');
      }
      throw res.error;
    }
    return res.data;
  }

  /**
   * Monta barra de reações dentro de containerEl.
   * @param {HTMLElement} containerEl
   * @param {{ toUserId: string, readonlyHost?: boolean }} opts
   */
  async function mount(containerEl, opts) {
    if (!containerEl || !opts || !opts.toUserId) return;
    var toUserId = opts.toUserId;

    containerEl.hidden = false;
    containerEl.innerHTML =
      '<div class="pet-react-bar" role="group" aria-label="Reações no CRICRI">' +
        '<p class="pet-react-label">Reagir <span class="pet-react-total" id="pet-react-total"></span></p>' +
        '<div class="pet-react-btns"></div>' +
        '<p class="pet-react-msg" role="status" aria-live="polite"></p>' +
      '</div>';

    var btns = containerEl.querySelector('.pet-react-btns');
    var msg = containerEl.querySelector('.pet-react-msg');

    function setMsg(text, ok) {
      if (!msg) return;
      msg.textContent = text || '';
      msg.classList.toggle('ok', !!ok);
      msg.classList.toggle('err', !!(text && !ok));
    }

    function paintCounts(counts, sentMap) {
      sentMap = sentMap || {};
      var total = 0;
      EMOJIS.forEach(function (em) {
        var btn = btns.querySelector('[data-emoji="' + em + '"]');
        if (!btn) return;
        var n = counts[em] ? Number(counts[em]) : 0;
        total += n;
        var countEl = btn.querySelector('.pet-react-count');
        if (countEl) countEl.textContent = n > 0 ? String(n) : '';
        var already = !!sentMap[em];
        btn.classList.toggle('is-sent', already);
        btn.disabled = already;
        btn.setAttribute(
          'aria-label',
          em + (n ? ' · ' + n : '') + (already ? ' · você já reagiu' : '')
        );
        if (already) btn.title = 'Você já enviou ' + em;
        else btn.removeAttribute('title');
      });
      var totalEl = containerEl.querySelector('.pet-react-total');
      if (totalEl) {
        totalEl.textContent = total > 0 ? '· ' + total + ' no total' : '';
      }
    }

    EMOJIS.forEach(function (em) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-react-btn';
      b.setAttribute('data-emoji', em);
      b.innerHTML =
        '<span class="pet-react-emoji" aria-hidden="true">' + escapeHtml(em) + '</span>' +
        '<span class="pet-react-count"></span>';
      btns.appendChild(b);
    });

    // delegação no container
    containerEl.onclick = async function (e) {
      var btn = e.target.closest('.pet-react-btn');
      if (!btn || !containerEl.contains(btn)) return;
      e.preventDefault();
      var emoji = btn.getAttribute('data-emoji');
      if (!emoji) return;
      btn.disabled = true;
      setMsg('Enviando…', true);
      try {
        await sendReaction(toUserId, emoji);
        setMsg('Reação enviada', true);
        var counts = await fetchCounts(toUserId);
        var sentMap = await fetchMySent(toUserId);
        paintCounts(counts, sentMap);
      } catch (err) {
        setMsg(err.message || 'Não foi possível reagir', false);
      } finally {
        btn.disabled = false;
      }
    };

    var counts = await fetchCounts(toUserId);
    var sentMap = await fetchMySent(toUserId);
    paintCounts(counts, sentMap);
  }

  function unmount(containerEl) {
    if (!containerEl) return;
    containerEl.onclick = null;
    containerEl.hidden = true;
    containerEl.innerHTML = '';
  }

  global.CricriPetReactions = {
    EMOJIS: EMOJIS,
    fetchCounts: fetchCounts,
    fetchMySent: fetchMySent,
    sendReaction: sendReaction,
    mount: mount,
    unmount: unmount
  };
})(typeof window !== 'undefined' ? window : globalThis);
