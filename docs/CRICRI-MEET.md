# Encontro no mapa entre bichinhos (P2/P3.1)

## O que é
Toast/notificação leve quando **dois usuários com conexão mútua** estão no **mesmo geofence de spot** ao mesmo tempo:

> Seu CRICRI encontrou o de [nome] em [spot]

## Regras de privacidade
| Regra | Detalhe |
|-------|---------|
| Só mútuos | `connections(A→B)` **e** `connections(B→A)` |
| Nunca desconhecidos | RPC `get_cricri_meets` filtra no servidor |
| Sem lat/lng no banco | Só `spot_id` + `spot_name` + `updated_at` |
| TTL | Presença válida ~5 min (`p_fresh_seconds`) |
| Opt-in prático | Só funciona com geoloc do mapa (já consentida) |

## Fluxo
1. `mock.js` detecta enter/leave → evento `projano:geofence`
2. `js/cricri-meet.js` chama `set_my_spot_presence(spot_id, name)`
3. Poll / enter → `get_cricri_meets` → toast + `CricriNotifs` (cooldown 30 min por amigo+spot)

## SQL
- Migration: `202608030008_spot_presence_meets.sql`
- Editor: `STEP_P_spot_presence_meets.sql`

## LGPD
Documentado em `GEO-OFFLINE.md` e `GEO-WIFI.md`.
