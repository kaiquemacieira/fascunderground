-- CRICRI · habilitar Realtime nas tabelas de sync
-- Rode no SQL Editor do Supabase (Dashboard → SQL)

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.spots;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.tama_state;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.inbox_anon;
  exception when duplicate_object then null;
  end;
end $$;

alter table if exists public.spots replica identity full;
alter table if exists public.tama_state replica identity full;
alter table if exists public.profiles replica identity full;
alter table if exists public.inbox_anon replica identity full;

-- Conferir:
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
