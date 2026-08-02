-- FASC+ · PASSO A2 — liberar leitura da API (anon + authenticated)
-- Rode no SQL Editor agora.

grant usage on schema public to anon, authenticated;
grant select on public.spots to anon, authenticated;

-- se automatic RLS já estiver on, a policy abaixo garante leitura pública:
alter table public.spots enable row level security;
drop policy if exists "spots são públicos" on public.spots;
create policy "spots são públicos"
  on public.spots for select
  to anon, authenticated
  using (true);

-- conferência (no SQL Editor, como postgres, sempre funciona):
select slug, name, status from public.spots order by name;
