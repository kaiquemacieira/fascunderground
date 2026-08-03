-- CRICRI · STEP_Q — event_checkins + selo de presença (P2/P3.3)
-- Rode no SQL Editor.

create table if not exists public.event_checkins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  spot_id text,
  spot_name text,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists event_checkins_day_idx on public.event_checkins (day desc);

alter table public.event_checkins enable row level security;

drop policy if exists "event_checkins: dono lê" on public.event_checkins;
create policy "event_checkins: dono lê"
  on public.event_checkins for select to authenticated
  using (user_id = auth.uid());

revoke all on table public.event_checkins from anon;
grant select on table public.event_checkins to authenticated;

create or replace function public.record_event_checkin(p_spot_id text default null, p_spot_name text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d date;
  fest_start date := date '2026-11-19';
  fest_end date := date '2026-11-22';
begin
  if me is null then raise exception 'not authenticated'; end if;
  d := (timezone('America/Sao_Paulo', now()))::date;
  if d < fest_start or d > fest_end then return false; end if;
  insert into public.event_checkins (user_id, day, spot_id, spot_name, created_at)
  values (me, d, nullif(trim(coalesce(p_spot_id, '')), ''), nullif(trim(coalesce(p_spot_name, '')), ''), now())
  on conflict (user_id, day) do update
    set spot_id = coalesce(excluded.spot_id, public.event_checkins.spot_id),
        spot_name = coalesce(excluded.spot_name, public.event_checkins.spot_name);
  return true;
end;
$$;

revoke all on function public.record_event_checkin(text, text) from public;
grant execute on function public.record_event_checkin(text, text) to authenticated;

create or replace function public.get_event_presence(p_user uuid default null)
returns table (day_count int, total_festival_days int, days date[])
language plpgsql security definer set search_path = public stable as $$
declare
  uid uuid := coalesce(p_user, auth.uid());
  fest_start date := date '2026-11-19';
  fest_end date := date '2026-11-22';
begin
  if uid is null then return; end if;
  return query
  select count(*)::int, (fest_end - fest_start + 1)::int,
         coalesce(array_agg(ec.day order by ec.day), array[]::date[])
  from public.event_checkins ec
  where ec.user_id = uid and ec.day between fest_start and fest_end;
end;
$$;

revoke all on function public.get_event_presence(uuid) from public;
grant execute on function public.get_event_presence(uuid) to anon, authenticated;

select 'STEP_Q event_checkins ok' as status;
