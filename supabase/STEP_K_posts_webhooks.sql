-- CRICRI · STEP_K — Webhooks de posts (mural)
-- Preferência: rode STEP_L_fix_posts_author_id.sql ANTES se der erro 42703 author_id.

do $$
begin
  begin
    alter publication supabase_realtime add table public.posts;
  exception
    when duplicate_object then null;
    when undefined_object then
      raise notice 'publication supabase_realtime ausente — Dashboard → Replication';
    when others then
      raise notice 'realtime posts: %', SQLERRM;
  end;
end $$;

create index if not exists connections_to_idx
  on public.connections (to_id);

-- índices de posts só se author_id existir
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'author_id'
  ) then
    create index if not exists posts_author_created_idx
      on public.posts (author_id, created_at desc);
  else
    raise notice 'posts.author_id ausente — rode STEP_L_fix_posts_author_id.sql';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'posts'
  ) then
    create index if not exists posts_created_idx
      on public.posts (created_at desc);
  end if;
end $$;

comment on table public.posts is
  'CRICRI mural. Webhook INSERT → push-trigger notifica conexões (to_id = author_id).';

select 'STEP_K posts webhooks/realtime ok' as status;
