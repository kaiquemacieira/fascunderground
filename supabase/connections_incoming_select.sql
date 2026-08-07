-- CRICRI · permitir ler pedidos de amizade recebidos
-- Rode no SQL Editor do Supabase se pedidos não aparecem

-- Leitura: eu vejo conexões onde sou destino (pedidos pra mim)
drop policy if exists "connections_select_incoming" on public.connections;
create policy "connections_select_incoming"
  on public.connections for select
  using (auth.uid() = to_id OR auth.uid() = from_id);

-- Insert: só crio pedido saindo de mim
drop policy if exists "connections_insert_own" on public.connections;
create policy "connections_insert_own"
  on public.connections for insert
  with check (auth.uid() = from_id);

-- Update: posso aceitar pedidos dirigidos a mim ou atualizar os que enviei
drop policy if exists "connections_update_involved" on public.connections;
create policy "connections_update_involved"
  on public.connections for update
  using (auth.uid() = to_id OR auth.uid() = from_id);

-- Delete: posso recusar (sou destino) ou cancelar (sou origem)
drop policy if exists "connections_delete_involved" on public.connections;
create policy "connections_delete_involved"
  on public.connections for delete
  using (auth.uid() = to_id OR auth.uid() = from_id);

-- Coluna status (se ainda não existir)
alter table public.connections
  add column if not exists status text default 'pending';

-- Índice útil
create index if not exists connections_to_status_idx
  on public.connections (to_id, status);
