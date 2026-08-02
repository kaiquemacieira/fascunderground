# Presença (amigos online)

```sql
alter table public.profiles
  add column if not exists last_seen timestamptz;

create index if not exists profiles_last_seen_idx on public.profiles (last_seen desc);
```

Online = `last_seen` nos últimos 3 minutos. Away = 15 min.
