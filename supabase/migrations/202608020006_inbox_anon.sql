-- FASC+ · Caixinha anônima por perfil
-- Rode no SQL Editor do fasc-dev

create table if not exists public.inbox_anon (
  id uuid primary key default gen_random_uuid(),
  to_profile_id uuid not null references public.profiles(id) on delete cascade,
  -- remetente opcional: null = totalmente anônimo para o dono
  from_profile_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 280),
  is_anonymous boolean not null default true,
  answer text check (answer is null or char_length(answer) between 1 and 500),
  answered_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inbox_anon_to_created_idx
  on public.inbox_anon (to_profile_id, created_at desc);

create index if not exists inbox_anon_to_open_idx
  on public.inbox_anon (to_profile_id)
  where answer is null and is_hidden = false;

alter table public.inbox_anon enable row level security;

-- Leitura: só o dono do perfil vê as mensagens (mesmo as "anônimas")
drop policy if exists "dono lê sua caixinha" on public.inbox_anon;
create policy "dono lê sua caixinha"
  on public.inbox_anon for select
  using (auth.uid() = to_profile_id);

-- Insert: qualquer usuário autenticado pode enviar (rate-limit fica app-side no MVP)
drop policy if exists "autenticado envia recado" on public.inbox_anon;
create policy "autenticado envia recado"
  on public.inbox_anon for insert
  to authenticated
  with check (
    auth.uid() is not null
    and to_profile_id is not null
    -- não pode enviar para si mesmo
    and to_profile_id <> auth.uid()
    -- se marcar from_profile_id, tem que ser o próprio
    and (from_profile_id is null or from_profile_id = auth.uid())
  );

-- Update: só o dono responde / oculta
drop policy if exists "dono responde ou oculta" on public.inbox_anon;
create policy "dono responde ou oculta"
  on public.inbox_anon for update
  using (auth.uid() = to_profile_id)
  with check (auth.uid() = to_profile_id);

-- Delete: só o dono
drop policy if exists "dono apaga da caixinha" on public.inbox_anon;
create policy "dono apaga da caixinha"
  on public.inbox_anon for delete
  using (auth.uid() = to_profile_id);

-- Grants
grant select, insert, update, delete on public.inbox_anon to authenticated;
grant select on public.inbox_anon to anon; -- RLS bloqueia; grant evita 42501 confuso

-- Opcional: respostas públicas visíveis (view)
create or replace view public.inbox_anon_public as
  select id, to_profile_id, body, answer, answered_at, created_at
  from public.inbox_anon
  where is_hidden = false and answer is not null;

grant select on public.inbox_anon_public to anon, authenticated;
