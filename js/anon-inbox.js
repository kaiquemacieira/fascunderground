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

  async function sendAnon(toProfileId, body, isAnonymous) {
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
    var res = await window.fascDb.from('inbox_anon').insert(payload).select('id').single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function loadMyInbox() {
    var user = window.fascAuth ? await window.fascAuth.user() : null;
    if (!user || !window.fascDb) return [];
    var res = await window.fascDb
      .from('inbox_anon')
      .select('id,body,is_anonymous,answer,answered_at,is_hidden,created_at,from_profile_id')
      .eq('to_profile_id', user.id)
      .eq('is_hidden', false)
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

  async function hideMessage(id) {
    var res = await window.fascDb.from('inbox_anon').update({ is_hidden: true }).eq('id', id);
    if (res.error) throw res.error;
  }

  function renderInbox(list) {
    var box = $('anon-inbox-list');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="anon-empty">Nenhum recado ainda. Compartilha teu perfil com <code>?u=seuhandle</code>.</p>';
      return;
    }
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
      return (
        '<article class="anon-item" data-id="' + m.id + '">' +
          '<header class="anon-item-head"><span class="anon-badge">' + label + '</span><time>' + escapeHtml(date) + '</time></header>' +
          '<p class="anon-body">' + escapeHtml(m.body) + '</p>' +
          answered +
          '<button type="button" class="anon-hide" data-hide="' + m.id + '">Ocultar</button>' +
        '</article>'
      );
    }).join('');
  }

  async function refreshInbox() {
    try {
      var list = await loadMyInbox();
      renderInbox(list);
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
      try {
        if (hideBtn) {
          await hideMessage(hideBtn.getAttribute('data-hide'));
          await refreshInbox();
          setMsg($('anon-inbox-msg'), 'Recado ocultado.', true);
          return;
        }
        if (ansBtn) {
          var id = ansBtn.getAttribute('data-answer');
          var input = $('ans-' + id);
          await answerMessage(id, input && input.value);
          await refreshInbox();
          setMsg($('anon-inbox-msg'), 'Resposta publicada.', true);
        }
      } catch (err) {
        setMsg($('anon-inbox-msg'), err.message || 'Erro', false);
      }
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
