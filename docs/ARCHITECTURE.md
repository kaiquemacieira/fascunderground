# FASC+ — Architecture (fonte de verdade técnica)

## Stack atual (front)

| Camada | Hoje |
|--------|------|
| UI | HTML + CSS tokens fluidos + JS vanilla |
| Mapa | Leaflet + `mock.js` (spots hardcoded + geoloc) |
| Dados | Mock estático no DOM + `mock.js` marketplace |
| A11y | CSS `data-a11y-*` + painel + `scripts/a11y-check.py` em CI |

## Stack alvo (MVP backend)

| Camada | Alvo |
|--------|------|
| Backend | Supabase (`fasc-dev` / `fasc-prod`) · região `sa-east-1` |
| Auth | Magic link (e-mail) |
| DB | Postgres schema em `supabase/migrations/` |
| Realtime | `spots.status` + feed opcional |
| Storage | bucket `post-images` |

## Verticais MVP

```
[Auth magic link]
       │
       ▼
[profiles] ──► [posts] ──► [post_likes / post_comments / post_images]
       │              └──► [scraps]
       │
       ├──► [spots] ◄── realtime status (mapa / geofence)
       │
       └──► [afters] ──► [after_participants]
```

## Front: regras antes de plugar Supabase

1. **Delegação de eventos** em containers (`#feed`, `#market-grid`, etc.) — nunca `querySelectorAll(...).forEach(addEventListener)` em lista dinâmica.
2. **`escapeHtml`** em todo HTML hidratado com dado de usuário.
3. **Client Supabase** só com `SUPABASE_URL` + `anon` key (env / meta tag). Nunca `service_role`.
4. Manter a **forma dos objetos** que o mapa já consome: `{ id, name, lat, lng, radius, status }`.

## Ordem de entrega (CTO)

| # | Entrega | Dono | Bloqueia |
|---|---------|------|----------|
| P0 | Schema + RLS + trigger profile | backend | tudo |
| P0 | Delegação de eventos + escapeHtml no front | front | Etapa 6 |
| P1 | Auth magic link no `script.js` | front | posts/scraps reais |
| P1 | Spots do Supabase + realtime | front+data | mapa vivo |
| P2 | Feed posts/likes/comments | front | — |
| P2 | Afters + presença | front | — |
| P3 | Storage upload | front | imagens |
| P3 | Seed dev | data | QA |

## Arquivos de migração

```
supabase/migrations/
  202608020001_schema.sql
  202608020002_rls.sql
  202608020003_auth_profile_trigger.sql
  202608020004_storage.sql
  202608020005_seed_dev.sql
```

Rodar **nessa ordem** no SQL Editor do `fasc-dev`.
