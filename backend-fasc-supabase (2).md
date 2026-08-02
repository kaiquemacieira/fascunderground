# FASC+ — Revisão de produto, código e guia técnico de backend (Supabase)

Como usar este documento: cada etapa tem (1) o que decidir, (2) o SQL/config quando já dá pra cravar, e (3) um **prompt pronto pra colar numa IA** (Claude, ChatGPT, Claude Code) pra gerar o resto. Siga a ordem — cada etapa depende da anterior. Não pule pra "Etapa 5: integrar no front" antes de fechar schema + RLS, ou você vai reescrever tudo depois.

---

## Parte 1 — Decisões de produto/escopo

### Corte de escopo do MVP
O plano original ("livro do produto") tinha 5-6 verticais completas: Feed, Mapa, Marketplace, Minha Casa, Afters, IA. Isso não fecha a tempo de um evento com data fixa, e cada vertical nova é superfície de bug, moderação de conteúdo e suporte durante o evento ao vivo.

**Recomendação:** MVP = **Feed + Mapa + Afters**. São os três loops que realmente servem quem está andando pela rua durante o festival. Marketplace e IA ficam de fora — adicionar depois é fácil, tirar depois de lançado (com usuário dependendo da feature) é doloroso.

### Sobre o "livro do produto" de 80-120 páginas
Documentar 22 capítulos antes de validar qualquer coisa é teatro de documentação. O próprio plano tem uma inconsistência reveladora: "Fase 1 — escolher nome definitivo" ainda nem aconteceu segundo o roadmap, mas o app já se chama **FASC+** no código que já está funcionando. O plano documenta um mundo que não bate com o que foi construído.

**Recomendação:** trocar o livro por:
- 1 PRD enxuto (10-15 páginas, não 100)
- `README.md` + `ARCHITECTURE.md` técnicos
- O código como fonte de verdade, não o markdown

### Acessibilidade não é "Sprint 8"
O roadmap original colocava acessibilidade como a última sprint, antes do lançamento — mas o código já entrega isso desde a base (CSS com tokens fluidos, ARIA, roving tabs, focus trap, skip link, `a11y-check.py` rodando em CI). Trate a11y como requisito contínuo em toda sprint, não como etapa final que "acontece se sobrar tempo". Essa rigor já existente é um diferencial real do projeto — não perder isso na hora de acelerar.

---

## Parte 2 — Revisão do código atual (`script.js` / `mock.js`)

Pontos levantados na leitura do código, a resolver **antes ou durante** a integração com o Supabase:

- **Listeners estáticos, não delegados.** Trechos como `document.querySelectorAll('.market-card').forEach(card => card.addEventListener(...))` só vinculam eventos aos elementos que já existem no HTML no carregamento. Funciona hoje porque o HTML é mock/estático. No dia em que o feed/marketplace passar a ser renderizado dinamicamente com dados do Supabase, elementos novos **não terão listener nenhum**. Precisa virar delegação de evento (listener no container pai, checando `event.target.closest(...)`). Tratado com prompt específico na Etapa 6 abaixo.
- **`mailbox` em memória (`const mailbox = {}`)** para os "scraps": sem persistência, confirmado pelo próprio comentário no código. Mensagens somem ao dar refresh — precisa virar tabela no banco antes de produção.
- **`innerHTML` com interpolação de template string** (ex: `composer.innerHTML = ... ${user} ...`). Hoje é seguro porque `user` vem de `dataset.user` de HTML estático. Mas é o mesmo padrão que, se `user` (ou qualquer outro campo) passar a vir de dado gerado por outro usuário — nome de perfil, texto de post — abre **XSS**. O projeto já tem uma função `escapeHtml()` implementada na busca; precisa aplicar esse mesmo padrão em todo lugar que hidrata HTML com dado dinâmico (feed, scraps, marketplace) antes de conectar dados reais.
- **Zero módulos/namespace**: tudo em `const`/`function` no escopo global do arquivo. Funciona em ~1000 linhas, mas vira dívida rápido quando entrar client Supabase, estado de auth e subscriptions realtime. Vale separar em módulos ES (`type="module"`) antes de crescer mais.
- **PWA citada mas não implementada.** O plano menciona PWA como tecnologia, mas não há `manifest.json` nem service worker no projeto atual. Isso é crítico pro contexto de uso: festival de rua = conectividade instável. Sem isso, mapa e feed simplesmente não funcionam no momento em que mais importam — ver checklist de offline na Etapa 8.

