-- FASC+ · grants para todas as tabelas do MVP (rode DEPOIS do schema completo)
grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- escrita: só authenticated (RLS ainda restringe por auth.uid())
grant insert, update, delete on all tables in schema public to authenticated;

alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
