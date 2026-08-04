# CRICRI v2 — patch (passos 0–7 + OAuth login.html)

## Mudanças principais
1. `/` → login.html (vercel.json)
2. Gate de sessão em index + explorar
3. index = timer + mural tela cheia
4. explorar.html (mapa + denúncia)
5. Pet saiu do profile → tamagotchi
6. EVENT_END = 2026-11-23T12:00:00-03:00; bornAt/started_at no 1º acesso
7. OAuth Google redirect → login.html (supabase-client + bundles)

## Google OAuth
Client ID + Secret: SOMENTE no Supabase Dashboard → Authentication → Providers → Google.
Nunca no front.

Redirect Google Cloud:
https://bcnbwshwehofncfkdnra.supabase.co/auth/v1/callback

## Como aplicar
Copiar por cima do projeto (mesmos paths) e redeploy Vercel.
