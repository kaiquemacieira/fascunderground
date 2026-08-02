-- FASC+ · STEP_I — mapa de calor de público (agregado, sem rastrear indivíduo)
-- Privacidade: só células arredondadas (~50 m); sem user_id; janela curta; limpeza automática.

create table if not exists public.presence_samples (
  id bigint generated always as identity primary key,
  cell_lat numeric(9, 5) not null,
  cell_lng numeric(9, 5) not null,
  created_at timestamptz not null default now()
);

create index if not exists presence_samples_created_idx
  on public.presence_samples (created_at desc);

create index if not exists presence_samples_cell_idx
  on public.presence_samples (cell_lat, cell_lng);

alter table public.presence_samples enable row level security;
alter table public.presence_samples force row level security;

-- Ninguém lê linhas cruas pela API (só a RPC agregada)
drop policy if exists "presence: autenticado contribui" on public.presence_samples;
create policy "presence: autenticado contribui"
  on public.presence_samples for insert
  to authenticated
  with check (
    cell_lat between -33.8 and -5.0
    and cell_lng between -74.0 and -34.0
  );

revoke all on table public.presence_samples from anon;
grant insert on table public.presence_samples to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Agregação pública: últimos N minutos, só contagem por célula
create or replace function public.get_presence_heat(p_minutes integer default 25)
returns table (lat double precision, lng double precision, weight bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.cell_lat::double precision as lat,
    s.cell_lng::double precision as lng,
    count(*)::bigint as weight
  from public.presence_samples s
  where s.created_at > now() - make_interval(mins => greatest(5, least(coalesce(p_minutes, 25), 120)))
  group by s.cell_lat, s.cell_lng
  having count(*) >= 1
  order by weight desc
  limit 500;
$$;

revoke all on function public.get_presence_heat(integer) from public;
grant execute on function public.get_presence_heat(integer) to anon, authenticated;

-- Limpeza: apaga amostras com mais de 3 horas (rode via cron ou manual)
create or replace function public.cleanup_presence_samples()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.presence_samples
  where created_at < now() - interval '3 hours';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.cleanup_presence_samples() from public;
-- só service_role / SQL Editor chama cleanup

comment on table public.presence_samples is
  'FASC+: presença agregada para heat map. Sem user_id. Células ~50m. Janela curta.';

select 'presence_heat ready' as status;
