-- Opcional: não cria linhas sozinho.
-- Amizade mútua = A→B e B→A (status accepted se a coluna existir).
-- Quem já tem só um lado precisa pedir de volta OU aceitar no sininho.
-- Este script só marca como accepted os pares que já são bidirecionais:

update public.connections c
set status = 'accepted'
where exists (
  select 1 from public.connections x
  where x.from_id = c.to_id and x.to_id = c.from_id
)
and exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'connections' and column_name = 'status'
);
