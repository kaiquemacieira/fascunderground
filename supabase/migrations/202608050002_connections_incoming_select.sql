-- CRICRI · permitir ler conexões recebidas (alguém me adicionou)
-- Necessário para notificar "nova conexão" no app.

drop policy if exists "conexões: dono lê" on public.connections;
drop policy if exists "conexões: lê próprias e recebidas" on public.connections;

create policy "conexões: lê próprias e recebidas"
  on public.connections
  for select
  to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

-- insert/delete continuam só do dono (from_id)
