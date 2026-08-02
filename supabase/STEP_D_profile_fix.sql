-- FASC+ · colunas de perfil que podem faltar + caixinha (se ainda não rodou STEP_C)

-- bio / handle extras
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists photo_url text;
alter table public.profiles add column if not exists city text default 'São Cristóvão';

-- handle único (ignora se já existir)
do $$ begin
  alter table public.profiles add constraint profiles_handle_key unique (handle);
exception when duplicate_object then null;
end $$;

-- Caixinha anônima (idempotente)
create table if not exists public.inbox_anon (
  id uuid primary key default gen_random_uuid(),
  to_profile_id uuid not null references public.profiles(id) on delete cascade,
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

alter table public.inbox_anon enable row level security;

drop policy if exists "dono lê sua caixinha" on public.inbox_anon;
create policy "dono lê sua caixinha"
  on public.inbox_anon for select using (auth.uid() = to_profile_id);

drop policy if exists "autenticado envia recado" on public.inbox_anon;
create policy "autenticado envia recado"
  on public.inbox_anon for insert to authenticated
  with check (
    auth.uid() is not null
    and to_profile_id is not null
    and to_profile_id <> auth.uid()
    and (from_profile_id is null or from_profile_id = auth.uid())
  );

drop policy if exists "dono responde ou oculta" on public.inbox_anon;
create policy "dono responde ou oculta"
  on public.inbox_anon for update
  using (auth.uid() = to_profile_id)
  with check (auth.uid() = to_profile_id);

drop policy if exists "dono apaga da caixinha" on public.inbox_anon;
create policy "dono apaga da caixinha"
  on public.inbox_anon for delete using (auth.uid() = to_profile_id);

grant select, insert, update, delete on public.inbox_anon to authenticated;
grant select on public.inbox_anon to anon;
