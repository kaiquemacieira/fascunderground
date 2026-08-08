// FASC+ — config pública (anon/publishable key é segura no front)
// NUNCA coloque service_role aqui.
window.FASC_CONFIG = {
  supabaseUrl: 'https://bcnbwshwehofncfkdnra.supabase.co',
  supabaseAnonKey: 'sb_publishable_k0iCZgl6qweP16tW3uiGYA_HTJYO1iK',
  env: 'dev',
  // reCAPTCHA v3 — site key pública (Google Admin Console). Secret só no Supabase.
  // Deixe vazio em dev local; em prod preencha e rode: supabase secrets set RECAPTCHA_SECRET_KEY=...
  recaptchaSiteKey: '6LcNv3stAAAAAN1ExyuSMG8WXeOz1caxHc5BPE7K',
  // adminEmail NÃO fica no front — use secret ROLE_REQUEST_TO_EMAIL na Edge Function
  // Chave pública VAPID (npx web-push generate-vapid-keys). Privada só no backend.
  vapidPublicKey: 'BBvmr6tIC0YWjrN4C6jmEmcIhGB8ho5DfQI_tZ4wa1-sAayKfF8xUqlw-cZKIN19pS9PzyECL6rcNf521pRESBg',

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

/** Epoch ms do fim do CRICRI — alinhado a tamagotchi.js (fallback UTC fixo p/ mobile) */
window.FASC_EVENT_END_MS = (function () {
  var FALLBACK = Date.UTC(2026, 10, 23, 15, 0, 0); // 23/11/2026 12:00 -03
  try {
    var iso = (window.FASC_CONFIG && window.FASC_CONFIG.eventEndIso) || '2026-11-23T12:00:00-03:00';
    var t = new Date(iso).getTime();
    if (isFinite(t) && t > Date.UTC(2025, 0, 1) && t < Date.UTC(2030, 0, 1)) return t;
    t = new Date('2026-11-23T15:00:00Z').getTime();
    if (isFinite(t)) return t;
  } catch (_) {}
  return FALLBACK;
})();

/** true se o festival já acabou (Meow / caixinha expirados) */
window.fascEventEnded = function () {
  return Date.now() >= (window.FASC_EVENT_END_MS || 0);
};

