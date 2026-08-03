-- CRICRI · tama_state + leitura pública segura (somente campos não-sensíveis)
-- Nunca expõe o jsonb completo ao anon/authenticated via SELECT direto.

create table if not exists public.tama_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tama_state_updated_at_idx on public.tama_state (updated_at desc);

alter table public.tama_state enable row level security;

-- dono: leitura e escrita do registro completo
drop policy if exists tama_state_select_own on public.tama_state;
create policy tama_state_select_own
  on public.tama_state for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists tama_state_insert_own on public.tama_state;
create policy tama_state_insert_own
  on public.tama_state for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists tama_state_update_own on public.tama_state;
create policy tama_state_update_own
  on public.tama_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists tama_state_delete_own on public.tama_state;
create policy tama_state_delete_own
  on public.tama_state for delete
  to authenticated
  using (auth.uid() = user_id);

-- sem policy de SELECT para anon na tabela base → jsonb completo inacessível

grant select, insert, update, delete on table public.tama_state to authenticated;
-- anon NÃO recebe grant na tabela

-- Snapshot público: só estágio, casca, care, cards, nome do bicho, alive, started
create or replace function public.get_tama_public(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when t.state is null then null
    when coalesce((t.state->>'started')::boolean, false) is not true then null
    else jsonb_build_object(
      'started', true,
      'name', coalesce(nullif(t.state->>'name', ''), 'Roda'),
      'stageId', coalesce(t.state->>'stageId', 'ovo'),
      'shell', coalesce(t.state->>'shell', 'rosa'),
      'careScore', coalesce((t.state->>'careScore')::int, 0),
      'alive', coalesce((t.state->>'alive')::boolean, true),
      'cards', coalesce(t.state->'cards', '{}'::jsonb)
    )
  end
  from public.tama_state t
  where t.user_id = p_user_id;
$$;

revoke all on function public.get_tama_public(uuid) from public;
grant execute on function public.get_tama_public(uuid) to anon, authenticated;

-- Atalho por handle (mesmo padrão da caixinha: profiles.handle)
create or replace function public.get_tama_public_by_handle(p_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_handle text;
begin
  v_handle := lower(trim(both from coalesce(p_handle, '')));
  v_handle := regexp_replace(v_handle, '^@', '');
  if v_handle = '' then
    return null;
  end if;

  select p.id into v_uid
  from public.profiles p
  where lower(p.handle) = v_handle
  limit 1;

  if v_uid is null then
    return null;
  end if;

  return public.get_tama_public(v_uid);
end;
$$;

revoke all on function public.get_tama_public_by_handle(text) from public;
grant execute on function public.get_tama_public_by_handle(text) to anon, authenticated;

comment on function public.get_tama_public(uuid) is
  'CRICRI: snapshot público do bichinho (stage, shell, care, cards). Sem stats internos.';
comment on function public.get_tama_public_by_handle(text) is
  'CRICRI: snapshot público do bichinho por handle de profiles.';
