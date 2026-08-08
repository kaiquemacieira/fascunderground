# CRICRI React — app estilo Threads

Frontend moderno do CRICRI. Backend: mesmo Supabase do vanilla.

## Status da migração

| # | Etapa | Status |
|---|--------|--------|
| 1 | Scaffold Vite + React + TS | ✅ |
| 2 | Design system (CRICRI + Threads) | ✅ |
| 3 | Shell (BottomNav, Header, rotas) | ✅ |
| 4 | Feed + PostCard | ✅ |
| 5 | Páginas base | ✅ |
| 6 | **Auth** (e-mail/senha + Google) | ✅ |
| 7 | **Publicar post real** (Supabase) | ✅ |
| 8 | Likes / comentários | próximo |
| 9 | Mapa / spots | depois |
| 10 | Tamagotchi / Meow / PWA | depois |

## Rodar (leve — ~150–250 MB com node_modules)

```bash
cd cricri-react
npm install
npm run dev
```

Abre `http://localhost:5173`.

### Espaço em disco (seu PC com 10 GB)
- Só o código-fonte: poucos MB
- Com `node_modules`: tipicamente **150–250 MB** (React + Vite + Supabase)
- Não precisa manter o vanilla + React instalados ao mesmo tempo se estiver apertado

Se faltar espaço: `rm -rf node_modules` quando não estiver desenvolvendo.

## Auth (igual ao vanilla)

- E-mail + senha (criar conta / entrar)
- Google OAuth (redirect para `/perfil`)
- Dashboard Supabase: Email ON, Google ON
- Redirect URLs: `http://localhost:5173/perfil` (+ URL de produção)

## Estrutura

```
src/
  components/   Avatar, PostCard, BottomNav, Header, Layout
  pages/        Feed, Explore, Notifications, Profile, Compose, Login
  lib/          supabase.ts, auth.tsx
  styles/       tokens.css, app.css
  types/
```

## Fluxo atual

1. Abre o app → Feed (mock se o banco estiver vazio; posts reais se existirem)
2. Perfil → Entrar / Criar conta
3. Compose (botão +) → publica no Supabase se logado
4. Sair no Perfil

## Relação com fascunderground/

O vanilla continua com mapa, tama, geo, a11y avançado, etc.
Este app é o **shell social**. Portamos feature por feature.
