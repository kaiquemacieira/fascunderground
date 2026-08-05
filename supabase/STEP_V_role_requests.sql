-- CRICRI · solicitações de Rolê/After no mapa
create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  handle text,
  title text not null,
  kind text not null default 'role' check (kind in ('role', 'after')),
  when_text text,
  notes text,
  contact text,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists role_requests_status_idx on public.role_requests (status, created_at desc);

alter table public.role_requests enable row level security;

-- qualquer autenticado (ou anônimo via anon key se policy permitir insert) pode solicitar
drop policy if exists "role_requests_insert" on public.role_requests;
create policy "role_requests_insert"
  on public.role_requests for insert
  to anon, authenticated
  with check (true);

-- autenticado lista (painel admin); anônimo só vê aceitos
drop policy if exists "role_requests_select_own" on public.role_requests;
create policy "role_requests_select_auth"
  on public.role_requests for select
  to authenticated
  using (true);

-- leitura de aceitos (mapa público)
drop policy if exists "role_requests_select_accepted" on public.role_requests;
create policy "role_requests_select_accepted"
  on public.role_requests for select
  to anon, authenticated
  using (status = 'accepted');

-- update só authenticated (admin usa service role no painel ou policy por email)
drop policy if exists "role_requests_update_auth" on public.role_requests;
create policy "role_requests_update_auth"
  on public.role_requests for update
  to authenticated
  using (true)
  with check (true);

comment on table public.role_requests is 'Solicitações de Rolê/After — só entram no mapa público após status=accepted';
