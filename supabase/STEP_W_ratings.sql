-- CRICRI · avaliações (spots, pois, eventos, rolês)
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('spot', 'poi', 'event', 'role', 'after')),
  target_id text not null,
  score smallint not null check (score >= 1 and score <= 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists ratings_target_idx
  on public.ratings (target_type, target_id);

create index if not exists ratings_user_idx
  on public.ratings (user_id);

alter table public.ratings enable row level security;

drop policy if exists "ratings_select_all" on public.ratings;
create policy "ratings_select_all"
  on public.ratings for select
  to anon, authenticated
  using (true);

drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own"
  on public.ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own"
  on public.ratings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ratings_delete_own" on public.ratings;
create policy "ratings_delete_own"
  on public.ratings for delete
  to authenticated
  using (auth.uid() = user_id);

-- média agregada (view pública)
create or replace view public.ratings_summary as
select
  target_type,
  target_id,
  count(*)::int as count,
  round(avg(score)::numeric, 2) as avg_score
from public.ratings
group by target_type, target_id;

grant select on public.ratings_summary to anon, authenticated;

comment on table public.ratings is 'Avaliações 1–5 de spots, pois, eventos e rolês no CRICRI';