---

## Parte 3 — Guia técnico: construindo o backend com Supabase (passo a passo, com IA)

## Etapa 0 — Antes de abrir o Supabase

Decisões que precisam estar fechadas primeiro (evita retrabalho):

- **Nome/slug do projeto** (mesmo que provisório) — usado em URLs, buckets, etc.
- **Ambientes**: você vai precisar de no mínimo 2 projetos Supabase separados — `fasc-dev` e `fasc-prod`. Nunca desenvolva direto em prod.
- **Autenticação**: recomendo **magic link por e-mail** ou **OTP por telefone/SMS** — público de festival não quer criar senha. Decida agora porque muda o schema de `users`.
- **Escopo do MVP** (do que já conversamos): **Feed + Mapa + Afters** primeiro. Marketplace e IA ficam de fora do schema inicial — adicionar depois é fácil, tirar depois de lançado é doloroso.

**Prompt pra IA (opcional, pra revisar escopo):**
```
Estou construindo o backend de um app de festival de rua (FASC+) no Supabase.
MVP = Feed (posts/comentários/likes), Mapa (spots com geofencing), Afters (eventos).
Fora do MVP por agora: Marketplace, IA, Minha Casa.
Revise se esse corte de escopo faz sentido pra um app usado durante um evento de poucos dias,
com usuários majoritariamente no celular e conectividade instável na rua.
```

---

## Etapa 1 — Criar o projeto e decidir a região

1. Crie o projeto em supabase.com (região: `sa-east-1` / São Paulo, se disponível — latência importa pro pessoal na rua usando 4G).
2. Guarde `SUPABASE_URL` e `SUPABASE_ANON_KEY` (nunca a `service_role` key no frontend).
3. Ative a extensão `pg_trgm` no SQL editor (vai ajudar na busca por texto depois, ex: nome de lugares/pessoas):
```sql
create extension if not exists pg_trgm;
```

---

## Etapa 2 — Schema normalizado (corrige os problemas do plano original)

O modelo do "livro do produto" tinha `owner` solto sem FK e `likes`/`comments` como array dentro do post — isso não escala e não garante "1 like por pessoa". Aqui vai a versão corrigida, só com as tabelas do MVP.

```sql
-- USERS: o Supabase Auth já cria auth.users. Isso aqui é o perfil público.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  photo_url text,
  bio text,
  city text default 'São Cristóvão',
  created_at timestamptz default now()
);

-- POSTS (feed)
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz default now()
);

-- imagens de um post (0..N) — tabela separada, não array
create table public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  position smallint default 0
);

-- LIKES: 1 like por usuário por post, garantido por unique constraint
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- COMMENTS
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 300),
  created_at timestamptz default now()
);

-- SPOTS (mapa) — o "geofencing" do mock.js vira dado real
create table public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_m integer default 90,
  status text default 'sem info', -- ex: 'rolando agora', 'terminou'
  updated_at timestamptz default now()
);

-- AFTERS (eventos)
create table public.afters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  spot_id uuid references public.spots(id),
  category text,
  starts_at timestamptz not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.after_participants (
  after_id uuid not null references public.afters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (after_id, user_id)
);

-- índices essenciais
create index on public.posts (created_at desc);
create index on public.post_comments (post_id);
create index on public.afters (starts_at);
```

