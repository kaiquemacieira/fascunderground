-- FASC+ · Etapa 3 — Row Level Security
-- Rode DEPOIS do schema. Sem RLS = anon key lê/escreve tudo.

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.scraps enable row level security;
alter table public.spots enable row level security;
alter table public.afters enable row level security;
alter table public.after_participants enable row level security;

-- profiles
drop policy if exists "profiles são públicos" on public.profiles;
drop policy if exists "usuário edita o próprio perfil" on public.profiles;
drop policy if exists "usuário cria o próprio perfil" on public.profiles;
create policy "profiles são públicos"
  on public.profiles for select using (true);
create policy "usuário cria o próprio perfil"
  on public.profiles for insert with check (auth.uid() = id);
create policy "usuário edita o próprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- posts
drop policy if exists "posts são públicos" on public.posts;
drop policy if exists "usuário logado cria post" on public.posts;
drop policy if exists "autor apaga o próprio post" on public.posts;
create policy "posts são públicos"
  on public.posts for select using (true);
create policy "usuário logado cria post"
  on public.posts for insert with check (auth.uid() = author_id);
create policy "autor apaga o próprio post"
  on public.posts for delete using (auth.uid() = author_id);

-- post_images
drop policy if exists "imagens públicas" on public.post_images;
drop policy if exists "autor sobe imagens do próprio post" on public.post_images;
create policy "imagens públicas"
  on public.post_images for select using (true);
create policy "autor sobe imagens do próprio post"
  on public.post_images for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- likes
drop policy if exists "likes públicos" on public.post_likes;
drop policy if exists "usuário cria o próprio like" on public.post_likes;
drop policy if exists "usuário remove o próprio like" on public.post_likes;
create policy "likes públicos"
  on public.post_likes for select using (true);
create policy "usuário cria o próprio like"
  on public.post_likes for insert with check (auth.uid() = user_id);
create policy "usuário remove o próprio like"
  on public.post_likes for delete using (auth.uid() = user_id);

-- comments
drop policy if exists "comments públicos" on public.post_comments;
drop policy if exists "usuário logado comenta" on public.post_comments;
drop policy if exists "autor apaga o próprio comentário" on public.post_comments;
create policy "comments públicos"
  on public.post_comments for select using (true);
create policy "usuário logado comenta"
  on public.post_comments for insert with check (auth.uid() = author_id);
create policy "autor apaga o próprio comentário"
  on public.post_comments for delete using (auth.uid() = author_id);

-- scraps: só remetente e destinatário
drop policy if exists "scraps visíveis aos envolvidos" on public.scraps;
drop policy if exists "usuário envia scrap" on public.scraps;
drop policy if exists "destinatário marca lido" on public.scraps;
create policy "scraps visíveis aos envolvidos"
  on public.scraps for select
  using (auth.uid() = from_id or auth.uid() = to_id);
create policy "usuário envia scrap"
  on public.scraps for insert
  with check (auth.uid() = from_id);
create policy "destinatário marca lido"
  on public.scraps for update
  using (auth.uid() = to_id);

-- spots: leitura pública; escrita só service_role (sem policy de write = bloqueado pro anon/authenticated)
drop policy if exists "spots são públicos" on public.spots;
create policy "spots são públicos"
  on public.spots for select using (true);

-- afters
drop policy if exists "afters são públicos" on public.afters;
drop policy if exists "usuário logado cria after" on public.afters;
create policy "afters são públicos"
  on public.afters for select using (true);
create policy "usuário logado cria after"
  on public.afters for insert with check (auth.uid() = created_by);

drop policy if exists "participantes públicos" on public.after_participants;
drop policy if exists "usuário confirma presença" on public.after_participants;
drop policy if exists "usuário cancela presença" on public.after_participants;
create policy "participantes públicos"
  on public.after_participants for select using (true);
create policy "usuário confirma presença"
  on public.after_participants for insert with check (auth.uid() = user_id);
create policy "usuário cancela presença"
  on public.after_participants for delete using (auth.uid() = user_id);

-- Auditoria rápida: tabelas public sem RLS (deve retornar 0 linhas)
-- select * from pg_tables where schemaname = 'public' and not rowsecurity;
