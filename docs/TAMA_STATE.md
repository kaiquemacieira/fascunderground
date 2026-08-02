# Tamagotchi · persistência Supabase

```sql
create table if not exists public.tama_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tama_state enable row level security;

create policy "tama_select_own" on public.tama_state
  for select using (auth.uid() = user_id);
create policy "tama_upsert_own" on public.tama_state
  for insert with check (auth.uid() = user_id);
create policy "tama_update_own" on public.tama_state
  for update using (auth.uid() = user_id);
```

O front grava em `localStorage` (`cricri-tama-v3`) e faz upsert em `tama_state` quando há login.
