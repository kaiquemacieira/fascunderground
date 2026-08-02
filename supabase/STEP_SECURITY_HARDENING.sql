-- FASC+ · SECURITY HARDENING
-- Rode no SQL Editor (fasc-dev e fasc-prod) DEPOIS do schema/RLS base.
-- Objetivo: menor privilégio, RLS à prova de grants largos, auditável.

-- --------------------------------------------------------------------------
-- 1) Extensões só onde precisa
-- --------------------------------------------------------------------------
-- create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------------------
-- 2) Revogar privilégios perigosos de anon em tabelas sensíveis
-- --------------------------------------------------------------------------
revoke all on table public.push_subscriptions from anon;
revoke all on table public.inbox_anon from anon;
revoke all on table public.scraps from anon;
revoke all on table public.connections from anon;

-- anon pode ler profiles públicos e spots (produto), nada mais sensível
grant select on table public.profiles to anon;
grant select on table public.spots to anon;
grant select on table public.posts to anon;
grant select on table public.post_likes to anon;
grant select on table public.post_comments to anon;
grant select on table public.afters to anon;
grant select on table public.after_participants to anon;

-- authenticated: escrita só onde o produto precisa (RLS ainda filtra)
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select, insert, update, delete on table public.inbox_anon to authenticated;
grant select, insert, update on table public.scraps to authenticated;
grant select, insert, delete on table public.connections to authenticated;

-- spots: SEM insert/update/delete para authenticated/anon (só service_role / SQL Editor)
revoke insert, update, delete on table public.spots from anon, authenticated;

-- --------------------------------------------------------------------------
-- 3) RLS push_subscriptions — reforço (idempotente)
-- --------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;

drop policy if exists "push: dono lê" on public.push_subscriptions;
drop policy if exists "push: dono cria" on public.push_subscriptions;
drop policy if exists "push: dono atualiza" on public.push_subscriptions;
drop policy if exists "push: dono apaga" on public.push_subscriptions;

create policy "push: dono lê"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "push: dono cria"
  on public.push_subscriptions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and char_length(endpoint) between 20 and 2048
    and char_length(p256dh) between 16 and 512
    and char_length(auth) between 8 and 512
  );

create policy "push: dono atualiza"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push: dono apaga"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 4) inbox_anon — impedir from_profile_id forjado + force RLS
-- --------------------------------------------------------------------------
alter table public.inbox_anon enable row level security;
alter table public.inbox_anon force row level security;

drop policy if exists "autenticado envia recado" on public.inbox_anon;
create policy "autenticado envia recado"
  on public.inbox_anon for insert
  to authenticated
  with check (
    auth.uid() is not null
    and to_profile_id is not null
    and to_profile_id <> auth.uid()
    and (from_profile_id is null or from_profile_id = auth.uid())
    and char_length(body) between 1 and 280
  );

-- --------------------------------------------------------------------------
-- 5) profiles.handle — normalização básica via check (se ainda não houver)
-- --------------------------------------------------------------------------
do $$
begin
  alter table public.profiles
    add constraint profiles_handle_format
    check (
      handle is null
      or handle ~ '^[a-z0-9._]{3,40}$'
    );
exception
  when duplicate_object then null;
end $$;

-- --------------------------------------------------------------------------
-- 6) Função de audit: tabelas public SEM RLS (deve retornar 0)
-- --------------------------------------------------------------------------
-- select tablename from pg_tables
-- where schemaname = 'public' and not rowsecurity;

-- --------------------------------------------------------------------------
-- 7) Comentários operacionais
-- --------------------------------------------------------------------------
comment on table public.push_subscriptions is
  'Endpoints Web Push. Leitura/escrita só do dono via RLS. Envio só Edge Function + service_role.';

select 'SECURITY HARDENING applied — revise webhooks auth + secrets VAPID/HOOK' as status;
