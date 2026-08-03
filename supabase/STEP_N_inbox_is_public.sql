-- CRICRI · STEP_N — is_public + mural de gentilezas
-- Rode no SQL Editor (fasc-dev / fasc-prod).
-- Pré-req: inbox_anon (STEP_C / migration 006)

alter table public.inbox_anon
  add column if not exists is_public boolean not null default false;

create index if not exists inbox_anon_public_wall_idx
  on public.inbox_anon (to_profile_id, created_at desc)
  where is_public = true and is_hidden = false;

create or replace function public.get_kindness_wall(p_to_user uuid)
returns table (
  id uuid,
  body text,
  answer text,
  answered_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.body,
    i.answer,
    i.answered_at,
    i.created_at
  from public.inbox_anon i
  where i.to_profile_id = p_to_user
    and i.is_public = true
    and i.is_hidden = false
  order by i.created_at desc
  limit 40;
$$;

revoke all on function public.get_kindness_wall(uuid) from public;
grant execute on function public.get_kindness_wall(uuid) to anon, authenticated;

create or replace function public.get_kindness_wall_by_handle(p_handle text)
returns table (
  id uuid,
  body text,
  answer text,
  answered_at timestamptz,
  created_at timestamptz
)
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
    return;
  end if;

  select p.id into v_uid
  from public.profiles p
  where lower(p.handle) = v_handle
  limit 1;

  if v_uid is null then
    return;
  end if;

  return query select * from public.get_kindness_wall(v_uid);
end;
$$;

revoke all on function public.get_kindness_wall_by_handle(text) from public;
grant execute on function public.get_kindness_wall_by_handle(text) to anon, authenticated;

select 'STEP_N inbox is_public + get_kindness_wall ok' as status;
