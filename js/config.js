// FASC+ — config pública (anon/publishable key é segura no front)
// NUNCA coloque service_role aqui.
window.FASC_CONFIG = {
  supabaseUrl: 'https://bcnbwshwehofncfkdnra.supabase.co',
  supabaseAnonKey: 'sb_publishable_k0iCZgl6qweP16tW3uiGYA_HTJYO1iK',
  env: 'dev',
  // Chave pública VAPID (npx web-push generate-vapid-keys). Privada só no backend.
  vapidPublicKey: 'BM7GeS-AZY3O3WZKIz_OZ8RTHUacS1PeeeVzVyNsfuhU6KZ60nv6kHb9kR-RlgBduopq87blNlPnf0XErxoWYDg',

  // Fim do festival (mesmo padrão de js/tamagotchi.js EVENT_END)
  // Após esta data: caixinha Meow não lista recados; envio bloqueado no front.
  eventEndIso: '2026-11-23T12:00:00-03:00',

  // ---- GTFS-RT / previsão ao vivo ----
  // SMTT-CTM (Aracaju/SC) não publica feed aberto. Deixe vazio = modelo local.
  // Quando tiver proxy/API própria:
  transitRtUrl: '',              // JSON { delays: { "031": 3 } }
  gtfsRtTripUpdatesUrl: '',      // GTFS-RT Trip Updates (JSON preferível)
  gtfsRtVehicleUrl: '',          // GTFS-RT Vehicle Positions (JSON)

  // ---- Filtro de linguagem hostil (MEOW) ----
  // Bloqueia envio se o texto contiver o termo. Não suaviza nem envia.
  // Não substitui o canal de denúncia.
  hostileTerms: [
    'idiota', 'estupido', 'estúpido', 'imbecil', 'otario', 'otário',
    'merda', 'porra', 'caralho', 'puta', 'puto', 'viado', 'bicha',
    'macaco', 'vagabunda', 'vagabundo', 'arrombado', 'fdp', 'vsfd',
    'filho da puta', 'vai se foder', 'vai se fuder', 'seu lixo',
    'kill yourself', 'kys', 'nazista', 'hitler'
  ]
};

/** Epoch ms do fim do CRICRI — alinhado a tamagotchi.js */
window.FASC_EVENT_END_MS = (function () {
  try {
    var iso = (window.FASC_CONFIG && window.FASC_CONFIG.eventEndIso) || '2026-11-23T12:00:00-03:00';
    return new Date(iso).getTime();
  } catch (_) {
    return new Date('2026-11-23T12:00:00-03:00').getTime();
  }
})();

/** true se o festival já acabou (Meow / caixinha expirados) */
window.fascEventEnded = function () {
  return Date.now() >= (window.FASC_EVENT_END_MS || 0);
};

