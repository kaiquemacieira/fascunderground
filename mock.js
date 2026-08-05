// js/mock.js — mapa + geoloc adaptativa + geofencing + bússola
console.log('Mock carregado');

(async function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') {
    console.warn('Leaflet ou #map não encontrado');
    return;
  }

  const map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([-11.015, -37.206], 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // ---- Geofences (Supabase → fallback local) ----
  const spots = window.fascSpots
    ? await window.fascSpots.fetchSpots()
    : [
        { id: 'convento-sao-francisco', name: 'Convento São Francisco', lat: -11.0149, lng: -37.2047, status: 'rolando agora', radius: 100 },
        { id: 'praca-sao-francisco', name: 'Praça São Francisco', lat: -11.0152, lng: -37.2052, status: '62% pronto', radius: 120 },
        { id: 'igreja-matriz', name: 'Igreja Matriz', lat: -11.0138, lng: -37.2068, status: 'vai rolar às 23h', radius: 90 },
        { id: 'largo-amparo', name: 'Largo do Amparo', lat: -11.0165, lng: -37.2075, status: 'terminou', radius: 85 },
        { id: 'casa-do-sabao', name: 'Rua da Feira', lat: -11.014, lng: -37.208, status: 'rolando agora', radius: 95 }
      ];

  const pinkIcon = L.divIcon({
    className: 'projano-marker',
    html: '<div class="spot-dot"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const activeIcon = L.divIcon({
    className: 'projano-marker active',
    html: '<div class="spot-dot active"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  const spotLayers = {};

  spots.forEach((spot) => {
    const marker = L.marker([spot.lat, spot.lng], { icon: pinkIcon })
      .bindPopup(
        `<span class="popup-cat spot">Spot</span><br>` +
        `<strong>${spot.name}</strong><br>` +
        `<span style="opacity:0.85">${spot.status}</span><br>` +
        `<span class="popup-meta">São Cristóvão · SE · zona ${spot.radius} m</span>` +
        (window.CricriRatings && window.CricriRatings.popupBlock
          ? window.CricriRatings.popupBlock('spot', spot.id || spot.name)
          : '')
      );

    const fence = L.circle([spot.lat, spot.lng], {
      radius: spot.radius,
      color: '#E8467C',
      weight: 1,
      dashArray: '4 6',
      fillColor: '#E8467C',
      fillOpacity: 0.06,
      opacity: 0.35,
      interactive: false
    });

    spotLayers[spot.id] = { marker, fence, spot };
  });


  // ---- POIs interativos: hospedagem + gastronomia (São Cristóvão / SE) ----
  const POIS = [
    {
      id: 'hosp-momentos', layer: 'hospedagem',
      name: 'Pousada Momentos',
      lat: -10.9928, lng: -37.1685,
      desc: 'Rodovia João Bebe Água · Rosa Elze',
      extra: 'Hospedagem perto do centro histórico'
    },
    {
      id: 'hosp-solove', layer: 'hospedagem',
      name: 'Pousada Só Love',
      lat: -10.9955, lng: -37.1720,
      desc: 'Rodovia João Bebe Água, 3515',
      extra: 'Minutos da Praça São Francisco'
    },
    {
      id: 'hosp-grand', layer: 'hospedagem',
      name: "Grand' Hostel São Cristóvão",
      lat: -11.0102, lng: -37.1988,
      desc: 'São Cristóvão · SE',
      extra: 'Opção econômica pro festival'
    },
    {
      id: 'hosp-haras', layer: 'hospedagem',
      name: 'Casa no Haras',
      lat: -11.0285, lng: -37.2150,
      desc: 'Zona rural · São Cristóvão',
      extra: 'Casa inteira · piscina · grupo'
    },
    {
      id: 'gastro-pordosol', layer: 'gastronomia',
      name: 'Restaurante Pôr do Sol',
      lat: -11.0168, lng: -37.2025,
      desc: 'Ladeira Porto da Banca',
      extra: 'Frutos do mar · vista do rio'
    },
    {
      id: 'gastro-queijada', layer: 'gastronomia',
      name: 'Casa da Queijada',
      lat: -11.0146, lng: -37.2058,
      desc: 'Centro histórico',
      extra: 'Queijada tradicional de SC'
    },
    {
      id: 'gastro-mangue', layer: 'gastronomia',
      name: 'Filhas do Mangue',
      lat: -11.0155, lng: -37.2048,
      desc: 'Perto da Praça São Francisco',
      extra: 'Mariscos · caranguejo · sururu'
    },
    {
      id: 'gastro-ivora', layer: 'gastronomia',
      name: 'Ivora Pizzaria e Restaurante',
      lat: -11.0125, lng: -37.2095,
      desc: 'São Cristóvão · SE',
      extra: 'Pizza, massas e pratos BR'
    }
  ];

  function poiIcon(kind) {
    return L.divIcon({
      className: 'projano-marker',
      html: '<div class="poi-dot ' + (kind === 'hospedagem' ? 'hosp' : 'gastro') + '"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 18],
      popupAnchor: [0, -16]
    });
  }

  const layerGroups = {
    spots: L.layerGroup(),
    hospedagem: L.layerGroup(),
    gastronomia: L.layerGroup(),
    transporte: L.layerGroup(),
    eventos: L.layerGroup()
  };

  // spots já no map: move markers/fences para o grupo spots
  Object.keys(spotLayers).forEach(function (id) {
    const Lyr = spotLayers[id];
    if (Lyr.marker) layerGroups.spots.addLayer(Lyr.marker);
    if (Lyr.fence) layerGroups.spots.addLayer(Lyr.fence);
  });
  layerGroups.spots.addTo(map);

  const poiMarkers = [];
  POIS.forEach(function (p) {
    const catLabel = p.layer === 'hospedagem' ? 'Hospedagem' : 'Gastronomia';
    const catClass = p.layer;
    const marker = L.marker([p.lat, p.lng], { icon: poiIcon(p.layer) })
      .bindPopup(
        '<span class="popup-cat ' + catClass + '">' + catLabel + '</span><br>' +
        '<strong>' + p.name + '</strong><br>' +
        '<span style="opacity:0.88">' + p.desc + '</span><br>' +
        '<span class="popup-meta">' + p.extra + ' · São Cristóvão, SE</span>' +
        (window.CricriRatings && window.CricriRatings.popupBlock
          ? window.CricriRatings.popupBlock('poi', p.id || p.name)
          : '')
      );
    layerGroups[p.layer].addLayer(marker);
    poiMarkers.push({ marker: marker, data: p });
  });
  layerGroups.hospedagem.addTo(map);
  layerGroups.gastronomia.addTo(map);

  // ---- EVENTOS (afters Supabase + fallback programação) ----
  const eventIcon = L.divIcon({
    className: 'projano-marker event',
    html: '<div class="event-dot"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const eventMarkers = [];
  let mapEvents = [];

  async function loadMapEvents() {
    try {
      if (window.fascEvents && window.fascEvents.fetchEvents) {
        mapEvents = await window.fascEvents.fetchEvents();
      } else {
        mapEvents = [];
      }
    } catch (e) {
      console.warn('[map events]', e);
      mapEvents = [];
    }
    // limpa camada
    layerGroups.eventos.clearLayers();
    eventMarkers.length = 0;
    mapEvents.forEach(function (ev) {
      if (ev.lat == null || ev.lng == null) return;
      const when = ev.when_label || (window.fascEvents && window.fascEvents.formatWhen
        ? window.fascEvents.formatWhen(ev.starts_at) : '');
      const marker = L.marker([ev.lat, ev.lng], { icon: eventIcon })
        .bindPopup(
          '<span class="popup-cat eventos">Evento</span><br>' +
          '<strong>' + (ev.title || 'Evento') + '</strong><br>' +
          '<span style="opacity:0.88">' + (ev.category || '') +
            (ev.place ? ' · ' + ev.place : '') + '</span><br>' +
          '<span class="popup-meta">' + (when || 'horário a confirmar') +
            ' · ' + (ev.status || 'programado') + ' · SC/SE</span>' +
          (window.CricriRatings && window.CricriRatings.popupBlock
            ? window.CricriRatings.popupBlock('event', ev.id || ev.title)
            : '')
        );
      layerGroups.eventos.addLayer(marker);
      eventMarkers.push({ marker: marker, data: ev });
      try { markerById['ev-' + ev.id] = marker; } catch (_) {}
    });
    if (layerOn.eventos && !map.hasLayer(layerGroups.eventos)) {
      map.addLayer(layerGroups.eventos);
    }
    if (typeof applyProximityFilter === 'function') applyProximityFilter();
    console.info('[map events] markers:', eventMarkers.length);
  }

  // carrega eventos assim que possível (não bloqueia o resto do mapa)
  loadMapEvents();
  // revalida a cada 10 min
  setInterval(loadMapEvents, 10 * 60 * 1000);


  // ---- Transporte público (São Cristóvão SE ↔ Aracaju) — dados orientativos front ----
  // Horários estimados (orientativos). freqMin = intervalo médio em minutos no pico.
  // windows: [{ days: 'util'|'sab'|'dom'|'fest', start: 'HH:MM', end: 'HH:MM', freqMin }]
  // departures: lista fixa HH:MM (ex.: especiais do festival)
  const BUS_LINES = [
    {
      code: '031',
      name: 'Eduardo Gomes / Centro via Des. Maynard',
      note: '~24 min até Aracaju (direto)',
      special: false,
      from: 'Terminal SC / Campus',
      windows: [
        { days: 'util', start: '05:00', end: '22:30', freqMin: 25 },
        { days: 'sab', start: '05:30', end: '22:00', freqMin: 30 },
        { days: 'dom', start: '06:00', end: '21:00', freqMin: 40 }
      ]
    },
    {
      code: '307',
      name: 'São Cristóvão / Zona Oeste',
      note: 'liga SC ao Terminal Zona Oeste',
      special: false,
      from: 'São Cristóvão',
      windows: [
        { days: 'util', start: '04:50', end: '23:30', freqMin: 30 },
        { days: 'sab', start: '05:00', end: '23:00', freqMin: 35 },
        { days: 'dom', start: '05:00', end: '22:30', freqMin: 40 }
      ]
    },
    {
      code: '715',
      name: 'Tijuquinha / Centro via Des. Maynard',
      note: 'passa pelo Terminal Campus',
      special: false,
      from: 'Campus / SC',
      windows: [
        { days: 'util', start: '05:15', end: '22:45', freqMin: 28 },
        { days: 'sab', start: '05:30', end: '22:00', freqMin: 35 },
        { days: 'dom', start: '06:00', end: '21:30', freqMin: 45 }
      ]
    },
    {
      code: '050',
      name: 'Campus / Hospital Universitário',
      note: 'região Campus / HU',
      special: false,
      from: 'Terminal Campus',
      windows: [
        { days: 'util', start: '05:30', end: '22:00', freqMin: 30 },
        { days: 'sab', start: '06:00', end: '21:00', freqMin: 40 },
        { days: 'dom', start: '06:30', end: '20:00', freqMin: 50 }
      ]
    },
    {
      code: '090',
      name: 'Campus / D.I.A.',
      note: 'Campus ↔ Terminal DIA',
      special: false,
      from: 'Terminal Campus',
      windows: [
        { days: 'util', start: '05:20', end: '22:15', freqMin: 30 },
        { days: 'sab', start: '05:45', end: '21:30', freqMin: 40 },
        { days: 'dom', start: '06:15', end: '20:30', freqMin: 50 }
      ]
    },
    {
      code: 'FEST',
      name: 'Especiais do festival (gratuitos)',
      note: 'Aracaju → SC · retorno madrugada (padrão CTM)',
      special: true,
      from: 'Terminais Aracaju → SC',
      // Janela do evento 19–22/11/2026 (ajuste fino na semana do festival)
      departures: {
        // ida Aracaju → SC (terminais Centro/DIA/Atalaia)
        ida: {
          'qui-sex': ['18:00', '19:00', '20:00', '21:00'],
          'sab-dom': ['12:00', '14:00', '16:00', '18:00', '19:30', '20:30']
        },
        // retorno SC → Aracaju (Rua 24)
        volta: {
          all: ['00:00', '01:00', '02:00', '03:00']
        }
      },
      eventStart: '2026-11-19',
      eventEnd: '2026-11-22'
    }
  ];

  const BUS_STOPS = [
    {
      id: 'bus-terminal-sc', layer: 'transporte',
      name: 'Terminal de São Cristóvão',
      lat: -11.0128, lng: -37.2065,
      desc: 'Saídas para Aracaju · linhas metropolitanas',
      extra: 'Linhas 031, 307 e conexões',
      lines: ['031', '307']
    },
    {
      id: 'bus-centro-historico', layer: 'transporte',
      name: 'Parada Centro Histórico',
      lat: -11.0150, lng: -37.2055,
      desc: 'Perto da Praça São Francisco',
      extra: 'Acesso a pé aos spots do festival',
      lines: ['031', '715']
    },
    {
      id: 'bus-portico', layer: 'transporte',
      name: 'Pórtico de São Cristóvão',
      lat: -11.0055, lng: -37.1920,
      desc: 'Entrada da cidade · conexão metropolitana',
      extra: 'Parada estratégica especiais do festival',
      lines: ['031', '307', 'FEST']
    },
    {
      id: 'bus-rua24', layer: 'transporte',
      name: 'Rua Vinte e Quatro (retorno festival)',
      lat: -11.0142, lng: -37.2088,
      desc: 'Ponto de retorno SC → Aracaju (madrugada)',
      extra: 'Usado nos ônibus especiais do evento',
      lines: ['FEST']
    },
    {
      id: 'bus-campus', layer: 'transporte',
      name: 'Terminal Campus (referência)',
      lat: -10.9265, lng: -37.1028,
      desc: 'Campus UFS · várias linhas SC/Aracaju',
      extra: '031 · 050 · 090 · 715',
      lines: ['031', '050', '090', '715']
    },
    {
      id: 'bus-rosa-elze', layer: 'transporte',
      name: 'Parada Rosa Elze',
      lat: -10.9950, lng: -37.1700,
      desc: 'Bairro Rosa Elze · caminho para o centro',
      extra: 'Útil se estiver hospedado na região',
      lines: ['307', '031']
    }
  ];

  // rota aproximada centro SC → direção Aracaju (visual)
  const BUS_ROUTE_SC = [
    [-11.0150, -37.2055],
    [-11.0128, -37.2065],
    [-11.0055, -37.1920],
    [-10.9950, -37.1700],
    [-10.9600, -37.1400],
    [-10.9265, -37.1028]
  ];

  function busIcon() {
    return L.divIcon({
      className: 'projano-marker',
      html: '<div class="poi-dot bus"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -8]
    });
  }

  const busRouteLine = L.polyline(BUS_ROUTE_SC, {
    color: '#3d8a9c',
    weight: 3,
    opacity: 0.55,
    dashArray: '6 8',
    interactive: false
  });
  layerGroups.transporte.addLayer(busRouteLine);

  BUS_STOPS.forEach(function (p) {
    const linesStr = (p.lines || []).join(' · ');
    const marker = L.marker([p.lat, p.lng], { icon: busIcon() })
      .bindPopup(
        '<span class="popup-cat transporte">Ônibus</span><br>' +
        '<strong>' + p.name + '</strong><br>' +
        '<span style="opacity:0.88">' + p.desc + '</span><br>' +
        '<span class="popup-meta">Linhas: ' + linesStr + '<br>' + p.extra + ' · SC/SE</span>'
      );
    layerGroups.transporte.addLayer(marker);
    poiMarkers.push({ marker: marker, data: p });
    // also register in markerById later via poiMarkers loop - but markerById built later from poiMarkers - good if built after this
  });
  // layerGroups.transporte.addTo(map); // v1: sem transporte em tela

  // ---- horários estimados de partida ----
  function parseHM(hm) {
    var p = String(hm).split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  }
  function fmtHM(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function dayKind(d) {
    // 0=dom ... 6=sab
    var day = (d || new Date()).getDay();
    if (day === 0) return 'dom';
    if (day === 6) return 'sab';
    return 'util';
  }
  function isFestivalDay(d) {
    d = d || new Date();
    var t = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    return t >= '2026-11-19' && t <= '2026-11-22';
  }
  function festivalSlotKey(d) {
    d = d || new Date();
    var day = d.getDay(); // 0 dom ... 4 qui 5 sex 6 sab
    // 19/11/2026 = quinta
    if (day === 4 || day === 5) return 'qui-sex';
    return 'sab-dom';
  }
  // ---- Previsão em tempo real (modelo local; sem GTFS-RT público da SMTT/CTM) ----
  // Atraso simulado por linha, estável por ~2 min, oscila levemente a cada tick.
  var _rtState = {}; // code -> { delayMin, updatedAt }
  var _rtTick = 0;

  function rtSeed(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function lineDelayMin(code) {
    if (window.CricriGtfsRt) {
      var real = window.CricriGtfsRt.getDelay(code);
      if (real != null) {
        _rtState[code] = { delayMin: real, updatedAt: Date.now(), fromRt: true };
        return real;
      }
    }
    var now = Date.now();
    var st = _rtState[code];
    if (st && st.fromRt && now - st.updatedAt < 180000) return st.delayMin;
    if (!st || now - st.updatedAt > 120000 || st.fromRt) {
      var base = (rtSeed(code + String(Math.floor(now / 120000))) % 7) - 2;
      var h = new Date().getHours();
      if (h >= 7 && h <= 9) base += 2;
      if (h >= 17 && h <= 19) base += 3;
      st = { delayMin: base, updatedAt: now, fromRt: false };
      _rtState[code] = st;
    }
    var jitter = ((_rtTick + rtSeed(code)) % 3) - 1;
    return st.delayMin + jitter;
  }

  function liveNowMinutes() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  }

  /** Previsões ao vivo: ETA em minutos + horário previsto + atraso */
  function livePredictions(line, count) {
    count = count || 3;
    var nowM = liveNowMinutes();
    var delay = line.special ? 0 : lineDelayMin(line.code);
    var out = [];
    var now = new Date();

    if (line.special && line.departures) {
      if (!isFestivalDay(now)) {
        return [{ label: '—', etaMin: null, delay: 0, status: 'off', note: 'só no festival 19–22/11' }];
      }
      var key = festivalSlotKey(now);
      var ida = (line.departures.ida && (line.departures.ida[key] || line.departures.ida['sab-dom'])) || [];
      var volta = (line.departures.volta && line.departures.volta.all) || [];
      function pushFest(hm, note) {
        var m = parseHM(hm);
        var abs = m;
        if (m < 4 * 60 && nowM >= 18 * 60) abs = m + 1440;
        if (abs + 0.01 < nowM && m >= 4 * 60) return;
        if (m < 4 * 60 && nowM > m + 30 && nowM < 18 * 60) return;
        var eta = abs - nowM;
        if (eta < -0.5) return;
        out.push({
          label: hm,
          etaMin: Math.max(0, Math.round(eta)),
          delay: 0,
          status: eta <= 3 ? 'arriving' : eta <= 12 ? 'soon' : 'scheduled',
          note: note
        });
      }
      ida.forEach(function (hm) { pushFest(hm, 'ida Aracaju→SC'); });
      volta.forEach(function (hm) { pushFest(hm, 'volta SC→Aracaju'); });
      out.sort(function (a, b) { return a.etaMin - b.etaMin; });
      return out.slice(0, count);
    }

    var kind = dayKind(now);
    var wins = (line.windows || []).filter(function (w) { return w.days === kind; });
    if (!wins.length) wins = (line.windows || []).filter(function (w) { return w.days === 'util'; });

    wins.forEach(function (w) {
      var start = parseHM(w.start);
      var end = parseHM(w.end);
      var freq = Math.max(10, w.freqMin || 30);
      var t = start;
      if (nowM - delay > start) {
        var steps = Math.ceil((nowM - delay - start) / freq);
        t = start + steps * freq;
      }
      var guard = 0;
      while (t <= end + freq && out.length < count + 4 && guard++ < 80) {
        var predicted = t + delay; // horário real estimado
        var eta = predicted - nowM;
        if (eta >= -0.75) {
          out.push({
            label: fmtHM(Math.round(predicted)),
            etaMin: Math.max(0, Math.round(eta)),
            delay: delay,
            status: eta <= 2 ? 'arriving' : eta <= 10 ? 'soon' : 'scheduled',
            note: delay > 0 ? ('+' + delay + ' min') : delay < 0 ? (delay + ' min') : 'no horário'
          });
        }
        t += freq;
      }
    });

    out.sort(function (a, b) { return a.etaMin - b.etaMin; });
    var seen = {};
    out = out.filter(function (x) {
      var k = x.label + x.note;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    return out.slice(0, count);
  }

  // compat
  function nextDepartures(line, count) {
    return livePredictions(line, count).map(function (p) {
      return { label: p.label, when: null, note: p.note, etaMin: p.etaMin, status: p.status, delay: p.delay };
    });
  }

  function nextLabelHtml(line) {
    var next = livePredictions(line, 3);
    if (!next.length) {
      return '<span class="bus-next bus-next-off">sem previsão agora</span>';
    }
    return next.map(function (n, i) {
      var cls = 'bus-next';
      if (n.status === 'arriving') cls += ' bus-next-arriving';
      else if (n.status === 'soon' || i === 0) cls += ' bus-next-soon';
      if (n.status === 'off') cls += ' bus-next-off';
      var eta = (n.etaMin != null && n.status !== 'off')
        ? (n.etaMin <= 0 ? ' agora' : (' ' + n.etaMin + ' min'))
        : '';
      var extra = n.note ? ' <small>' + n.note + '</small>' : '';
      return '<span class="' + cls + '"><b>' + n.label + '</b>' + eta + extra + '</span>';
    }).join('');
  }

  function fillTransitPanel() {
    _rtTick++;
    var ul = document.getElementById('map-transit-lines');
    if (!ul) return;
    var clock = document.getElementById('map-transit-clock');
    var live = document.getElementById('map-transit-live');
    var now = new Date();
    if (clock) {
      clock.textContent = 'Agora ' + fmtHM(now.getHours() * 60 + now.getMinutes()) +
        (isFestivalDay(now) ? ' · dia de festival' : '');
    }
    if (live) {
      live.setAttribute('data-live', '1');
      live.innerHTML = '<span class="live-dot" aria-hidden="true"></span> previsão ao vivo';
    }
    ul.innerHTML = BUS_LINES.map(function (l) {
      var cls = l.special ? 'bus-line-badge special' : 'bus-line-badge';
      var preds = livePredictions(l, 1);
      var delayBadge = '';
      if (preds[0] && preds[0].delay != null && !l.special && preds[0].status !== 'off') {
        var d = preds[0].delay;
        if (d > 0) delayBadge = '<span class="bus-delay bus-delay-late">atraso ~' + d + ' min</span>';
        else if (d < 0) delayBadge = '<span class="bus-delay bus-delay-early">adiantado ~' + Math.abs(d) + ' min</span>';
        else delayBadge = '<span class="bus-delay bus-delay-ok">no horário</span>';
      }
      return (
        '<li class="bus-line-row">' +
          '<div class="bus-line-top">' +
            '<span class="' + cls + '">' + l.code + '</span> ' +
            '<strong>' + l.name + '</strong> ' + delayBadge +
          '</div>' +
          '<div class="bus-line-note">' + l.note + (l.from ? ' · sai de ' + l.from : '') + '</div>' +
          '<div class="bus-line-next" aria-label="Previsão em tempo real">' +
            '<span class="bus-next-label">previsão</span> ' + nextLabelHtml(l) +
          '</div>' +
        '</li>'
      );
    }).join('');
  }

  function scheduleSnippetForStop(stop) {
    var codes = stop.lines || [];
    var bits = [];
    codes.forEach(function (code) {
      var line = null;
      BUS_LINES.forEach(function (l) { if (l.code === code) line = l; });
      if (!line) return;
      var next = livePredictions(line, 2);
      next.forEach(function (n) {
        if (n.status === 'off') {
          bits.push(code + ' ' + (n.note || '—'));
        } else {
          bits.push(code + ' ' + n.label + (n.etaMin != null ? (' (' + (n.etaMin <= 0 ? 'agora' : n.etaMin + ' min') + ')') : ''));
        }
      });
    });
    return bits.length ? bits.join(' · ') : 'sem previsão';
  }

  function refreshBusStopPopups() {
    if (typeof poiMarkers === 'undefined') return;
    poiMarkers.forEach(function (item) {
      var p = item.data;
      if (!p || p.layer !== 'transporte') return;
      var ref = (typeof refPoint === 'function') ? refPoint() : { lat: -11.015, lng: -37.206 };
      var dist = (typeof haversineMLocal === 'function')
        ? haversineMLocal(ref, { lat: p.lat, lng: p.lng })
        : 0;
      var distStr = (typeof formatDist === 'function') ? formatDist(dist) : '';
      var linesStr = (p.lines || []).join(' · ');
      var sched = scheduleSnippetForStop(p);
      item.marker.setPopupContent(
        '<span class="popup-cat transporte">Ônibus</span><br>' +
        '<strong>' + p.name + '</strong><br>' +
        '<span style="opacity:0.88">' + (p.desc || '') + '</span><br>' +
        '<span class="popup-meta">' + (distStr ? distStr + ' · ' : '') + 'Linhas: ' + linesStr +
          '<br>' + (p.extra || '') + ' · SC/SE' +
          (sched ? '<br>Previsão: ' + sched : '') + '</span>'
      );
    });
  }

  fillTransitPanel();
  setTimeout(function () {
  var __MARKET_ENABLED = !!(document.getElementById('market-grid') || document.getElementById('marketplace'));
  if (!__MARKET_ENABLED) {
    console.info('[CRICRI] mock: catálogo marketplace não montado (seção ausente)');
  }

    try { refreshBusStopPopups(); } catch (e) {}
  }, 50);
  setInterval(function () {
    try {
      fillTransitPanel();
      refreshBusStopPopups();
    } catch (e) {}
  }, 15000);

  // Gancho API real (quando existir endpoint):
  // window.FASC_TRANSIT_RT_URL = 'https://.../delays.json'
  // formato: { "delays": { "031": 3, "307": -1 } }
  async function pullRealTimeDelays() {
    try {
      if (!window.CricriGtfsRt) return;
      var st = await window.CricriGtfsRt.fetchFeed();
      if (st.source === 'none') return;
      Object.keys(st.delaysByRoute || {}).forEach(function (code) {
        _rtState[code] = { delayMin: st.delaysByRoute[code], updatedAt: Date.now(), fromRt: true };
      });
      var live = document.getElementById('map-transit-live');
      if (live) {
        if (st.source === 'gtfs-rt') {
          live.innerHTML = '<span class="live-dot" aria-hidden="true"></span> GTFS-RT ao vivo';
        } else if (st.source === 'json-delays') {
          live.innerHTML = '<span class="live-dot" aria-hidden="true"></span> API de atrasos';
        }
      }
      fillTransitPanel();
      refreshBusStopPopups();
      console.info('[CRICRI GTFS-RT]', st.source, st.delaysByRoute);
    } catch (e) {
      console.warn('[CRICRI GTFS-RT]', e.message || e);
    }
  }
  setInterval(pullRealTimeDelays, 30000);
  setTimeout(pullRealTimeDelays, 2500);






  const CENTER_SC = { lat: -11.015, lng: -37.206 }; // centro histórico São Cristóvão SE
  /* Proximidade · presets calibrados pro centro histórico (caminhável) */
  const PROX_STORAGE_KEY = 'cricri_map_prox_m';
  const PROX_PRESETS = [0, 200, 400, 800, 1500];
  const PROX_MAX_GPS_AGE_MS = 180000; // 3 min
  let proxRadiusM = 0; // 0 = todos
  let proxCircle = null; // círculo visual do raio
  let layerOn = { spots: true, hospedagem: true, gastronomia: true, transporte: false, eventos: true }; // transporte fora da v1 (sem GTFS real)
  // Hoisted: refPoint()/applyProximityFilter rodam antes do bloco GPS — evita TDZ
  let lastPos = null;

  try {
    var storedProx = parseInt(sessionStorage.getItem(PROX_STORAGE_KEY), 10);
    if (PROX_PRESETS.indexOf(storedProx) !== -1) proxRadiusM = storedProx;
  } catch (_) {}


  function haversineMLocal(a, b) {
    const R = 6371000;
    const toR = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toR;
    const dLng = (b.lng - a.lng) * toR;
    const la1 = a.lat * toR;
    const la2 = b.lat * toR;
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function refPoint() {
    // Offline-aware: GPS fresco → cache PWA → centro SC
    // lastPos é let no topo do escopo (evita TDZ se chamado cedo no boot do mapa)
    var pos = null;
    try { pos = lastPos; } catch (_) { pos = null; }
    if (window.fascGeoOffline && typeof window.fascGeoOffline.resolve === 'function') {
      const r = window.fascGeoOffline.resolve(pos);
      return { lat: r.lat, lng: r.lng, source: r.source, quality: r.quality, accuracy: r.accuracy, time: r.time };
    }
    if (pos && pos.lat != null) {
      const age = Date.now() - (pos.time || 0);
      if (age < 180000) return { lat: pos.lat, lng: pos.lng, source: 'gps' };
      if (age < 6 * 3600000) return { lat: pos.lat, lng: pos.lng, source: navigator.onLine === false ? 'offline' : 'cache' };
    }
    return { lat: CENTER_SC.lat, lng: CENTER_SC.lng, source: 'centro' };
  }

  function formatDist(m) {
    if (m < 1000) return Math.round(m) + ' m';
    return (m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',') + ' km';
  }

  function updateProxRefLabel() {
    const el = document.getElementById('map-prox-ref');
    if (!el) return;
    const r = refPoint();
    if (r.source === 'gps') el.textContent = 'ref: sua posição';
    else if (r.source === 'offline') el.textContent = 'ref: última posição (offline)';
    else if (r.source === 'cache') el.textContent = 'ref: última posição (cache)';
    else el.textContent = 'ref: centro SC (ative GPS)';
  }

  function updateProxCount() {
    const el = document.getElementById('map-prox-count');
    if (!el) return;
    var n = 0;
    try {
      if (typeof collectVisiblePlaces === 'function') n = collectVisiblePlaces().length;
    } catch (_) {}
    if (!proxRadiusM) {
      el.textContent = n ? (n + ' lugares') : '';
    } else {
      el.textContent = n ? (n + ' num raio de ' + (proxRadiusM >= 1000 ? (proxRadiusM / 1000).toString().replace('.', ',') + ' km' : proxRadiusM + ' m')) : 'nada neste raio';
    }
  }

  function syncProxCircle() {
    const ref = refPoint();
    if (!proxRadiusM) {
      if (proxCircle) {
        try { map.removeLayer(proxCircle); } catch (_) {}
        proxCircle = null;
      }
      return;
    }
    if (!proxCircle) {
      proxCircle = L.circle([ref.lat, ref.lng], {
        radius: proxRadiusM,
        color: '#5ec4d6',
        weight: 1.5,
        dashArray: '6 8',
        fillColor: '#5ec4d6',
        fillOpacity: 0.06,
        opacity: 0.55,
        interactive: false
      }).addTo(map);
    } else {
      proxCircle.setLatLng([ref.lat, ref.lng]);
      proxCircle.setRadius(proxRadiusM);
      if (!map.hasLayer(proxCircle)) proxCircle.addTo(map);
    }
  }

  function setProximityRadius(m, opts) {
    opts = opts || {};
    m = parseInt(m, 10) || 0;
    if (PROX_PRESETS.indexOf(m) === -1 && m !== 0) {
      // aceita valor custom via API
      m = Math.max(0, Math.min(5000, m));
    }
    proxRadiusM = m;
    try { sessionStorage.setItem(PROX_STORAGE_KEY, String(m)); } catch (_) {}

    document.querySelectorAll('[data-prox]').forEach(function (b) {
      var v = parseInt(b.getAttribute('data-prox'), 10) || 0;
      var active = v === m;
      b.classList.toggle('is-on', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // se escolheu raio e não tem GPS fresco, pede localização
    if (m > 0 && opts.requestGps !== false) {
      var r = refPoint();
      if (r.source !== 'gps' && window.projanoMap && typeof window.projanoMap.startWatching === 'function') {
        try { window.projanoMap.startWatching(); } catch (_) {}
      } else if (r.source !== 'gps' && typeof startWatching === 'function') {
        try { startWatching(); } catch (_) {}
      }
    }

    applyProximityFilter();
    if (opts.fit !== false) {
      try { fitAllVisible(); } catch (_) {}
    }
  }


  function applyProximityFilter() {
    const ref = refPoint();
    updateProxRefLabel();
    const maxM = proxRadiusM; // 0 = sem limite

    // Spots
    Object.keys(spotLayers).forEach(function (id) {
      const Lyr = spotLayers[id];
      const dist = haversineMLocal(ref, { lat: Lyr.spot.lat, lng: Lyr.spot.lng });
      const inRange = !maxM || dist <= maxM;
      const show = layerOn.spots && inRange;
      if (show) {
        if (!layerGroups.spots.hasLayer(Lyr.marker)) layerGroups.spots.addLayer(Lyr.marker);
        if (Lyr.fence && !layerGroups.spots.hasLayer(Lyr.fence)) layerGroups.spots.addLayer(Lyr.fence);
        // atualiza popup com distância
        Lyr.marker.setPopupContent(
          '<span class="popup-cat spot">Spot</span><br>' +
          '<strong>' + Lyr.spot.name + '</strong><br>' +
          '<span style="opacity:0.85">' + Lyr.spot.status + '</span><br>' +
          '<span class="popup-meta">' + formatDist(dist) + ' · zona ' + Lyr.spot.radius + ' m · SC/SE</span>' +
          (window.CricriRatings && window.CricriRatings.popupBlock
            ? window.CricriRatings.popupBlock('spot', Lyr.spot.id || Lyr.spot.name)
            : '')
        );
      } else {
        if (layerGroups.spots.hasLayer(Lyr.marker)) layerGroups.spots.removeLayer(Lyr.marker);
        if (Lyr.fence && layerGroups.spots.hasLayer(Lyr.fence)) layerGroups.spots.removeLayer(Lyr.fence);
      }
    });

    // POIs hospedagem / gastronomia / ônibus
    poiMarkers.forEach(function (item) {
      const p = item.data;
      const dist = haversineMLocal(ref, { lat: p.lat, lng: p.lng });
      const inRange = !maxM || dist <= maxM;
      const show = layerOn[p.layer] && inRange;
      const catLabel = p.layer === 'hospedagem' ? 'Hospedagem'
        : p.layer === 'gastronomia' ? 'Gastronomia'
        : p.layer === 'transporte' ? 'Ônibus' : String(p.layer);
      const linesStr = (p.lines && p.lines.length) ? ('Linhas: ' + p.lines.join(' · ') + ' · ') : '';
      var sched = (p.layer === 'transporte' && typeof scheduleSnippetForStop === 'function')
        ? scheduleSnippetForStop(p) : '';
      if (show) {
        if (!layerGroups[p.layer].hasLayer(item.marker)) layerGroups[p.layer].addLayer(item.marker);
        item.marker.setPopupContent(
          '<span class="popup-cat ' + p.layer + '">' + catLabel + '</span><br>' +
          '<strong>' + p.name + '</strong><br>' +
          '<span style="opacity:0.88">' + (p.desc || '') + '</span><br>' +
          '<span class="popup-meta">' + formatDist(dist) + ' · ' + linesStr + (p.extra || '') + ' · SC/SE' +
            (sched ? '<br>Próximas: ' + sched : '') + '</span>' +
          (window.CricriRatings && window.CricriRatings.popupBlock
            ? window.CricriRatings.popupBlock('poi', p.id || p.name)
            : '')
        );
      } else {
        if (layerGroups[p.layer].hasLayer(item.marker)) layerGroups[p.layer].removeLayer(item.marker);
      }
    });
    // Eventos
    if (typeof eventMarkers !== 'undefined') {
      eventMarkers.forEach(function (item) {
        const p = item.data;
        const dist = haversineMLocal(ref, { lat: p.lat, lng: p.lng });
        const inRange = !maxM || dist <= maxM;
        const show = layerOn.eventos && inRange;
        const when = p.when_label || '';
        if (show) {
          if (!layerGroups.eventos.hasLayer(item.marker)) layerGroups.eventos.addLayer(item.marker);
          item.marker.setPopupContent(
            '<span class="popup-cat eventos">Evento</span><br>' +
            '<strong>' + (p.title || 'Evento') + '</strong><br>' +
            '<span style="opacity:0.88">' + (p.category || '') +
              (p.place ? ' · ' + p.place : '') + '</span><br>' +
            '<span class="popup-meta">' + formatDist(dist) + ' · ' + (when || 'horário a confirmar') +
              ' · ' + (p.status || 'programado') + ' · SC/SE</span>' +
            (window.CricriRatings && window.CricriRatings.popupBlock
              ? window.CricriRatings.popupBlock('event', p.id || p.title)
              : '')
          );
        } else {
          if (layerGroups.eventos.hasLayer(item.marker)) layerGroups.eventos.removeLayer(item.marker);
        }
      });
    }

    // traçado orientativo da rota SC → Campus
    if (typeof busRouteLine !== 'undefined') {
      if (layerOn.transporte && (!maxM || maxM >= 2000)) {
        if (!layerGroups.transporte.hasLayer(busRouteLine)) layerGroups.transporte.addLayer(busRouteLine);
      } else if (layerGroups.transporte.hasLayer(busRouteLine)) {
        layerGroups.transporte.removeLayer(busRouteLine);
      }
    }

    // garante grupos no mapa se camada ligada
    ['spots', 'hospedagem', 'gastronomia', 'transporte', 'eventos'].forEach(function (name) {
      if (layerOn[name]) {
        if (!map.hasLayer(layerGroups[name])) map.addLayer(layerGroups[name]);
      } else if (map.hasLayer(layerGroups[name])) {
        map.removeLayer(layerGroups[name]);
      }
    });
    if (typeof renderPlacesList === 'function') renderPlacesList();
    try { syncProxCircle(); } catch (_) {}
    try { updateProxCount(); } catch (_) {}
  }

  function setLayerVisible(name, on) {
    if (!(name in layerOn)) return;
    layerOn[name] = !!on;
    applyProximityFilter();
  }

  function fitAllVisible() {
    const ref = refPoint();
    const maxM = proxRadiusM;
    const latlngs = [];
    spots.forEach(function (s) {
      if (!layerOn.spots) return;
      const d = haversineMLocal(ref, s);
      if (!maxM || d <= maxM) latlngs.push([s.lat, s.lng]);
    });
    poiMarkers.forEach(function (item) {
      const p = item.data;
      if (!layerOn[p.layer]) return;
      const d = haversineMLocal(ref, p);
      if (!maxM || d <= maxM) latlngs.push([p.lat, p.lng]);
    });
    if (typeof eventMarkers !== 'undefined' && layerOn.eventos) {
      eventMarkers.forEach(function (item) {
        const p = item.data;
        const d = haversineMLocal(ref, p);
        if (!maxM || d <= maxM) latlngs.push([p.lat, p.lng]);
      });
    }
    if (latlngs.length) {
      map.fitBounds(latlngs, { padding: [36, 36], maxZoom: 16 });
    } else {
      map.setView([ref.lat, ref.lng], maxM && maxM <= 500 ? 16 : 14);
    }
  }


  let placesQuery = '';
  let activePlaceId = null;
  const markerById = {};

  Object.keys(spotLayers).forEach(function (id) {
    markerById[id] = spotLayers[id].marker;
  });
  poiMarkers.forEach(function (item) {
    markerById[item.data.id] = item.marker;
  });

  function collectVisiblePlaces() {
    const ref = refPoint();
    const maxM = proxRadiusM;
    const q = (placesQuery || '').trim().toLowerCase();
    const items = [];

    spots.forEach(function (s) {
      if (!layerOn.spots) return;
      const dist = haversineMLocal(ref, { lat: s.lat, lng: s.lng });
      if (maxM && dist > maxM) return;
      const hay = (s.name + ' ' + (s.status || '')).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      items.push({
        id: s.id,
        layer: 'spots',
        kind: 'spot',
        name: s.name,
        meta: s.status || 'spot do festival',
        lat: s.lat,
        lng: s.lng,
        dist: dist
      });
    });

    // POIs + paradas de ônibus (poiMarkers)
    poiMarkers.forEach(function (item) {
      const p = item.data;
      if (!layerOn[p.layer]) return;
      const dist = haversineMLocal(ref, { lat: p.lat, lng: p.lng });
      if (maxM && dist > maxM) return;
      const hay = (p.name + ' ' + (p.desc || '') + ' ' + (p.extra || '') + ' ' + ((p.lines || []).join(' '))).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      items.push({
        id: p.id,
        layer: p.layer,
        kind: p.layer === 'transporte' ? 'transporte' : p.layer,
        name: p.name,
        meta: p.desc || '',
        lat: p.lat,
        lng: p.lng,
        dist: dist
      });
    });

    // Eventos
    if (typeof eventMarkers !== 'undefined' && layerOn.eventos) {
      eventMarkers.forEach(function (item) {
        const p = item.data;
        const dist = haversineMLocal(ref, { lat: p.lat, lng: p.lng });
        if (maxM && dist > maxM) return;
        const hay = ((p.title || '') + ' ' + (p.place || '') + ' ' + (p.category || '')).toLowerCase();
        if (q && hay.indexOf(q) === -1) return;
        items.push({
          id: 'ev-' + p.id,
          layer: 'eventos',
          kind: 'eventos',
          name: p.title || 'Evento',
          meta: (p.when_label || '') + (p.place ? ' · ' + p.place : ''),
          lat: p.lat,
          lng: p.lng,
          dist: dist
        });
      });
    }

    items.sort(function (a, b) { return a.dist - b.dist; });
    return items;
  }

  function renderPlacesList() {
    const list = document.getElementById('map-places-list');
    const countEl = document.getElementById('map-places-count');
    if (!list) return;
    const items = collectVisiblePlaces();
    if (countEl) {
      countEl.textContent = items.length + (items.length === 1 ? ' lugar' : ' lugares');
    }
    if (!items.length) {
      list.innerHTML = '<li class="map-places-empty">Nenhum lugar com esses filtros.</li>';
      return;
    }
    list.innerHTML = items.map(function (it) {
      const active = it.id === activePlaceId ? ' is-active' : '';
      return (
        '<li class="map-place-item' + active + '" role="option" tabindex="0" data-place-id="' + it.id + '" data-lat="' + it.lat + '" data-lng="' + it.lng + '">' +
          '<span class="map-place-dot ' + it.kind + '" aria-hidden="true"></span>' +
          '<div>' +
            '<div class="map-place-name">' + it.name + '</div>' +
            '<div class="map-place-meta">' + it.meta + '</div>' +
          '</div>' +
          '<span class="map-place-dist">' + formatDist(it.dist) + '</span>' +
        '</li>'
      );
    }).join('');
  }

  function focusPlace(id, lat, lng) {
    activePlaceId = id;
    renderPlacesList();
    map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
    const mk = markerById[id];
    if (mk) {
      if (mk.openPopup) mk.openPopup();
    }
    // highlight list item into view
    const row = document.querySelector('.map-place-item[data-place-id="' + id + '"]');
    if (row && row.scrollIntoView) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // clique na lista
  const placesListEl = document.getElementById('map-places-list');
  if (placesListEl) {
    placesListEl.addEventListener('click', function (e) {
      const row = e.target.closest('.map-place-item');
      if (!row) return;
      focusPlace(
        row.getAttribute('data-place-id'),
        parseFloat(row.getAttribute('data-lat')),
        parseFloat(row.getAttribute('data-lng'))
      );
    });
    placesListEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.map-place-item');
      if (!row) return;
      e.preventDefault();
      focusPlace(
        row.getAttribute('data-place-id'),
        parseFloat(row.getAttribute('data-lat')),
        parseFloat(row.getAttribute('data-lng'))
      );
    });
  }

  // busca
  const qInput = document.getElementById('map-places-q');
  if (qInput) {
    var qTimer = null;
    qInput.addEventListener('input', function () {
      clearTimeout(qTimer);
      qTimer = setTimeout(function () {
        placesQuery = qInput.value || '';
        renderPlacesList();
      }, 120);
    });
  }

  // popup → destaca na lista
  map.on('popupopen', function (e) {
    if (!e.popup || !e.popup._source) return;
    const src = e.popup._source;
    let found = null;
    Object.keys(markerById).forEach(function (id) {
      if (markerById[id] === src) found = id;
    });
    if (found) {
      activePlaceId = found;
      renderPlacesList();
    }
  });


  // chips de camada
  document.querySelectorAll('[data-map-layer]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const layer = btn.getAttribute('data-map-layer');
      if (layer === 'fit') {
        fitAllVisible();
        return;
      }
      const on = !btn.classList.contains('is-on');
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      setLayerVisible(layer, on);
    });
  });

  // chips de proximidade
  document.querySelectorAll('[data-prox]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const v = parseInt(btn.getAttribute('data-prox'), 10) || 0;
      setProximityRadius(v, { fit: true, requestGps: true });
    });
  });

  // botão GPS dedicado
  var gpsBtn = document.getElementById('map-prox-gps');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', function () {
      gpsBtn.classList.add('is-on');
      gpsBtn.setAttribute('aria-pressed', 'true');
      if (typeof startWatching === 'function') {
        try { startWatching({ precise: true }); } catch (_) {}
      } else if (window.projanoMap && window.projanoMap.startWatching) {
        try { window.projanoMap.startWatching(); } catch (_) {}
      }
      // se ainda em "Todos", sugere 400 m (raio do centro histórico)
      if (!proxRadiusM) setProximityRadius(400, { fit: true, requestGps: false });
      else setProximityRadius(proxRadiusM, { fit: true, requestGps: false });
      var refEl = document.getElementById('map-prox-ref');
      if (refEl) refEl.textContent = 'pedindo GPS…';
    });
  }

  // reaplicar quando GPS atualizar
  window.addEventListener('projano:position', function () {
    updateProxRefLabel();
    applyProximityFilter();
    var gpsBtn2 = document.getElementById('map-prox-gps');
    if (gpsBtn2) {
      gpsBtn2.classList.add('is-on');
      gpsBtn2.setAttribute('aria-pressed', 'true');
    }
  });

  // expõe API
  window.projanoMapLayers = {
    groups: layerGroups,
    pois: POIS,
    events: eventMarkers,
    reloadEvents: loadMapEvents,
    fitAll: fitAllVisible,
    setVisible: setLayerVisible,
    setProximity: function (m) {
      setProximityRadius(m, { fit: true, requestGps: true });
    },
    getProximity: function () { return proxRadiusM; },
    presets: PROX_PRESETS,
    applyFilter: applyProximityFilter,
    focusPlace: focusPlace,
    renderList: renderPlacesList
  };

  // estado inicial (restaura chip salvo)
  document.querySelectorAll('[data-prox]').forEach(function (b) {
    var v = parseInt(b.getAttribute('data-prox'), 10) || 0;
    var active = v === proxRadiusM;
    b.classList.toggle('is-on', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  applyProximityFilter();
  setTimeout(function () {
    try { fitAllVisible(); } catch (e) {}
  }, 300);


  // ---- Perfis GPS ----
  /* Geolocalização · WiFi/rede primeiro, GNSS só sob demanda
   *
   * No browser NÃO existe API para escanear SSIDs.
   * enableHighAccuracy:false → o SO usa WiFi + celular (rápido, pouca bateria).
   * enableHighAccuracy:true  → pede GNSS (GPS) quando disponível.
   */
  const GEO_PROFILES = {
    // WiFi / rede / celular — padrão do festival (centro denso)
    eco:  { enableHighAccuracy: false, timeout: 12000, maximumAge: 45000 },
    // Ainda rede; timeout um pouco mais apertado perto de zona
    mid:  { enableHighAccuracy: false, timeout: 10000, maximumAge: 15000 },
    // GNSS (GPS) — só burst: botão GPS, dentro da cerca, centerOnUser
    high: { enableHighAccuracy: true,  timeout: 12000, maximumAge: 4000 }
  };
  const GEO_MODE_LABEL = { eco: 'WiFi/rede', mid: 'rede', high: 'GPS' };

  const APPROACH_BUFFER_M = 180;
  const POOR_ACCURACY_M = 80;
  const OUTLIER_JUMP_M = 220;
  const MIN_UPDATE_MS = 10000;   // menos repaint no mapa
  const MIN_MOVE_M = 22;          // ignora micro-movimentos
  const FENCE_CHECK_MS = 6000;    // geofence menos frequente
  const SAMPLE_WINDOW = 4;
  const PRECISE_BURST_MS = 18000;  // burst curto só no botão GPS / fence
  const GPS_PAUSE_HIDDEN = true;  // para watch quando aba/mapa some
  const GPS_TICK_MIN_MS = 4000; // mínimo entre eventos projano:position
  let lastPosEventTs = 0;

  // ---- Bússola + fusão giroscópio ----
  // Filtro complementar: gyro (alta freq.) + magnetômetro (referência absoluta)
  const FUSION_GYRO_WEIGHT = 0.92;  // quanto confiar no gyro entre amostras mag
  const MAG_TRUST_BASE = 0.12;      // quanto puxar para o mag quando estável
  const MAG_TRUST_MOVING = 0.04;    // menos trust no mag se o aparelho está girando rápido
  const GYRO_DEADZONE = 0.8;        // deg/s — ignora ruído de fundo
  const GYRO_SPIKE = 400;           // deg/s — rejeita leituras absurdas
  const CALIB_MIN_SAMPLES = 40;
  const CALIB_MIN_VARIANCE = 25;
  const CALIB_DURATION_MS = 8000;

  function makeUserIconHtml(heading) {
    const rot = heading == null ? 0 : heading;
    const hasHeading = heading != null;
    return (
      `<div class="user-marker-wrap${hasHeading ? ' has-heading' : ''}">` +
        `<div class="user-cone" style="transform:rotate(${rot}deg)"></div>` +
        `<div class="user-dot"><span class="user-pulse"></span></div>` +
      `</div>`
    );
  }

  function buildUserIcon(heading) {
    return L.divIcon({
      className: 'projano-user-marker',
      html: makeUserIconHtml(heading),
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  }

  let userMarker = null;
  let accuracyCircle = null;
  let watchId = null;
  // lastPos hoisted no topo (evita TDZ em refPoint)
  // PWA offline: restaura último fix salvo
  try {
    if (window.fascGeoOffline) {
      var cachedGeo = window.fascGeoOffline.load();
      if (cachedGeo && window.fascGeoOffline.classify(cachedGeo) !== 'expired') {
        lastPos = {
          lat: cachedGeo.lat,
          lng: cachedGeo.lng,
          accuracy: cachedGeo.accuracy || 80,
          time: cachedGeo.time
        };
        console.info('[CRICRI geo] restaurado do cache', window.fascGeoOffline.classify(cachedGeo));
      }
    }
  } catch (_) {}

  let lastRaw = null;
  let lastUiUpdate = 0;
  let followedOnce = false;
  let mapVisible = false;
  let pageVisible = !document.hidden;
  let watching = false;
  let currentProfile = 'eco';
  let preciseUntil = 0;
  const samples = [];

  const insideFences = new Set();
  let lastFenceCheck = 0;

  // estado da bússola + fusão
  let heading = null;          // graus fundidos, 0 = norte, horário
  let headingRaw = null;       // referência magnetômetro
  let compassActive = false;
  let compassPerm = 'unknown'; // unknown | granted | denied | unsupported
  let motionPerm = 'unknown';
  let orientHandler = null;
  let motionHandler = null;
  let calibSamples = [];
  let calibrating = false;
  let calibTimer = null;
  let lastGyroTs = 0;          // performance.now() da última amostra gyro
  let lastMagTs = 0;
  let gyroRateZ = 0;           // deg/s em torno do eixo vertical do mundo (aprox.)
  let fusionMode = 'mag';      // mag | fusion | gyro

  function haversineM(a, b) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function nearestSpotDistance(lat, lng) {
    let min = Infinity;
    let nearest = null;
    const pos = { lat, lng };
    for (const s of spots) {
      const d = haversineM(pos, { lat: s.lat, lng: s.lng });
      if (d < min) { min = d; nearest = s; }
    }
    return { dist: min, spot: nearest };
  }

  function desiredProfile(lat, lng, accuracy) {
    // Padrão: WiFi/rede. GPS só em burst explícito ou dentro da geofence.
    if (Date.now() < preciseUntil) return 'high';
    const { dist, spot } = nearestSpotDistance(lat, lng);
    const approachLimit = (spot ? spot.radius : 100) + APPROACH_BUFFER_M;
    // Dentro da zona do spot → GPS curto para geofence confiável
    if (spot && dist <= spot.radius + 25) return 'high';
    // Aproximando → mantém rede (mid), não sobe pra GNSS
    if (spot && dist <= approachLimit) return 'mid';
    // Accuracy ruim em WiFi: ainda mid (rede), não force GPS sozinho
    if (accuracy != null && accuracy > POOR_ACCURACY_M) return 'mid';
    return 'eco';
  }

  function setStatus(text, kind) {
    const el = document.getElementById('geo-status');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('live', 'error', 'pending', 'paused');
    if (kind) el.classList.add(kind);
  }

  function setAccuracyHint(accuracy, profile) {
    let hint = document.getElementById('geo-accuracy');
    if (!hint) {
      const header = document.querySelector('.map-header');
      if (!header) return;
      hint = document.createElement('span');
      hint.id = 'geo-accuracy';
      hint.className = 'geo-accuracy';
      header.appendChild(hint);
    }
    if (accuracy == null) { hint.hidden = true; return; }
    hint.hidden = false;
    const acc = Math.round(accuracy);
    const mode = (typeof GEO_MODE_LABEL !== 'undefined' && GEO_MODE_LABEL[profile])
      ? GEO_MODE_LABEL[profile]
      : (profile === 'high' ? 'GPS' : profile === 'mid' ? 'rede' : 'WiFi/rede');
    hint.textContent = `±${acc} m · ${mode}`;
    hint.title = profile === 'high'
      ? 'GNSS (GPS) ativo — maior precisão, mais bateria'
      : 'Posição por WiFi/rede celular via sistema — sem escanear SSIDs no app';
    hint.classList.toggle('good', acc <= 35);
    hint.classList.toggle('ok', acc > 35 && acc <= 80);
    hint.classList.toggle('poor', acc > 80);
  }

  function setFenceChip(names) {
    let chip = document.getElementById('geo-fence-chip');
    if (!chip) {
      const header = document.querySelector('.map-header');
      if (!header) return;
      chip = document.createElement('span');
      chip.id = 'geo-fence-chip';
      chip.className = 'geo-fence-chip';
      header.appendChild(chip);
    }
    if (!names.length) { chip.hidden = true; chip.textContent = ''; return; }
    chip.hidden = false;
    chip.textContent = names.length === 1 ? `em ${names[0]}` : `em ${names.length} zonas`;
    chip.title = names.join(' · ');
  }

  function setCompassChip(deg, state) {
    let chip = document.getElementById('geo-compass');
    if (!chip) {
      const header = document.querySelector('.map-header');
      if (!header) return;
      chip = document.createElement('button');
      chip.type = 'button';
      chip.id = 'geo-compass';
      chip.className = 'geo-compass';
      chip.title = 'Calibrar bússola';
      header.appendChild(chip);
      chip.addEventListener('click', () => openCompassCalibration());
    }
    if (state === 'off') {
      chip.innerHTML = `<span class="compass-needle">◎</span> bússola`;
      chip.classList.remove('live', 'calib');
      return;
    }
    if (state === 'calib') {
      chip.innerHTML = `<span class="compass-needle spin">↻</span> calibrando`;
      chip.classList.add('calib');
      chip.classList.remove('live');
      return;
    }
    const d = Math.round(((deg % 360) + 360) % 360);
    const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
    const dir = dirs[Math.round(d / 45) % 8];
    chip.innerHTML = `<span class="compass-needle" style="transform:rotate(${d}deg)">↑</span> ${d}° ${dir}`;
    chip.classList.add('live');
    chip.classList.remove('calib');
  }

  function smoothPosition(lat, lng, accuracy) {
    const acc = Math.max(accuracy || 50, 8);
    const weight = 1 / (acc * acc);
    samples.push({ lat, lng, accuracy: acc, weight, time: Date.now() });
    while (samples.length > SAMPLE_WINDOW) samples.shift();
    const cutoff = Date.now() - 60000;
    while (samples.length && samples[0].time < cutoff) samples.shift();
    let wSum = 0, latSum = 0, lngSum = 0, accBest = acc;
    for (const s of samples) {
      wSum += s.weight;
      latSum += s.lat * s.weight;
      lngSum += s.lng * s.weight;
      if (s.accuracy < accBest) accBest = s.accuracy;
    }
    if (wSum === 0) return { lat, lng, accuracy: acc };
    return { lat: latSum / wSum, lng: lngSum / wSum, accuracy: accBest };
  }

  function isPlausible(lat, lng, accuracy, time) {
    if (accuracy != null && accuracy > 500) return false;
    if (!lastRaw) return true;
    const dt = (time - lastRaw.time) / 1000;
    if (dt <= 0) return true;
    const dist = haversineM(lastRaw, { lat, lng });
    const maxDist = Math.max(OUTLIER_JUMP_M, 25 * dt + 40);
    if (dist > maxDist) {
      console.warn('GPS outlier rejeitado', { dist: Math.round(dist) });
      return false;
    }
    return true;
  }

  function notifyFence(type, spot) {
    const msg = type === 'enter'
      ? `Entrou na zona · ${spot.name}`
      : `Saiu da zona · ${spot.name}`;
    if (typeof showScrapToast === 'function') showScrapToast(msg);
    else console.log('[geofence]', msg);
    window.dispatchEvent(new CustomEvent('projano:geofence', {
      detail: { type, id: spot.id, name: spot.name, status: spot.status, radius: spot.radius }
    }));
  }

  function setFenceActive(id, active) {
    const layer = spotLayers[id];
    if (!layer) return;
    layer.marker.setIcon(active ? activeIcon : pinkIcon);
    layer.fence.setStyle({
      fillOpacity: active ? 0.18 : 0.06,
      opacity: active ? 0.7 : 0.35,
      weight: active ? 2 : 1
    });
    layer.marker.setZIndexOffset(active ? 500 : 0);
  }

  function checkGeofences(lat, lng, force) {
    const now = Date.now();
    if (!force && now - lastFenceCheck < FENCE_CHECK_MS) return;
    lastFenceCheck = now;
    const pos = { lat, lng };
    const entered = [];
    const exited = [];

    spots.forEach((spot) => {
      const dist = haversineM(pos, { lat: spot.lat, lng: spot.lng });
      const wasInside = insideFences.has(spot.id);
      const accPad = lastPos && lastPos.accuracy ? Math.min(lastPos.accuracy * 0.4, 30) : 0;
      const threshold = wasInside
        ? spot.radius + 20 + accPad
        : Math.max(spot.radius - accPad * 0.3, spot.radius * 0.7);
      const isInside = dist <= threshold;
      if (isInside && !wasInside) { entered.push(spot); setFenceActive(spot.id, true); }
      else if (!isInside && wasInside) { exited.push(spot); setFenceActive(spot.id, false); }
    });

    entered.forEach((s) => {
      insideFences.add(s.id);
      notifyFence('enter', s);
      preciseUntil = Date.now() + PRECISE_BURST_MS;
      maybeSwitchProfile(s.lat, s.lng, lastPos?.accuracy);
    });
    exited.forEach((s) => {
      insideFences.delete(s.id);
      notifyFence('exit', s);
    });

    const names = [...insideFences].map((id) => spotLayers[id]?.spot.name).filter(Boolean);
    setFenceChip(names);
  }

  function refreshUserMarkerIcon() {
    if (!userMarker) return;
    userMarker.setIcon(buildUserIcon(heading));
  }

  function applyPosition(lat, lng, accuracy, force) {
    const now = Date.now();
    const smoothed = smoothPosition(lat, lng, accuracy);
    const next = { lat: smoothed.lat, lng: smoothed.lng, accuracy: smoothed.accuracy, time: now };

    if (!force && lastPos) {
      const moved = haversineM(lastPos, next);
      const tooSoon = now - lastUiUpdate < MIN_UPDATE_MS;
      if (tooSoon && moved < MIN_MOVE_M) {
        lastPos = next;
        checkGeofences(next.lat, next.lng, false);
        setAccuracyHint(next.accuracy, currentProfile);
        return;
      }
    }

    lastPos = next;
    lastUiUpdate = now;
    try {
      if (window.fascGeoOffline) window.fascGeoOffline.save(next);
    } catch (_) {}

    try {
      if (Date.now() - (lastPosEventTs || 0) >= (typeof GPS_TICK_MIN_MS !== 'undefined' ? GPS_TICK_MIN_MS : 4000)) {
        lastPosEventTs = Date.now();
        window.dispatchEvent(new CustomEvent('projano:position', {
          detail: { lat: next.lat, lng: next.lng, accuracy: next.accuracy, time: next.time }
        }));
      }
    } catch (_) {}

    if (!userMarker) {
      userMarker = L.marker([next.lat, next.lng], {
        icon: buildUserIcon(heading),
        zIndexOffset: 1000
      }).addTo(map).bindPopup('<strong>Você está aqui</strong>');
    } else {
      userMarker.setLatLng([next.lat, next.lng]);
      refreshUserMarkerIcon();
    }

    const radius = Math.max(next.accuracy || 40, 15);
    if (!accuracyCircle) {
      accuracyCircle = L.circle([next.lat, next.lng], {
        radius,
        color: '#3B9EFF',
        weight: 1,
        fillColor: '#3B9EFF',
        fillOpacity: 0.1,
        opacity: 0.35
      }).addTo(map);
    } else {
      accuracyCircle.setLatLng([next.lat, next.lng]);
      accuracyCircle.setRadius(radius);
    }

    if (!followedOnce) {
      followedOnce = true;
      map.setView([next.lat, next.lng], Math.max(map.getZoom(), 16), { animate: true });
    }

    setStatus('ao vivo', 'live');
    setAccuracyHint(next.accuracy, currentProfile);
    checkGeofences(next.lat, next.lng, force);
    maybeSwitchProfile(next.lat, next.lng, next.accuracy);
  }

  function onPosition(pos, force) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const time = pos.timestamp || Date.now();
    if (!isPlausible(lat, lng, accuracy, time)) return;
    lastRaw = { lat, lng, accuracy, time };
    applyPosition(lat, lng, accuracy, force);
  }

  function onGeoError(err) {
    let msg = 'indisponível';
    if (err && err.code === 1) msg = 'permissão negada';
    else if (err && err.code === 2) msg = 'posição indisponível';
    else if (err && err.code === 3) msg = 'tempo esgotado';
    setStatus(msg, 'error');
  }

  function stopWatching(reason) {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    watching = false;
    if (reason === 'pause') {
      setStatus('pausado', 'paused');
      setAccuracyHint(null, currentProfile);
    }
  }

  function startWatch(profile) {
    if (!navigator.geolocation) { onGeoError({ code: 0 }); return; }
    if (!mapVisible || !pageVisible) { setStatus('pausado', 'paused'); return; }

    const nextProfile = profile || currentProfile || 'eco';
    const opts = GEO_PROFILES[nextProfile] || GEO_PROFILES.eco;

    if (watching && currentProfile === nextProfile && watchId != null) return;

    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    currentProfile = nextProfile;
    var modeLabel = (GEO_MODE_LABEL && GEO_MODE_LABEL[nextProfile]) || nextProfile;
    setStatus(nextProfile === 'high' ? 'buscando GPS…' : 'buscando WiFi/rede…', 'pending');

    navigator.geolocation.getCurrentPosition(
      (pos) => onPosition(pos, true),
      onGeoError,
      opts
    );

    watchId = navigator.geolocation.watchPosition(
      (pos) => onPosition(pos, false),
      onGeoError,
      opts
    );
    watching = true;
  }

  function maybeSwitchProfile(lat, lng, accuracy) {
    if (!watching || !mapVisible || !pageVisible) return;
    const want = desiredProfile(lat, lng, accuracy);
    if (want !== currentProfile) {
      if (want === 'high' || want === 'mid' || Date.now() > preciseUntil) {
        startWatch(want);
      }
    }
  }

  function startWatching(opts) {
    if (opts && opts.precise) {
      preciseUntil = Date.now() + PRECISE_BURST_MS;
      startWatch('high');
      return;
    }
    const seed = lastPos || { lat: -11.015, lng: -37.206, accuracy: 100 };
    startWatch(desiredProfile(seed.lat, seed.lng, seed.accuracy));
  }

  function syncWatchState() {
    // Performance: só liga GPS com mapa visível + aba ativa
    if (mapVisible && pageVisible) startWatching();
    else {
      stopWatching('pause');
      try { if (typeof stopCompass === 'function') stopCompass(); } catch (_) {}
    }
  }

  function centerOnUser() {
    if (lastPos && Date.now() - lastPos.time < 45000) {
      map.setView([lastPos.lat, lastPos.lng], Math.max(map.getZoom(), 16), { animate: true });
      if (userMarker) userMarker.openPopup();
      preciseUntil = Date.now() + PRECISE_BURST_MS;
      startWatch('high');
      return;
    }
    startWatching({ precise: true });
  }

  // ========== BÚSSOLA + FUSÃO GIROSCÓPIO ==========

  function normalizeDeg(d) {
    return ((d % 360) + 360) % 360;
  }

  function shortestDelta(from, to) {
    let d = to - from;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  function extractHeading(event) {
    if (typeof event.webkitCompassHeading === 'number' && !Number.isNaN(event.webkitCompassHeading)) {
      return event.webkitCompassHeading;
    }
    if (event.absolute === true && typeof event.alpha === 'number' && event.alpha != null) {
      return normalizeDeg(360 - event.alpha);
    }
    if (typeof event.alpha === 'number' && event.alpha != null) {
      return normalizeDeg(360 - event.alpha);
    }
    return null;
  }

  /**
   * Converte rotationRate do device (eixos locais) em taxa de yaw
   * aproximada no plano horizontal usando beta/gamma da orientação.
   * rotationRate: alpha=z (yaw local), beta=x (pitch), gamma=y (roll) em deg/s
   */
  function yawRateFromMotion(rotationRate, orientBeta, orientGamma) {
    if (!rotationRate) return 0;
    let ax = rotationRate.alpha; // z
    let bx = rotationRate.beta;  // x
    let gx = rotationRate.gamma; // y
    // alguns browsers usam null quando indisponível
    if (ax == null && bx == null && gx == null) return 0;
    ax = ax || 0;
    bx = bx || 0;
    gx = gx || 0;

    // Se a taxa total for absurda, descarta
    if (Math.abs(ax) > GYRO_SPIKE || Math.abs(bx) > GYRO_SPIKE || Math.abs(gx) > GYRO_SPIKE) {
      return 0;
    }

    // Aproximação: com o telefone quase vertical (uso de mapa),
    // o yaw no mundo ≈ -alpha (android) ou combinação leve.
    // Quando deitado (beta ~0), alpha já é yaw; quando em pé, mistura.
    const beta = (orientBeta || 0) * Math.PI / 180;
    const gamma = (orientGamma || 0) * Math.PI / 180;
    const cosB = Math.cos(beta);
    const sinB = Math.sin(beta);
    const cosG = Math.cos(gamma);
    const sinG = Math.sin(gamma);

    // Projeção simplificada da taxa angular no eixo vertical do mundo
    // (derivada de R_world * omega_body · up)
    const yawRate = ax * cosB * cosG - gx * sinB - bx * cosB * sinG;

    // Sinal: queremos horário a partir do norte (mesmo sentido do compass heading)
    return -yawRate;
  }

  let lastOrientBeta = 0;
  let lastOrientGamma = 0;

  function publishHeading() {
    if (heading == null) return;
    refreshUserMarkerIcon();
    setCompassChip(heading, 'live');
    window.dispatchEvent(new CustomEvent('projano:heading', {
      detail: {
        heading,
        raw: headingRaw,
        mode: fusionMode,
        gyroRate: gyroRateZ
      }
    }));
  }

  function fuseMagSample(magHeading) {
    const now = performance.now();
    headingRaw = magHeading;

    if (calibrating) {
      calibSamples.push(magHeading);
      lastMagTs = now;
      return;
    }

    if (heading == null) {
      heading = magHeading;
      lastMagTs = now;
      fusionMode = 'mag';
      publishHeading();
      return;
    }

    // Confiança no magnetômetro cai se o gyro indica rotação rápida
    // (mag atrasa e oscila; gyro conduz)
    const spinning = Math.abs(gyroRateZ) > 25;
    const magTrust = spinning ? MAG_TRUST_MOVING : MAG_TRUST_BASE;

    // Se o mag "pula" demais vs heading atual (> 35°) e gyro está calmo,
    // trata como interferência magnética e confia menos ainda
    const jump = Math.abs(shortestDelta(heading, magHeading));
    const trust = (!spinning && jump > 35) ? magTrust * 0.35 : magTrust;

    heading = normalizeDeg(heading + trust * shortestDelta(heading, magHeading));
    lastMagTs = now;
    fusionMode = Math.abs(gyroRateZ) > GYRO_DEADZONE ? 'fusion' : 'mag';
    publishHeading();
  }

  function fuseGyroSample(yawRateDeg, ts) {
    if (heading == null) {
      // sem referência absoluta ainda — só guarda taxa
      gyroRateZ = yawRateDeg;
      lastGyroTs = ts;
      return;
    }

    if (lastGyroTs > 0) {
      let dt = (ts - lastGyroTs) / 1000; // segundos
      if (dt > 0 && dt < 0.25) { // ignora gaps longos (aba em background)
        let rate = yawRateDeg;
        if (Math.abs(rate) < GYRO_DEADZONE) rate = 0;

        // Integração do gyro
        const gyroHeading = normalizeDeg(heading + rate * dt);

        // Se temos mag recente (< 400ms), complementar; senão gyro puro (curto prazo)
        const magFresh = lastMagTs > 0 && (ts - lastMagTs) < 400;
        if (magFresh && headingRaw != null) {
          const w = FUSION_GYRO_WEIGHT;
          heading = normalizeDeg(
            gyroHeading + (1 - w) * shortestDelta(gyroHeading, headingRaw) * 0 // mag já puxa em fuseMagSample
          );
          // na prática a integração gyro já atualizou; mag corrige no outro handler
          heading = gyroHeading;
          fusionMode = 'fusion';
        } else {
          heading = gyroHeading;
          fusionMode = 'gyro';
        }
        publishHeading();
      }
    }

    gyroRateZ = yawRateDeg;
    lastGyroTs = ts;
  }

  function onOrientation(event) {
    if (typeof event.beta === 'number') lastOrientBeta = event.beta;
    if (typeof event.gamma === 'number') lastOrientGamma = event.gamma;

    const raw = extractHeading(event);
    if (raw == null) return;
    fuseMagSample(raw);
  }

  function onMotion(event) {
    const rr = event.rotationRate;
    if (!rr) return;
    const ts = performance.now();
    const yawRate = yawRateFromMotion(rr, lastOrientBeta, lastOrientGamma);
    fuseGyroSample(yawRate, ts);
  }

  function stopCompass() {
    if (orientHandler) {
      window.removeEventListener('deviceorientationabsolute', orientHandler);
      window.removeEventListener('deviceorientation', orientHandler);
      orientHandler = null;
    }
    if (motionHandler) {
      window.removeEventListener('devicemotion', motionHandler);
      motionHandler = null;
    }
    compassActive = false;
    lastGyroTs = 0;
    setCompassChip(null, 'off');
  }

  function attachOrientationListeners() {
    orientHandler = onOrientation;
    motionHandler = onMotion;
    window.addEventListener('deviceorientationabsolute', orientHandler, true);
    window.addEventListener('deviceorientation', orientHandler, true);
    window.addEventListener('devicemotion', motionHandler, true);
    compassActive = true;
  }

  async function requestCompassPermission() {
    if (typeof window.DeviceOrientationEvent === 'undefined') {
      compassPerm = 'unsupported';
      return false;
    }

    // iOS 13+: orientation
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        compassPerm = res === 'granted' ? 'granted' : 'denied';
        if (compassPerm !== 'granted') return false;
      } catch (e) {
        compassPerm = 'denied';
        return false;
      }
    } else {
      compassPerm = 'granted';
    }

    // iOS: motion (giroscópio)
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEvent.requestPermission();
        motionPerm = res === 'granted' ? 'granted' : 'denied';
        // mag sozinho ainda funciona se motion for negado
      } catch (e) {
        motionPerm = 'denied';
      }
    } else {
      motionPerm = typeof DeviceMotionEvent !== 'undefined' ? 'granted' : 'unsupported';
    }

    return compassPerm === 'granted';
  }

  function varianceDeg(arr) {
    if (arr.length < 2) return 0;
    let sx = 0, sy = 0;
    for (const a of arr) {
      const r = (a * Math.PI) / 180;
      sx += Math.cos(r);
      sy += Math.sin(r);
    }
    const n = arr.length;
    const meanR = Math.atan2(sy / n, sx / n);
    let v = 0;
    for (const a of arr) {
      const r = (a * Math.PI) / 180;
      let d = r - meanR;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      v += d * d;
    }
    return (v / n) * (180 / Math.PI) ** 2;
  }

  function closeCalibUI(ok) {
    const overlay = document.getElementById('compass-calib');
    if (overlay) overlay.remove();
    calibrating = false;
    if (calibTimer) { clearTimeout(calibTimer); calibTimer = null; }

    if (ok) {
      // zera bias do filtro: ancora no mag fresco
      if (headingRaw != null) heading = headingRaw;
      lastGyroTs = 0;
      gyroRateZ = 0;
      if (typeof showScrapToast === 'function') {
        showScrapToast(motionPerm === 'granted'
          ? 'Bússola + giroscópio calibrados'
          : 'Bússola calibrada');
      }
      refreshUserMarkerIcon();
      setCompassChip(heading, heading != null ? 'live' : 'off');
    } else {
      setCompassChip(heading, heading != null ? 'live' : 'off');
    }
  }

  function finishCalibration() {
    const v = varianceDeg(calibSamples);
    const enough = calibSamples.length >= CALIB_MIN_SAMPLES && v >= CALIB_MIN_VARIANCE;

    if (enough && headingRaw != null) {
      heading = headingRaw;
      refreshUserMarkerIcon();
      closeCalibUI(true);
    } else {
      const progress = document.querySelector('#compass-calib .calib-hint');
      if (progress) {
        progress.textContent = enough
          ? 'Quase! Continue o movimento em 8…'
          : 'Mova o celular em forma de 8 no ar';
      }
      calibSamples = [];
      calibTimer = setTimeout(finishCalibration, CALIB_DURATION_MS);
    }
  }

  function openCompassCalibration() {
    (async () => {
      const ok = await requestCompassPermission();
      if (!ok) {
        if (typeof showScrapToast === 'function') {
          showScrapToast(
            compassPerm === 'unsupported'
              ? 'Bússola não suportada neste dispositivo'
              : 'Permissão de orientação negada'
          );
        }
        setCompassChip(null, 'off');
        return;
      }

      if (!compassActive) attachOrientationListeners();

      let overlay = document.getElementById('compass-calib');
      if (overlay) overlay.remove();

      const gyroLabel = motionPerm === 'granted'
        ? 'Fusão com giroscópio ativa'
        : 'Só magnetômetro (giroscópio indisponível)';

      overlay = document.createElement('div');
      overlay.id = 'compass-calib';
      overlay.className = 'compass-calib';
      overlay.innerHTML = `
        <div class="compass-calib-card">
          <div class="calib-visual" aria-hidden="true">
            <div class="calib-phone"></div>
            <svg class="calib-path" viewBox="0 0 120 80" fill="none">
              <path d="M20 40 C20 15, 50 15, 60 40 C70 65, 100 65, 100 40 C100 15, 70 15, 60 40 C50 65, 20 65, 20 40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Calibrar bússola</h3>
          <p class="calib-hint">Mova o celular no ar em forma de <b>8</b>, longe de metal e carregadores</p>
          <p class="calib-sub">${gyroLabel}</p>
          <div class="calib-bar"><div class="calib-bar-fill"></div></div>
          <div class="calib-actions">
            <button type="button" class="calib-cancel">agora não</button>
            <button type="button" class="calib-done">concluir</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      calibrating = true;
      calibSamples = [];
      setCompassChip(null, 'calib');

      const fill = overlay.querySelector('.calib-bar-fill');
      const started = Date.now();
      const tick = () => {
        if (!calibrating) return;
        const t = Math.min(1, (Date.now() - started) / CALIB_DURATION_MS);
        if (fill) fill.style.width = `${t * 100}%`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      overlay.querySelector('.calib-cancel').addEventListener('click', () => closeCalibUI(false));
      overlay.querySelector('.calib-done').addEventListener('click', () => {
        if (headingRaw != null) {
          heading = headingRaw;
          refreshUserMarkerIcon();
        }
        closeCalibUI(true);
      });

      if (calibTimer) clearTimeout(calibTimer);
      calibTimer = setTimeout(finishCalibration, CALIB_DURATION_MS);
    })();
  }

  // Controle Leaflet da bússola
  const CompassControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-bar projano-compass-btn');
      btn.type = 'button';
      btn.title = 'Calibrar bússola';
      btn.setAttribute('aria-label', 'Calibrar bússola digital');
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="12 6 14.5 12 12 18 9.5 12" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`;
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stop(e);
        openCompassCalibration();
      });
      return btn;
    }
  });
  map.addControl(new CompassControl());

  // Locate control
  const LocateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-bar projano-locate-btn');
      btn.type = 'button';
      btn.title = 'Minha localização (alta precisão)';
      btn.setAttribute('aria-label', 'Centralizar na minha localização');
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`;
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stop(e);
        centerOnUser();
      });
      return btn;
    }
  });
  map.addControl(new LocateControl());

  
  // Offline / online — atualiza rótulos sem religar GPS
  window.addEventListener('cricri:connectivity', function () {
    try { updateProxRefLabel(); } catch (_) {}
    try {
      if (navigator.onLine === false) {
        var r = refPoint();
        if (r.source === 'offline' || r.source === 'cache') setStatus('offline · cache', 'paused');
        else setStatus('offline', 'paused');
      } else if (watching) {
        setStatus('ao vivo', 'live');
      }
    } catch (_) {}
  });
  window.addEventListener('offline', function () {
    try {
      var r = refPoint();
      if (r.source === 'offline' || r.source === 'cache' || (lastPos && lastPos.lat != null)) {
        setStatus('offline · última pos', 'paused');
        // mantém marker na última posição
        if (lastPos && userMarker) {
          userMarker.setLatLng([lastPos.lat, lastPos.lng]);
          userMarker.bindPopup('<strong>Última posição</strong><br><span style="opacity:.8">salva no aparelho (offline)</span>');
        }
      }
    } catch (_) {}
  });
  window.addEventListener('online', function () {
    try {
      if (mapVisible && pageVisible) startWatching();
    } catch (_) {}
  });

  // Se já tem cache e mapa abre offline, mostra marker
  if (lastPos && lastPos.lat != null && !userMarker) {
    try {
      userMarker = L.marker([lastPos.lat, lastPos.lng], {
        icon: buildUserIcon(null),
        zIndexOffset: 1000
      }).addTo(map).bindPopup('<strong>Última posição</strong><br><span style="opacity:.8">cache do aparelho</span>');
    } catch (_) {}
  }

  
  // ---- filtro por nota (CricriRatings) ----
  var ratingMinFilter = 0;
  async function applyRatingFilter() {
    if (!window.CricriRatings || !window.CricriRatings.summary) return;
    ratingMinFilter = window.CricriRatings.getMinFilter ? window.CricriRatings.getMinFilter() : 0;
    // spots
    Object.keys(spotLayers).forEach(async function (id) {
      var Lyr = spotLayers[id];
      if (!Lyr || !Lyr.marker) return;
      if (!ratingMinFilter) {
        if (layerOn.spots && layerGroups.spots && !layerGroups.spots.hasLayer(Lyr.marker)) {
          layerGroups.spots.addLayer(Lyr.marker);
        }
        return;
      }
      var ok = await window.CricriRatings.passesFilter('spot', Lyr.spot.id || Lyr.spot.name);
      if (ok) {
        if (layerOn.spots && !layerGroups.spots.hasLayer(Lyr.marker)) layerGroups.spots.addLayer(Lyr.marker);
      } else {
        if (layerGroups.spots.hasLayer(Lyr.marker)) layerGroups.spots.removeLayer(Lyr.marker);
      }
    });
    poiMarkers.forEach(async function (item) {
      var p = item.data;
      if (!ratingMinFilter) return;
      var ok = await window.CricriRatings.passesFilter('poi', p.id || p.name);
      if (!ok && layerGroups[p.layer] && layerGroups[p.layer].hasLayer(item.marker)) {
        layerGroups[p.layer].removeLayer(item.marker);
      }
    });
    if (typeof eventMarkers !== 'undefined') {
      eventMarkers.forEach(async function (item) {
        if (!ratingMinFilter) return;
        var p = item.data;
        var ok = await window.CricriRatings.passesFilter('event', p.id || p.title);
        if (!ok && layerGroups.eventos && layerGroups.eventos.hasLayer(item.marker)) {
          layerGroups.eventos.removeLayer(item.marker);
        }
      });
    }
  }
  window.addEventListener('cricri:rating-filter', function () {
    applyRatingFilter();
    if (typeof applyProximityFilter === 'function') applyProximityFilter();
  });

  window.projanoMap = {
    map: map,
    flyTo: function (lat, lng, z) { map.setView([lat, lng], z || 16); },
    map,
    getPosition: () => lastPos,
    getResolvedPosition: () => (window.fascGeoOffline ? window.fascGeoOffline.resolve(lastPos) : lastPos),
    getHeading: () => heading,
    getFusionMode: () => fusionMode,
    getProfile: () => currentProfile,
    getLocationMode: () => (GEO_MODE_LABEL && GEO_MODE_LABEL[currentProfile]) || currentProfile,
    preferNetwork: () => { preciseUntil = 0; startWatch('eco'); },
    centerOnUser,
    startWatching: () => startWatching(),
    stopWatching: () => stopWatching('pause'),
    calibrateCompass: openCompassCalibration,
    getActiveFences: () =>
      [...insideFences].map((id) => {
        const s = spotLayers[id]?.spot;
        return s ? { id: s.id, name: s.name, status: s.status, radius: s.radius } : null;
      }).filter(Boolean),
    getSpots: () => spots.map((s) => ({ ...s }))
  };

  // Realtime: atualiza status do popup quando o banco muda
  if (window.fascSpots && window.fascSpots.subscribeSpots) {
    window.fascSpots.subscribeSpots((payload) => {
      const row = payload.new;
      if (!row) return;
      const id = row.slug || row.id;
      const layer = spotLayers[id];
      if (!layer) return;
      layer.spot.status = row.status || layer.spot.status;
      layer.marker.setPopupContent(
        `<strong>${layer.spot.name}</strong><br>` +
        `<span style="opacity:0.8">${layer.spot.status}</span><br>` +
        `<span style="opacity:0.55;font-size:0.75em">zona · ${layer.spot.radius} m</span>`
      );
    });
  }

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        mapVisible = e.isIntersecting;
        if (e.isIntersecting) map.invalidateSize();
        syncWatchState();
      });
    }, { threshold: 0.15 });
    obs.observe(mapEl);
  } else {
    mapVisible = true;
  }

  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    syncWatchState();
    // pausa sensores em background; retoma se já tinha permissão
    if (document.hidden) {
      stopCompass();
    } else if (compassPerm === 'granted') {
      attachOrientationListeners();
      lastGyroTs = 0;
      setCompassChip(heading, heading != null ? 'live' : 'off');
    }
  });

  setStatus('pausado', 'paused');
  setCompassChip(null, 'off');
  setTimeout(() => map.invalidateSize(), 200);
})();


// ============================================================
// MARKETPLACE — dados mock + renderização dos cards
// ============================================================
(function initMarketplace() {
  const grid = document.getElementById('market-grid');
  if (!grid) return;

  const icons = {
    hospedagem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21h3.5a1 1 0 0 0 1-1V9.5"/></svg>',
    arte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="13.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="13" r="1.1" fill="currentColor" stroke="none"/><path d="M12 20.5A8.5 8.5 0 0 1 9 4.1c1 0 1.8.8 1.8 1.8 0 .5-.2 1-.5 1.3-.3.3-.5.7-.5 1.2 0 .9.7 1.6 1.6 1.6h2.4c1.9 0 3.5 1.6 3.5 3.5 0 3.9-2.7 7-5.3 7z"/></svg>',
    gastronomia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6.5a2.5 2.5 0 0 0 5 0V3"/><path d="M8.5 3v18"/><path d="M17 3c-1.4 0-2.5 1.8-2.5 5.5S15.6 13 17 13v8"/></svg>',
    musica: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5.5l11-2.2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
    mobilidade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16.5V12l2-5h12l2 5v4.5"/><path d="M4 16.5h16"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/></svg>',
    servicos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="13" rx="2"/><path d="M9 6V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V6"/><circle cx="12" cy="12.5" r="3"/></svg>'
  };

  const pinIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.2-6-9.8A6 6 0 0 1 18 11.2C18 15.8 12 21 12 21z"/><circle cx="12" cy="11" r="1.8"/></svg>';

  const labels = {
    hospedagem: 'Hospedagem',
    arte: 'Arte',
    gastronomia: 'Gastronomia',
    musica: 'Música',
    mobilidade: 'Mobilidade',
    servicos: 'Serviços'
  };

  const thumbColors = {
    hospedagem: 'var(--terra)',
    arte: 'var(--pink)',
    gastronomia: 'var(--laranja)',
    musica: 'var(--azul)',
    mobilidade: 'var(--verde)',
    servicos: 'var(--stone)'
  };

  const listings = [
    {
      category: 'hospedagem',
      title: "Pousada Momentos",
      lat: -10.9928, lng: -37.1685,
      desc: 'Rodovia João Bebe Água · Rosa Elze. Quartos aconchegantes perto do centro histórico — reserva direta com a casa.',
      price: 'consultar', unit: '',
      location: 'Rosa Elze · São Cristóvão',
      user: 'pousada.momentos'
    },
    {
      category: 'hospedagem',
      title: 'Pousada Só Love',
      lat: -10.9955, lng: -37.1720,
      desc: 'Rodovia João Bebe Água, 3515. Estadia tranquila a poucos minutos da praça São Francisco e do convento.',
      price: 'consultar', unit: '',
      location: 'São Cristóvão · SE',
      user: 'pousada.solove'
    },
    {
      category: 'hospedagem',
      title: "Grand' Hostel São Cristóvão",
      lat: -11.0102, lng: -37.1988,
      desc: 'Opção econômica no município — beliches e quartos privados, boa base pra quem vem pro festival.',
      price: 'a partir de R$ 179', unit: '/noite',
      location: 'São Cristóvão',
      user: 'grand.hostel'
    },
    {
      category: 'hospedagem',
      title: 'Casa no Haras',
      lat: -11.0285, lng: -37.2150,
      desc: 'Casa inteira rural com piscina, área de lazer e contato com animais. Ideal pra grupo no fim de semana do evento.',
      price: 'consultar', unit: '',
      location: 'Zona rural · São Cristóvão',
      user: 'casa.haras'
    },
    {
      category: 'arte',
      title: 'Tela pintura acrílica — Cortejo',
      desc: 'Obra original inspirada no cortejo de abertura, 40x60cm, moldura inclusa.',
      price: 'R$ 250', unit: '',
      location: 'Ateliê da praça',
      user: 'edu_grafite'
    },
    {
      category: 'arte',
      title: 'Artesanato em barro',
      desc: 'Peças utilitárias e decorativas feitas à mão, encomenda personalizada aceita.',
      price: 'R$ 35', unit: 'a partir de',
      location: 'Feira de artesanato',
      user: 'dona.creuza'
    },
    {
      category: 'gastronomia',
      title: 'Restaurante Pôr do Sol',
      lat: -11.0168, lng: -37.2025,
      desc: 'Frutos do mar e caldinho às margens do rio — Ladeira Porto da Banca. Clássico do pôr do sol sergipano.',
      price: '$$–$$$', unit: '',
      location: 'Ladeira Porto da Banca',
      user: 'por.do.sol'
    },
    {
      category: 'gastronomia',
      title: 'Casa da Queijada',
      lat: -11.0146, lng: -37.2058,
      desc: 'Queijada tradicional de São Cristóvão — doce patrimônio do município, receita de gerações.',
      price: '$', unit: '',
      location: 'Centro histórico',
      user: 'casa.queijada'
    },
    {
      category: 'gastronomia',
      title: 'Filhas do Mangue',
      lat: -11.0155, lng: -37.2048,
      desc: 'Comida marisqueira perto da Praça São Francisco — caranguejo, sururu e pratos da região.',
      price: '$$', unit: '',
      location: 'Centro · São Cristóvão',
      user: 'filhas.mangue'
    },
    {
      category: 'gastronomia',
      title: 'Ivora Pizzaria e Restaurante',
      lat: -11.0125, lng: -37.2095,
      desc: 'Pizza, massas e pratos brasileiros no município — opção versátil pra antes ou depois da roda.',
      price: '$$', unit: '',
      location: 'São Cristóvão · SE',
      user: 'ivora'
    },
    {
      category: 'musica',
      title: 'Roda de samba pra evento privado',
      desc: 'Grupo com 5 integrantes, repertório de samba e MPB, disponível pra afters.',
      price: 'R$ 500', unit: '/apresentação',
      location: 'A combinar',
      user: 'roda.dos7'
    },
    {
      category: 'musica',
      title: 'DJ set eletrônico/afrobeat',
      desc: 'Equipamento próprio, sets de 2h, ideal pra after menor.',
      price: 'R$ 300', unit: '/set',
      location: 'A combinar',
      user: 'dj.marane'
    },
    {
      category: 'mobilidade',
      title: 'Carona Aracaju → São Cristóvão',
      desc: 'Saindo do centro de Aracaju dia 19 de manhã, 3 vagas, volta no domingo.',
      price: 'R$ 20', unit: '/pessoa',
      location: 'Saída de Aracaju',
      user: 'carlos.carona'
    },
    {
      category: 'servicos',
      title: 'Fotógrafo pro festival',
      desc: 'Cobertura de eventos, afters e ensaios avulsos. Entrega em 48h.',
      price: 'R$ 150', unit: '/hora',
      location: 'Circula pela cidade toda',
      user: 'lente.sc'
    },
    {
      category: 'servicos',
      title: 'Videomaker — reels e timelapse',
      desc: 'Registro em vídeo do seu after ou evento, edição inclusa.',
      price: 'R$ 200', unit: '/pacote',
      location: 'Circula pela cidade toda',
      user: 'vhs.sc'
    }
  ];

  const frag = document.createDocumentFragment();

  listings.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'market-card';
    card.dataset.category = item.category;

    card.innerHTML = `
      <div class="market-thumb" style="background:${thumbColors[item.category]}">
        ${icons[item.category]}
      </div>
      <div class="market-body">
        <div class="market-head">
          <span class="market-title">${item.title}</span>
          <span class="market-price">${item.price}<small>${item.unit}</small></span>
        </div>
        <p class="market-desc">${item.desc}</p>
        <div class="market-meta">
          <span class="market-cat-badge ${item.category}">${labels[item.category]}</span>
          <span class="market-location">${pinIcon}${item.location}</span>
        </div>
        <div class="post-actions">
          <button class="scrap-btn" type="button" data-user="${item.user}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4 3 11.5l7.5 2.7L13.5 21 21 4z"/><path d="M10.5 14.2 21 4"/></svg>
            enviar scrap
          </button>
          ${item.lat != null ? `<button class="scrap-btn map-goto-btn" type="button" data-map-goto data-lat="${item.lat}" data-lng="${item.lng}">ver no mapa</button>` : ''}
        </div>
      </div>
    `;

    frag.appendChild(card);
  });

  grid.appendChild(frag);

  const empty = document.createElement('div');
  empty.className = 'market-empty';
  empty.id = 'market-empty';
  empty.hidden = true;
  empty.textContent = 'Nenhum anúncio nessa categoria por enquanto.';
  grid.appendChild(empty);
})();


// CRICRI · ir do card do marketplace ao pin no mapa
document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-map-goto]');
  if (!btn) return;
  e.preventDefault();
  var lat = parseFloat(btn.getAttribute('data-lat'));
  var lng = parseFloat(btn.getAttribute('data-lng'));
  if (!isFinite(lat) || !isFinite(lng)) return;
  var sec = document.getElementById('mapa');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(function () {
    if (window.projanoMap && typeof window.projanoMap.flyTo === 'function') {
      window.projanoMap.flyTo(lat, lng, 16);
      return;
    }
    // fallback: leaflet map on #map
    var el = document.getElementById('map');
    if (el && window.L) {
      // maps are stored weakly; use projanoMapLayers fit
      if (window.projanoMapLayers && window.projanoMapLayers.groups) {
        try {
          var mapRef = null;
          Object.keys(window.projanoMapLayers.groups).some(function (k) {
            var g = window.projanoMapLayers.groups[k];
            if (g && g._map) { mapRef = g._map; return true; }
            return false;
          });
          if (mapRef) {
            mapRef.setView([lat, lng], 16);
            // open nearest poi popup
            if (window.projanoMapLayers.pois) {
              window.projanoMapLayers.pois.forEach(function () {});
            }
          }
        } catch (err) {}
      }
    }
  }, 400);
});
