/**
 * CRICRI · eventos no mapa
 * Fonte 1: public.afters (+ spots) no Supabase
 * Fonte 2: fallback local (São Cristóvão · coords dos spots)
 */
(function () {
  // Coordenadas alinhadas aos spots do festival
  var VENUES = {
    'convento-sao-francisco': { name: 'Convento São Francisco', lat: -11.0149, lng: -37.2047 },
    'praca-sao-francisco': { name: 'Praça São Francisco', lat: -11.0152, lng: -37.2052 },
    'igreja-matriz': { name: 'Igreja Matriz', lat: -11.0138, lng: -37.2068 },
    'largo-amparo': { name: 'Largo do Amparo', lat: -11.0165, lng: -37.2075 },
    'casa-do-sabao': { name: 'Rua da Feira', lat: -11.014, lng: -37.208 },
    'largo-matriz': { name: 'Largo da Matriz', lat: -11.0138, lng: -37.2068 },
    'centro-sc': { name: 'Centro Histórico', lat: -11.015, lng: -37.206 }
  };

  // Mesma checagem de plausibilidade geográfica do spots-api.js — evita
  // eventos mostrando distância absurda quando o spot ligado a eles tem
  // lat/lng ruim no Supabase.
  var REGION_BOUNDS = { latMin: -11.6, latMax: -10.6, lngMin: -37.6, lngMax: -36.8 };
  function isPlausibleCoord(lat, lng) {
    return (
      lat != null && lng != null && !isNaN(lat) && !isNaN(lng) &&
      lat >= REGION_BOUNDS.latMin && lat <= REGION_BOUNDS.latMax &&
      lng >= REGION_BOUNDS.lngMin && lng <= REGION_BOUNDS.lngMax
    );
  }

  var FALLBACK = [
    {
      id: 'ev-abertura',
      title: 'Abertura · CRICRI 079',
      category: 'música',
      starts_at: '2026-11-19T18:00:00-03:00',
      place: 'Praça São Francisco',
      lat: -11.0152,
      lng: -37.2052,
      status: 'programado'
    },
    {
      id: 'ev-cortejo',
      title: 'Cortejo pelo centro',
      category: 'cultura popular',
      starts_at: '2026-11-20T17:00:00-03:00',
      place: 'Largo da Matriz',
      lat: -11.0138,
      lng: -37.2068,
      status: 'programado'
    },
    {
      id: 'ev-projecao',
      title: 'Projeção no Largo',
      category: 'arte',
      starts_at: '2026-11-21T20:00:00-03:00',
      place: 'Largo do Amparo',
      lat: -11.0165,
      lng: -37.2075,
      status: 'programado'
    },
    {
      id: 'ev-fechamento',
      title: 'Noite de fechamento',
      category: 'música',
      starts_at: '2026-11-22T21:00:00-03:00',
      place: 'Convento São Francisco',
      lat: -11.0149,
      lng: -37.2047,
      status: 'programado'
    }
  ];

  function formatWhen(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return String(iso);
    }
  }

  function normalizeAfter(row) {
    var spot = row.spots || row.spot || null;
    var lat = spot && spot.lat != null ? Number(spot.lat) : null;
    var lng = spot && spot.lng != null ? Number(spot.lng) : null;
    var place = (spot && spot.name) || row.place_name || row.place || '';
    if (!isPlausibleCoord(lat, lng)) {
      if (lat != null || lng != null) {
        console.warn('[CRICRI events] evento "' + (row.title || row.id) + '" com spot fora da região (lat=' + lat + ' lng=' + lng + ') — usando centro como referência');
      }
      lat = null;
      lng = null;
    }
    // se after sem join, tenta venue pelo título/categoria
    if ((lat == null || lng == null) && row.venue_slug && VENUES[row.venue_slug]) {
      lat = VENUES[row.venue_slug].lat;
      lng = VENUES[row.venue_slug].lng;
      place = place || VENUES[row.venue_slug].name;
    }
    if (lat == null || lng == null) {
      lat = VENUES['centro-sc'].lat;
      lng = VENUES['centro-sc'].lng;
      place = place || VENUES['centro-sc'].name;
    }
    return {
      id: row.id || row.slug || ('after-' + Math.random().toString(36).slice(2, 8)),
      title: row.title || row.name || 'Evento',
      category: row.category || 'evento',
      starts_at: row.starts_at || row.startsAt || null,
      when_label: formatWhen(row.starts_at || row.startsAt),
      place: place,
      lat: lat,
      lng: lng,
      status: row.status || 'programado',
      source: row._source || 'supabase'
    };
  }

  async function fetchEvents() {
    var db = window.fascDb;
    if (!db) {
      console.warn('[CRICRI events] sem client — fallback local');
      return FALLBACK.map(function (e) {
        return Object.assign({}, e, { when_label: formatWhen(e.starts_at), source: 'fallback' });
      });
    }
    try {
      var res = await db
        .from('afters')
        .select('id, title, category, starts_at, spot_id, spots:spot_id(name, lat, lng, slug)')
        .order('starts_at', { ascending: true })
        .limit(80);
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) {
        console.warn('[CRICRI events] afters vazio — fallback local');
        return FALLBACK.map(function (e) {
          return Object.assign({}, e, { when_label: formatWhen(e.starts_at), source: 'fallback' });
        });
      }
      console.info('[CRICRI events] afters do Supabase:', rows.length);
      return rows.map(function (r) {
        r._source = 'supabase';
        return normalizeAfter(r);
      });
    } catch (err) {
      console.warn('[CRICRI events] falha API:', err.message || err);
      return FALLBACK.map(function (e) {
        return Object.assign({}, e, { when_label: formatWhen(e.starts_at), source: 'fallback' });
      });
    }
  }

  window.fascEvents = {
    fetchEvents: fetchEvents,
    FALLBACK: FALLBACK,
    VENUES: VENUES,
    formatWhen: formatWhen
  };
})();