**Prompt pra IA:**
```
Aqui está o schema Postgres/Supabase do meu app [cole o SQL acima].
1. Revise se falta algum índice para as queries mais comuns: feed paginado por data,
   contagem de likes por post, spots ativos no mapa.
2. Sugira se `post_images` deveria ter um limite de itens via constraint ou trigger.
3. Não adicione tabelas novas fora do escopo que passei — só revise o que existe.
```

---

## Etapa 3 — Row Level Security (RLS)

Isso é o que faltava completamente no plano original — sem RLS, qualquer pessoa com a `anon key` (que fica exposta no frontend) pode ler/escrever qualquer linha.

```sql
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.spots enable row level security;
alter table public.afters enable row level security;
alter table public.after_participants enable row level security;

-- profiles: todo mundo lê, só o dono edita o próprio
create policy "profiles são públicos" on public.profiles for select using (true);
create policy "usuário edita o próprio perfil" on public.profiles for update using (auth.uid() = id);

-- posts: leitura pública, só autor logado cria, só autor apaga
create policy "posts são públicos" on public.posts for select using (true);
create policy "usuário logado cria post" on public.posts for insert with check (auth.uid() = author_id);
create policy "autor apaga o próprio post" on public.posts for delete using (auth.uid() = author_id);

-- likes: leitura pública, só o próprio usuário insere/remove seu like
create policy "likes públicos" on public.post_likes for select using (true);
create policy "usuário cria o próprio like" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "usuário remove o próprio like" on public.post_likes for delete using (auth.uid() = user_id);

-- comments: leitura pública, autor cria e apaga o próprio
create policy "comments públicos" on public.post_comments for select using (true);
create policy "usuário logado comenta" on public.post_comments for insert with check (auth.uid() = author_id);
create policy "autor apaga o próprio comentário" on public.post_comments for delete using (auth.uid() = author_id);

-- spots: leitura pública, escrita só via service_role (painel admin do evento, não pelo app)
create policy "spots são públicos" on public.spots for select using (true);

-- afters: leitura pública, criação por usuário logado
create policy "afters são públicos" on public.afters for select using (true);
create policy "usuário logado cria after" on public.afters for insert with check (auth.uid() = created_by);

create policy "participantes públicos" on public.after_participants for select using (true);
create policy "usuário confirma presença" on public.after_participants for insert with check (auth.uid() = user_id);
create policy "usuário cancela presença" on public.after_participants for delete using (auth.uid() = user_id);
```

**Prompt pra IA:**
```
Tenho essas tabelas com RLS habilitado [cole as policies acima].
Quero que você simule 3 cenários de ataque comum (usuário tentando editar post de outro,
tentando ler dados sem estar logado, tentando burlar o unique constraint de likes) e me diga
se as policies atuais bloqueiam cada um. Aponte qualquer policy que esteja liberal demais.
```

---

## Etapa 4 — Autenticação

1. No painel Supabase → Authentication → Providers, ative **Email OTP** (magic link) ou **Phone** conforme decidido na Etapa 0.
2. Crie um trigger que popula `profiles` automaticamente quando um usuário se cadastra:

