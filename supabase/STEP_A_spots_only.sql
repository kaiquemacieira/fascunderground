-- FASC+ · PASSO A — só mapa (desbloqueia spots)
-- Cole isto PRIMEIRO no SQL Editor e rode.

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_m integer not null default 90 check (radius_m between 20 and 500),
  status text not null default 'sem info',
  updated_at timestamptz not null default now()
);

alter table public.spots enable row level security;

drop policy if exists "spots são públicos" on public.spots;
create policy "spots são públicos"
  on public.spots for select
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select on table public.spots to anon, authenticated;

insert into public.spots (slug, name, lat, lng, radius_m, status) values
  ('convento-sao-francisco', 'Convento São Francisco', -11.0149, -37.2047, 100, 'rolando agora'),
  ('praca-sao-francisco', 'Praça São Francisco', -11.0152, -37.2052, 120, '62% pronto'),
  ('igreja-matriz', 'Igreja Matriz', -11.0138, -37.2068, 90, 'vai rolar às 23h'),
  ('largo-amparo', 'Largo do Amparo', -11.0165, -37.2075, 85, 'terminou'),
  ('casa-do-sabao', 'Rua da Feira', -11.014, -37.208, 95, 'rolando agora')
on conflict (slug) do update set
  status = excluded.status,
  lat = excluded.lat,
  lng = excluded.lng,
  radius_m = excluded.radius_m,
  updated_at = now();

-- Conferência:
select slug, name, status from public.spots order by name;
