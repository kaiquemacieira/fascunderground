-- FASC+ · STEP_E — conexões (adicionar usuário por ID ou nick)
-- Rode no SQL Editor do Supabase (fasc-dev / fasc-prod).

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  constraint connections_no_self check (from_id <> to_id),
  constraint connections_unique unique (from_id, to_id)
);

create index if not exists connections_from_idx on public.connections (from_id, created_at desc);
create index if not exists connections_to_idx on public.connections (to_id);

alter table public.connections enable row level security;

drop policy if exists "conexões: dono lê" on public.connections;
drop policy if exists "conexões: dono cria" on public.connections;
drop policy if exists "conexões: dono apaga" on public.connections;

-- Só quem criou a conexão vê a lista (privacidade)
create policy "conexões: dono lê"
  on public.connections for select
  using (auth.uid() = from_id);

create policy "conexões: dono cria"
  on public.connections for insert
  with check (auth.uid() = from_id);

create policy "conexões: dono apaga"
  on public.connections for delete
  using (auth.uid() = from_id);

grant select, insert, delete on public.connections to authenticated;
grant select on public.profiles to authenticated, anon;

-- Helper opcional: buscar perfil por handle ou uuid (já coberto por select público em profiles)
comment on table public.connections is 'FASC+: usuário A adiciona B (por id ou nick) à sua lista.';
