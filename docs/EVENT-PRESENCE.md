# Selo de presença no evento (P2/P3.3)

## Ideia
Cada dia em que a pessoa entra no **geofence de um spot** (mapa com geoloc) grava um check-in.  
No perfil, um selo resume quantos dias do FASC ela esteve presente.

Exemplos:
- `esteve 1 dia no FASC`
- `esteve em 3 dias do FASC`
- `esteve nos 4 dias do FASC` (selo completo)

## Janela
**19–22/11/2026** (America/Sao_Paulo). Fora disso, `record_event_checkin` não grava.

## Dados
Tabela `event_checkins`:
- `user_id` + `day` (PK) — no máximo 1 por dia
- `spot_id` / `spot_name` opcionais (último spot do dia)

## Fluxo
1. `projano:geofence` enter → `cricri-meet.js` → `set_my_spot_presence` + `record_event_checkin`
2. Perfil → `get_event_presence(p_user)` → `#presence-seal`

## Privacidade
- Spots **não** são expostos no selo público (só contagem de dias)
- Check-in detalhado: dono lê via RLS; gravação só por RPC autenticada

## SQL
- `STEP_Q_event_checkins.sql`
- migration `202608030009_event_checkins.sql`
