-- FASC+ · Etapa 5 — bucket de imagens de post

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "imagens de post públicas" on storage.objects;
drop policy if exists "usuário sobe suas próprias imagens" on storage.objects;
drop policy if exists "usuário atualiza suas imagens" on storage.objects;
drop policy if exists "usuário apaga suas imagens" on storage.objects;

create policy "imagens de post públicas"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "usuário sobe suas próprias imagens"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "usuário atualiza suas imagens"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "usuário apaga suas imagens"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
