// FASC+ — config pública (anon/publishable key é segura no front)
// NUNCA coloque service_role aqui.
window.FASC_CONFIG = {
  supabaseUrl: 'https://bcnbwshwehofncfkdnra.supabase.co',
  supabaseAnonKey: 'sb_publishable_k0iCZgl6qweP16tW3uiGYA_HTJYO1iK',
  env: 'dev',
  // Chave pública VAPID (npx web-push generate-vapid-keys). Privada só no backend.
  vapidPublicKey: '',

  // ---- GTFS-RT / previsão ao vivo ----
  // SMTT-CTM (Aracaju/SC) não publica feed aberto. Deixe vazio = modelo local.
  // Quando tiver proxy/API própria:
  transitRtUrl: '',              // JSON { delays: { "031": 3 } }
  gtfsRtTripUpdatesUrl: '',      // GTFS-RT Trip Updates (JSON preferível)
  gtfsRtVehicleUrl: ''           // GTFS-RT Vehicle Positions (JSON)
};

