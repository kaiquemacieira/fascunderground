// FASC+ — caixinha anônima
(function () {
  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function setMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
    el.classList.toggle('err', !!(text && !ok));
  }

  async function resolveTargetProfile() {
    var params = new URLSearchParams(window.location.search);
    var handle = (params.get('u') || params.get('to') || '').replace(/^@/, '').trim();
    if (!handle || !window.fascDb) return null;
    try {
      var q = window.fascDb.from('profiles').select('id,name,handle,photo_url').eq('handle', handle).maybeSingle();
      var res = await (window.fascAuth && window.fascAuth.withTimeout
        ? window.fascAuth.withTimeout(q, 4000, 'perfil alvo')
        : q);
      if (res.error) {
        console.warn('[anon target]', res.error.message);
        return null;
      }
      return res.data || null;
    } catch (e) {
      console.warn('[anon target]', e.message || e);
      return null;
    }
  }


  function mapDbError(err) {
    var msg = (err && (err.message || err.msg || err.error_description)) || '';
    var code = (err && (err.code || err.errcode)) || '';
    if (/RATE_LIMIT/i.test(msg) || code === 'P0001') {
      var m = msg.match(/RATE_LIMIT:\s*(.+)/i);
      return (m && m[1]) ? m[1].trim() : 'Muitas mensagens em pouco tempo. Tente de novo em alguns minutos.';
    }
    return msg || 'Falha ao enviar';
  }

  async function sendAnon(toProfileId, body, isAnonymous) {
    if (typeof window.fascEventEnded === 'function' && window.fascEventEnded()) {
      throw new Error('O festival acabou — a caixinha Meow não recebe mais scraps.');
    }
    var user = window.fascAuth ? await window.fascAuth.user() : null;
    if (!user) throw new Error('Entre com e-mail para enviar (o recado pode continuar anônimo).');
    if (!toProfileId) throw new Error('Perfil destino inválido.');
    if (user.id === toProfileId) throw new Error('Não dá pra mandar recado pra si mesmo.');
    var payload = {
      to_profile_id: toProfileId,
      body: String(body || '').trim().slice(0, 280),
      is_anonymous: isAnonymous !== false,
      from_profile_id: isAnonymous === false ? user.id : null
    };
    if (!payload.body) throw new Error('Escreva alguma coisa.');
    // Filtro de linguagem hostil (client) — bloqueia; não suaviza
    if (window.CricriHostileFilter) {
      window.CricriHostileFilter.assertClean(payload.body);
    }
    var res = await window.fascDb.from('inbox_anon').insert(payload).select('id').single();
    if (res.error) throw new Error(mapDbError(res.error));
    return res.data;
  }

  async function loadMyInbox() {
    var user = window.fascAuth ? await window.fascAuth.user() : null;
    if (!user || !window.fascDb) return [];

    // P1.6 — após EVENT_END não lista recados (filtro de leitura; sem delete)
    if (typeof window.fascEventEnded === 'function' && window.fascEventEnded()) {
      return [];
    }
    var eventEndIso =
      (window.FASC_CONFIG && window.FASC_CONFIG.eventEndIso) ||
      '2026-11-23T12:00:00-03:00';

    var res = await window.fascDb
      .from('inbox_anon')
      .select('id,body,is_anonymous,answer,answered_at,is_hidden,created_at,from_profile_id,reaction,is_public')
      .eq('to_profile_id', user.id)
      .eq('is_hidden', false)
      .lt('created_at', eventEndIso)
      .order('created_at', { ascending: false })
      .limit(50);
    if (res.error) {
      console.warn('[anon inbox]', res.error.message);
      return [];
    }
    return res.data || [];
  }

  async function answerMessage(id, answer) {
    var text = String(answer || '').trim().slice(0, 500);
    if (!text) throw new Error('Resposta vazia.');
    var res = await window.fascDb.from('inbox_anon').update({
      answer: text,
      answered_at: new Date().toISOString()
    }).eq('id', id);
    if (res.error) throw res.error;
  }

  async function setReaction(id, emoji) {
    var allowed = { '🔥': 1, '💛': 1, '🥹': 1 };
    if (!allowed[emoji]) throw new Error('Reação inválida');
    var res = await window.fascDb.from('inbox_anon').update({ reaction: emoji }).eq('id', id);
    if (res.error) throw res.error;
  }

  async function hideMessage(id) {
    var res = await window.fascDb.from('inbox_anon').update({ is_hidden: true }).eq('id', id);
    if (res.error) throw res.error;
  }

  /** Um registro por vez — nunca em lote */
  async function makePublic(id) {
    if (!id) throw new Error('Recado inválido.');
    var res = await window.fascDb.from('inbox_anon').update({ is_public: true }).eq('id', id);
    if (res.error) throw res.error;
  }

  /**
   * Mural público — RPC (sem from_profile_id).
   * @param {{ userId?: string, handle?: string }} opts
   */
  async function loadKindnessWall(opts) {
    opts = opts || {};
    if (!window.fascDb || !window.fascDb.rpc) return [];
    try {
      if (opts.handle) {
        var h = await window.fascDb.rpc('get_kindness_wall_by_handle', {
          p_handle: String(opts.handle).replace(/^@/, '').trim()
        });
        if (h.error) {
          console.warn('[kindness]', h.error.message);
          return [];
        }
        return h.data || [];
      }
      if (opts.userId) {
        var r = await window.fascDb.rpc('get_kindness_wall', { p_to_user: opts.userId });
        if (r.error) {
          console.warn('[kindness]', r.error.message);
          return [];
        }
        return r.data || [];
      }
      return [];
    } catch (e) {
      console.warn('[kindness]', e.message || e);
      return [];
    }
  }


  function countReactions(list) {
    var counts = { '🔥': 0, '💛': 0, '🥹': 0 };
    (list || []).forEach(function (m) {
      if (m && m.reaction && counts[m.reaction] != null) counts[m.reaction]++;
    });
    return counts;
  }

  function paintReactionCounts(counts) {
    var host = $('anon-react-counts');
    if (!host) return;
    var total = (counts['🔥'] || 0) + (counts['💛'] || 0) + (counts['🥹'] || 0);
    host.hidden = false;
    host.innerHTML =
      '<span class="anon-react-counts-label">Suas reações</span>' +
      '<span class="anon-react-count-pill" data-em="🔥">🔥 <strong>' + (counts['🔥'] || 0) + '</strong></span>' +
      '<span class="anon-react-count-pill" data-em="💛">💛 <strong>' + (counts['💛'] || 0) + '</strong></span>' +
      '<span class="anon-react-count-pill" data-em="🥹">🥹 <strong>' + (counts['🥹'] || 0) + '</strong></span>' +
      '<span class="anon-react-counts-total">' + total + ' no total</span>';
  }

  function renderInbox(list) {
    var box = $('anon-inbox-list');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="anon-empty">Nenhum recado ainda. Compartilha teu perfil com <code>?u=seuhandle</code>.</p>';
      return;
    }
    var REACT_EMOJIS = ['🔥', '💛', '🥹'];
    box.innerHTML = list.map(function (m) {
      var date = m.created_at ? new Date(m.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      var label = m.is_anonymous ? 'anônimo' : 'identificado';
      var answered = m.answer
        ? '<div class="anon-answer"><strong>Sua resposta:</strong> ' + escapeHtml(m.answer) + '</div>'
        : '<div class="anon-reply-row">' +
            '<label class="sr-only" for="ans-' + m.id + '">Responder</label>' +
            '<input class="profile-input anon-answer-input" id="ans-' + m.id + '" maxlength="500" placeholder="Responder em público…">' +
            '<button type="button" class="profile-btn primary anon-answer-btn" data-answer="' + m.id + '">Responder</button>' +
          '</div>';
      var reactBtns = REACT_EMOJIS.map(function (em) {
        var on = m.reaction === em ? ' is-on' : '';
        return '<button type="button" class="anon-react-btn' + on + '" data-react="' + m.id + '" data-emoji="' + em + '" aria-pressed="' + (m.reaction === em ? 'true' : 'false') + '" aria-label="Reagir ' + em + '">' + em + '</button>';
      }).join('');
      var publicBtn = m.is_public
        ? '<button type="button" class="anon-public is-public" disabled>No mural público ✓</button>'
        : '<button type="button" class="anon-public" data-public="' + m.id + '">Tornar este elogio público no meu perfil</button>';
      return (
        '<article class="anon-item" data-id="' + m.id + '">' +
          '<header class="anon-item-head"><span class="anon-badge">' + label + '</span><time>' + escapeHtml(date) + '</time></header>' +
          '<p class="anon-body">' + escapeHtml(m.body) + '</p>' +
          '<div class="anon-react-row" role="group" aria-label="Reação rápida">' + reactBtns + '</div>' +
          answered +
          publicBtn +
          '<button type="button" class="anon-hide" data-hide="' + m.id + '">Ocultar</button>' +
        '</article>'
      );
    }).join('');
  }

  async function refreshInbox() {
    try {
      var list = await loadMyInbox();
      renderInbox(list);
      paintReactionCounts(countReactions(list));
      var count = $('anon-inbox-count');
      if (count) count.textContent = list.filter(function (m) { return !m.answer; }).length + ' sem resposta';
    } catch (err) {
      setMsg($('anon-inbox-msg'), err.message || 'Falha ao carregar caixinha', false);
    }
  }

  function wireInboxActions() {
    var list = $('anon-inbox-list');
    if (!list || list.dataset.bound === '1') return;
    list.dataset.bound = '1';
    list.addEventListener('click', async function (e) {
      var hideBtn = e.target.closest('[data-hide]');
      var ansBtn = e.target.closest('[data-answer]');
      var reactBtn = e.target.closest('[data-react]');
      var publicBtn = e.target.closest('[data-public]');
      try {
        if (reactBtn) {
          var rid = reactBtn.getAttribute('data-react');
          var em = reactBtn.getAttribute('data-emoji');
          await setReaction(rid, em);
          await refreshInbox();
          setMsg($('anon-inbox-msg'), 'Reação ' + em + ' salva.', true);
          if (typeof window.showMeowPayForward === 'function') window.showMeowPayForward();
          return;
        }
        if (hideBtn) {
          await hideMessage(hideBtn.getAttribute('data-hide'));
          await refreshInbox();
          setMsg($('anon-inbox-msg'), 'Recado ocultado.', true);
          return;
        }
        if (publicBtn) {
          var pid = publicBtn.getAttribute('data-public');
          await makePublic(pid);
          await refreshInbox();
          setMsg($('anon-inbox-msg'), 'Elogio no mural de gentilezas.', true);
          return;
        }
        if (ansBtn) {
          var id = ansBtn.getAttribute('data-answer');
          var input = $('ans-' + id);
          await answerMessage(id, input && input.value);
          await refreshInbox();
          setMsg($('anon-inbox-msg'), 'Resposta publicada.', true);
          if (typeof window.showMeowPayForward === 'function') window.showMeowPayForward();
        }
      } catch (err) {
        setMsg($('anon-inbox-msg'), err.message || 'Erro', false);
      }
    });
  }


  /** Ice-breakers: preenche textarea ao clicar (delegação) */
  function wireIceBreakers(root, textareaId) {
    if (!root) return;
    var ice = root.querySelector('[data-ice-group], .meow-ice, .anon-ice');
    var ta = document.getElementById(textareaId);
    if (!ice || !ta || ice.dataset.bound === '1') return;
    ice.dataset.bound = '1';
    ice.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-ice]');
      if (!chip || !ice.contains(chip)) return;
      e.preventDefault();
      var text = chip.getAttribute('data-ice');
      ta.value = text == null ? '' : String(text);
      try { ta.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
      ta.focus();
    });
  }

  async function wireSendForm(target) {
    var card = $('anon-send-card');
    var form = $('anon-send-form');
    var title = $('anon-send-title');
    if (!card || !form) return;

    if (!target) {
      card.hidden = true;
      return;
    }

    var me = window.fascAuth ? await window.fascAuth.user() : null;
    if (me && me.id === target.id) {
      card.hidden = true; // não envia pra si
      return;
    }

    card.hidden = false;
    if (title) {
      title.textContent = 'Recado anônimo pra ' + (target.name || target.handle || 'alguém');
    }
    var sub = $('anon-send-sub');
    if (sub) {
      sub.textContent = '@' + (target.handle || 'perfil') + ' · o nome não aparece se você marcar anônimo';
    }

    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    wireIceBreakers(card, 'anon-body');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var body = ($('anon-body') && $('anon-body').value) || '';
      var isAnon = !$('anon-identify') || !$('anon-identify').checked;
      setMsg($('anon-send-msg'), 'Enviando…', true);
      try {
        await sendAnon(target.id, body, isAnon);
        if ($('anon-body')) $('anon-body').value = '';
        setMsg($('anon-send-msg'), 'Recado enviado na caixinha.', true);
      } catch (err) {
        setMsg($('anon-send-msg'), err.message || 'Falha ao enviar', false);
      }
    });
  }

  async function boot() {
    wireInboxActions();

    var me = window.fascAuth ? await window.fascAuth.user() : null;
    var myCard = $('anon-inbox-card');
    if (myCard) {
      if (me) {
        myCard.hidden = false;
        await refreshInbox();
      } else {
        myCard.hidden = true;
      }
    }

    try {
      var target = await resolveTargetProfile();
      await wireSendForm(target);
      var hint = $('anon-share-hint');
      if (hint && me) {
        // carregar handle próprio
        var pr = await window.fascDb.from('profiles').select('handle').eq('id', me.id).maybeSingle();
        var h = pr.data && pr.data.handle;
        if (h) {
          hint.hidden = false;
          hint.innerHTML = 'Compartilha tua caixinha: <code>profile.html?u=' + escapeHtml(h) + '</code>';
        }
      }
    } catch (err) {
      console.warn('[anon]', err.message || err);
    }

    console.info('[FASC] caixinha anônima pronta');
  }

  window.fascAnon = {
    send: sendAnon,
    loadMyInbox: loadMyInbox,
    refresh: refreshInbox,
    resolveTarget: resolveTargetProfile,
    makePublic: makePublic,
    loadKindnessWall: loadKindnessWall,
    boot: boot
  };

  var anonBound = false;
  function startAnon() {
    boot().catch(function (e) { console.warn('[anon boot]', e); });
    if (!anonBound && window.fascAuth && window.fascAuth.onChange) {
      anonBound = true;
      window.fascAuth.onChange(function () {
        boot().catch(function (e) { console.warn('[anon]', e); });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startAnon);
  else startAnon();
})();