```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'novo usuário'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Prompt pra IA:**
```
Estou usando Supabase Auth com [magic link / OTP telefone]. Preciso do fluxo completo em
JavaScript vanilla (sem framework) para: (1) tela de login pedindo email/telefone,
(2) tratamento do redirect/callback, (3) checar se o usuário está logado ao carregar a página,
(4) botão de logout. Estou integrando isso num arquivo script.js existente que já manipula
DOM diretamente com querySelector — mantenha esse estilo, não sugira React.
```

---

## Etapa 5 — Storage (fotos de posts/perfil)

```sql
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true);
```
Policy de upload (só usuário logado sobe, em pasta com seu próprio `uid`):
```sql
create policy "usuário sobe suas próprias imagens"
on storage.objects for insert
with check (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
```

**Prompt pra IA:**
```
Preciso do fluxo de upload de imagem pro Supabase Storage em JS vanilla: usuário seleciona
arquivo, eu comprimo/redimensiono no client antes de subir (o projeto já tem um script de
conversão pra AVIF em scripts/encode-avif.sh, mas isso roda em build time — preciso da versão
client-side pra upload em tempo real), subo pro bucket 'post-images' na pasta do uid do
usuário, e uso a função createResponsivePicture() que já existe no script.js pra exibir.
```

---

## Etapa 6 — Substituir o mock pelo client real

Isso troca `mock.js` (dados hardcoded) por chamadas reais, **mantendo a mesma "forma" de dado** que o front já espera — assim você não reescreve a UI, só a fonte de dados.

**Prompt pra IA (o mais importante desta etapa):**
```
Aqui está meu mock.js atual [cole o arquivo]. Ele gera os "spots" do mapa com dados
hardcoded num array. Quero substituir isso por uma busca real no Supabase (tabela spots),
mantendo exatamente a mesma estrutura de objeto que o Leaflet já consome (id, name, lat, lng,
radius, status), pra eu não precisar tocar no resto da lógica de renderização do mapa.
Adicione também uma subscription realtime (supabase.channel) pra atualizar o status de um
spot ('rolando agora' → 'terminou') sem precisar dar refresh na página.
```

Faça essa mesma troca, um arquivo/seção por vez, pra: feed (`posts` + `post_likes` + `post_comments`), afters, spots. **Não peça pra IA reescrever o arquivo inteiro de uma vez** — vá por função, testando cada troca isoladamente.

⚠️ Antes desta etapa, resolva o problema de **listeners estáticos** que identifiquei no código: `document.querySelectorAll(...).forEach(el => el.addEventListener(...))` não vai funcionar em elementos renderizados dinamicamente pelo Supabase. Prompt separado pra isso:
```
No meu script.js, vários listeners são adicionados assim: 
document.querySelectorAll('.market-card').forEach(card => card.addEventListener(...)).
Isso só funciona pra elementos que já existem no HTML no load. Vou passar a renderizar
esses elementos dinamicamente com dados do Supabase. Reescreva esses trechos usando
delegação de evento (listener no container pai, checando event.target.closest()), mantendo
o comportamento idêntico ao atual.
```

---

## Etapa 7 — Seed de dados de desenvolvimento

Nunca teste contra prod vazio nem contra prod com dado real de usuário.

**Prompt pra IA:**
```
Gere um script SQL de seed para o ambiente de dev do Supabase: 15 profiles fake, 30 posts
distribuídos entre eles, likes e comentários aleatórios, 5 spots com coordenadas próximas a
[-22.9005, -43.2210] (São Cristóvão), e 4 afters com horários nas próximas 48h. Use nomes e
textos em português, no tom informal do app (linguagem de rua, não corporativa).
```

---

## Etapa 8 — Antes de lançar (checklist)

- [ ] `service_role key` nunca aparece em nenhum arquivo do frontend/git
- [ ] RLS habilitado em **todas** as tabelas (rode `select * from pg_tables where rowsecurity = false and schemaname = 'public';` pra conferir)
- [ ] Rate limit básico: Supabase tem rate limit por IP no Auth por padrão — confirme que está ativo
- [ ] Política de moderação mínima: pelo menos um jeito de um admin apagar post/comentário abusivo (via painel Supabase mesmo, no MVP)
- [ ] Aviso de coleta de dados de localização (LGPD) antes de pedir permissão de geoloc no navegador
- [ ] Ambiente `prod` separado de `dev`, com variáveis de ambiente diferentes
- [ ] Teste do fluxo offline: o que a UI mostra quando não há internet (crucial pro contexto de festival de rua)

---

## Ordem recomendada de execução

1. Etapa 1 (projeto) → 2 (schema) → 3 (RLS) *sem pular RLS, nem "por enquanto"*
2. Etapa 4 (auth) → 5 (storage)
3. Correção dos listeners estáticos (dentro da Etapa 6) **antes** de plugar dados reais
4. Etapa 6 (troca do mock, arquivo por arquivo) → 7 (seed) → 8 (checklist)
