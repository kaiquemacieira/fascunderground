-- CRICRI · STEP_P — spot_presence + encontros mútuos (P2/P3.1)
-- Rode no SQL Editor do fasc-dev.

create table if not exists public.spot_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  spot_id text not null,
  spot_name text,
  updated_at timestamptz not null default now()
);

create index if not exists spot_presence_spot_updated_idx
  on public.spot_presence (spot_id, updated_at desc);

alter table public.spot_presence enable row level security;

drop policy if exists "spot_presence: dono lê" on public.spot_presence;
create policy "spot_presence: dono lê"
  on public.spot_presence for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "spot_presence: dono upsert" on public.spot_presence;
create policy "spot_presence: dono upsert"
  on public.spot_presence for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "spot_presence: dono update" on public.spot_presence;
create policy "spot_presence: dono update"
  on public.spot_presence for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "spot_presence: dono delete" on public.spot_presence;
create policy "spot_presence: dono delete"
  on public.spot_presence for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.spot_presence from anon;
grant select, insert, update, delete on table public.spot_presence to authenticated;

create or replace function public.set_my_spot_presence(p_spot_id text, p_spot_name text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_spot_id is null or length(trim(p_spot_id)) = 0 then
    delete from public.spot_presence where user_id = auth.uid();
    return;
  end if;
  insert into public.spot_presence (user_id, spot_id, spot_name, updated_at)
  values (auth.uid(), trim(p_spot_id), nullif(trim(coalesce(p_spot_name, '')), ''), now())
  on conflict (user_id) do update
    set spot_id = excluded.spot_id,
        spot_name = excluded.spot_name,
        updated_at = now();
end;
$$;

revoke all on function public.set_my_spot_presence(text, text) from public;
grant execute on function public.set_my_spot_presence(text, text) to authenticated;

create or replace function public.get_cricri_meets(p_fresh_seconds int default 300)
returns table (
  friend_id uuid, handle text, name text, spot_id text, spot_name text, friend_updated_at timestamptz
)
language plpgsql security definer set search_path = public stable as $$
declare
  me uuid := auth.uid();
  my_spot text;
  fresh interval;
begin
  if me is null then return; end if;
  fresh := make_interval(secs => greatest(coalesce(p_fresh_seconds, 300), 60));

  select sp.spot_id into my_spot
  from public.spot_presence sp
  where sp.user_id = me and sp.updated_at > now() - fresh;
  if my_spot is null then return; end if;

  return query
  select fp.user_id, p.handle, p.name, fp.spot_id, coalesce(fp.spot_name, my_spot), fp.updated_at
  from public.spot_presence fp
  join public.profiles p on p.id = fp.user_id
  where fp.user_id <> me
    and fp.spot_id = my_spot
    and fp.updated_at > now() - fresh
    and exists (select 1 from public.connections c1 where c1.from_id = me and c1.to_id = fp.user_id)
    and exists (select 1 from public.connections c2 where c2.from_id = fp.user_id and c2.to_id = me);
end;
$$;

revoke all on function public.get_cricri_meets(int) from public;
grant execute on function public.get_cricri_meets(int) to authenticated;

select 'STEP_P spot_presence + get_cricri_meets ok' as status;
