# Presença (amigos online)

```sql
alter table public.profiles
  add column if not exists last_seen timestamptz;

create index if not exists profiles_last_seen_idx on public.profiles (last_seen desc);
```

| Status | Janela | UI |
|--------|--------|-----|
| **online** | `last_seen` &lt; **3 min** | ponto verde |
| **away** | `last_seen` &lt; **15 min** | ponto ocre |
| **offline** | resto / null | ponto cinza |

## Amigos por perto (P1.4)

- Lista = `connections` do usuário logado (`from_id = eu` → `to_id`).
- Status = `profiles.last_seen` das conexões (**sem** geolocalização).
- Heartbeat no `profile.html`: atualiza `last_seen` a cada 60s + ao focar a aba.
- UI: seção **Amigos por perto** no hero (`#friends-online-card`), ordenada online → away → offline.
- SQL: `STEP_O_profiles_last_seen.sql` / migration `202608030007_profiles_last_seen.sql`.
