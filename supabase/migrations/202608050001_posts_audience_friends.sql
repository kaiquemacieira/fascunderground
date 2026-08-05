-- CRICRI · posts com audiência (public / friends)
-- Agora privado: só autor + amigos mútuos (A→B e B→A em connections)

alter table public.posts
  add column if not exists audience text not null default 'public'
  check (audience in ('public', 'friends'));

create index if not exists posts_audience_created_idx
  on public.posts (audience, created_at desc);

-- RLS: remove select público total; recria com regra de amigos
drop policy if exists "posts são públicos" on public.posts;
drop policy if exists "posts: leitura por audiência" on public.posts;

create policy "posts: leitura por audiência"
  on public.posts
  for select
  using (
    -- programação / público
    audience = 'public'
    -- próprio post
    or author_id = auth.uid()
    -- amigos mútuos
    or (
      audience = 'friends'
      and auth.uid() is not null
      and exists (
        select 1 from public.connections c1
        where c1.from_id = auth.uid() and c1.to_id = posts.author_id
      )
      and exists (
        select 1 from public.connections c2
        where c2.from_id = posts.author_id and c2.to_id = auth.uid()
      )
    )
  );

-- insert continua: autor = auth.uid()
-- garante audience válida no insert (default public; app manda friends no Agora)

comment on column public.posts.audience is
  'public = todo mundo; friends = só autor + conexão mútua';
