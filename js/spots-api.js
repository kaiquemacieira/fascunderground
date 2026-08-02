// FASC+ — spots: Supabase com fallback pro mock local
(function () {
  const FALLBACK = [
    { id: 'convento-sao-francisco', name: 'Convento São Francisco', lat: -11.0149, lng: -37.2047, status: 'rolando agora', radius: 100 },
    { id: 'praca-sao-francisco', name: 'Praça São Francisco', lat: -11.0152, lng: -37.2052, status: '62% pronto', radius: 120 },
    { id: 'igreja-matriz', name: 'Igreja Matriz', lat: -11.0138, lng: -37.2068, status: 'vai rolar às 23h', radius: 90 },
    { id: 'largo-amparo', name: 'Largo do Amparo', lat: -11.0165, lng: -37.2075, status: 'terminou', radius: 85 },
    { id: 'casa-do-sabao', name: 'Rua da Feira', lat: -11.014, lng: -37.208, status: 'rolando agora', radius: 95 }
  ];

  function normalize(row) {
    return {
      id: row.slug || row.id,
      name: row.name,
      lat: Number(row.lat),
      lng: Number(row.lng),
      radius: Number(row.radius_m != null ? row.radius_m : row.radius) || 90,
      status: row.status || 'sem info'
    };
  }

  async function fetchSpots() {
    const db = window.fascDb;
    if (!db) {
      console.warn('[FASC spots] sem client — usando fallback');
      return FALLBACK.map((s) => ({ ...s }));
    }
    try {
      const { data, error } = await db.from('spots').select('id,slug,name,lat,lng,radius_m,status').order('name');
      if (error) throw error;
      if (!data || !data.length) {
        console.warn('[FASC spots] tabela vazia — fallback');
        return FALLBACK.map((s) => ({ ...s }));
      }
      console.info('[FASC spots] carregados do Supabase:', data.length);
      return data.map(normalize);
    } catch (err) {
      console.warn('[FASC spots] falha API, fallback local:', err.message || err);
      return FALLBACK.map((s) => ({ ...s }));
    }
  }

  function subscribeSpots(onChange) {
    const db = window.fascDb;
    if (!db || typeof onChange !== 'function') return { unsubscribe() {} };
    const channel = db
      .channel('spots-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spots' },
        (payload) => {
          console.info('[FASC spots] realtime', payload.eventType, payload.new || payload.old);
          onChange(payload);
        }
      )
      .subscribe();
    return {
      unsubscribe() {
        try { db.removeChannel(channel); } catch (_) {}
      }
    };
  }

  window.fascSpots = { fetchSpots, subscribeSpots, FALLBACK };
})();
