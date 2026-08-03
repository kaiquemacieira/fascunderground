-- CRICRI · STEP_O — profiles.last_seen (presença)
-- Rode no SQL Editor se a coluna ainda não existir.

alter table public.profiles
  add column if not exists last_seen timestamptz;

create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen desc nulls last);

select 'STEP_O profiles.last_seen ok' as status;
