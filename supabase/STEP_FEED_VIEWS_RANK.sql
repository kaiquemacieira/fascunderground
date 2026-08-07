-- CRICRI · view_count + ranking do feed (estilo Threads)
-- Rode no SQL Editor do Supabase

alter table public.posts
  add column if not exists view_count integer not null default 0;

create index if not exists posts_view_count_idx
  on public.posts (view_count desc);

create index if not exists posts_created_view_idx
  on public.posts (created_at desc, view_count desc);

-- incrementa visualização (qualquer um autenticado ou anon)
create or replace function public.increment_post_view(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where id = p_id;
end;
$$;

grant execute on function public.increment_post_view(uuid) to anon, authenticated;

-- likes count helper view (opcional)
-- grant já existente em posts
