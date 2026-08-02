/**
 * CRICRI · Programação
 * Tenta puxar dados do mapa oficial da prefeitura.
 * CORS costuma bloquear no browser → fallback local + cartazes de Música em branco
 * até a programação 2026 sair. Referência: https://mapafasc.saocristovao.se.gov.br/
 */
(function () {
  var OFFICIAL = 'https://mapafasc.saocristovao.se.gov.br/';
  var CACHE_KEY = 'cricri_prog_v1';
  var state = { events: [], cat: 'all', source: 'none' };

  // Tentativas de endpoints comuns (quando a prefeitura expuser JSON)
  var CANDIDATE_URLS = [
    OFFICIAL + 'api/eventos',
    OFFICIAL + 'api/events',
    OFFICIAL + 'data/eventos.json',
    OFFICIAL + 'eventos.json'
  ];

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function normalize(raw) {
    if (!raw) return [];
    var list = Array.isArray(raw) ? raw : (raw.eventos || raw.events || raw.data || []);
    if (!Array.isArray(list)) return [];
    return list.map(function (e, i) {
      return {
        id: e.id || ('ev-' + i),
        title: e.title || e.nome || e.name || 'Evento',
        artist: e.artist || e.artista || e.Artista || '',
        place: e.place || e.local || e.Local || e.venue || '',
        date: e.date || e.data || e.Data || '',
        time: e.time || e.hora || e.Hora || '',
        category: e.category || e.categoria || e.Categoria || 'Outros',
        poster: e.poster || e.cartaz || e.image || e.imagem || ''
      };
    });
  }

  async function tryFetchOfficial() {
    for (var i = 0; i < CANDIDATE_URLS.length; i++) {
      try {
        var res = await fetch(CANDIDATE_URLS[i], { mode: 'cors', cache: 'no-store' });
        if (!res.ok) continue;
        var data = await res.json();
        var events = normalize(data);
        if (events.length) {
          state.source = 'official-json';
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), events: events })); } catch (_) {}
          return events;
        }
      } catch (_) { /* CORS ou 404 */ }
    }
    // cache local
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.events && cached.events.length) {
        state.source = 'cache';
        return cached.events;
      }
    } catch (_) {}
    state.source = 'placeholder';
    return [];
  }

  function musicBlankPosters(n) {
    n = n || 6;
    var html = '<div class="music-blank-grid">';
    for (var i = 0; i < n; i++) {
      html += '<div class="music-blank-poster"><span>Cartaz</span>Música 2026<br>em breve</div>';
    }
    html += '</div>';
    return html;
  }

  function render() {
    var grid = document.getElementById('prog-grid');
    var status = document.getElementById('prog-status');
    if (!grid) return;
    var cat = state.cat;
    var list = state.events.filter(function (e) {
      if (cat === 'all') return true;
      if (cat === 'Outros') {
        var known = ['Música','Teatro','Cinema','Literatura','Exposição','Cultura Popular','Dança','Lançamento','Oficina','Evento'];
        return known.indexOf(e.category) === -1;
      }
      return (e.category || '').toLowerCase() === cat.toLowerCase();
    });

    if (status) {
      var srcLabel = {
        'official-json': 'dados do mapa da prefeitura',
        'cache': 'cache local',
        'placeholder': 'aguardando programação 2026'
      }[state.source] || state.source;
      status.textContent = list.length
        ? (list.length + ' itens · ' + srcLabel)
        : ('nenhum item · ' + srcLabel);
    }

    // Aba Música sem dados → cartazes em branco
    if (cat === 'Música' && !list.length) {
      grid.innerHTML =
        '<div class="prog-empty-block">' +
          '<p><strong>Música</strong> — cartazes ainda em branco.</p>' +
          '<p style="margin:0.5rem 0 0;font-size:0.85rem">Quando a prefeitura soltar a programação, a gente puxa da referência oficial e preenche aqui.</p>' +
          musicBlankPosters(6) +
        '</div>';
      return;
    }

    if (!list.length) {
      grid.innerHTML =
        '<div class="prog-empty-block">' +
          '<p>Programação 2026 ainda não está disponível neste espelho.</p>' +
          '<p style="margin:0.5rem 0 0;font-size:0.85rem">Confira a fonte oficial: ' +
          '<a href="' + OFFICIAL + '" target="_blank" rel="noopener" style="color:#e33d6b">mapafasc.saocristovao.se.gov.br</a></p>' +
        '</div>';
      return;
    }

    grid.innerHTML = list.map(function (e) {
      var catClass = (e.category || '').toLowerCase().indexOf('mús') !== -1 ? 'musica' : '';
      var poster = e.poster
        ? '<div class="prog-poster"><img src="' + esc(e.poster) + '" alt="" style="width:100%;height:100%;object-fit:cover"/></div>'
        : '<div class="prog-poster"><div class="prog-poster-empty"><strong>Sem cartaz</strong>ainda</div></div>';
      return (
        '<article class="prog-card">' +
          poster +
          '<div class="prog-card-body">' +
            '<div class="prog-cat ' + catClass + '">' + esc(e.category || 'Evento') + '</div>' +
            '<h3 class="prog-title">' + esc(e.title) + '</h3>' +
            '<p class="prog-meta">' +
              (e.artist ? esc(e.artist) + '<br>' : '') +
              esc(e.place) +
              ((e.date || e.time) ? '<br>' + esc([e.date, e.time].filter(Boolean).join(' · ')) : '') +
            '</p>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  document.querySelectorAll('.prog-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.prog-tab').forEach(function (b) { b.classList.remove('is-on'); });
      btn.classList.add('is-on');
      state.cat = btn.getAttribute('data-cat') || 'all';
      render();
    });
  });

  tryFetchOfficial().then(function (events) {
    state.events = events;
    render();
  });

  // reconsulta a cada 30 min (quando liberarem API)
  setInterval(function () {
    tryFetchOfficial().then(function (events) {
      if (events && events.length) {
        state.events = events;
        render();
      }
    });
  }, 30 * 60 * 1000);
})();
