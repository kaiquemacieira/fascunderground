-- CRICRI · posts webhooks support (indexes + realtime publication)
-- Mirror of STEP_K_posts_webhooks.sql

do $$
begin
  begin
    alter publication supabase_realtime add table public.posts;
  exception
    when duplicate_object then null;
    when undefined_object then null;
    when others then null;
  end;
end $$;

create index if not exists connections_to_idx
  on public.connections (to_id);

create index if not exists posts_author_created_idx
  on public.posts (author_id, created_at desc);

create index if not exists posts_created_idx
  on public.posts (created_at desc);

comment on table public.posts is
  'CRICRI mural. Webhook INSERT → Edge Function push-trigger notifica conexões.';
