# Caixinha anônima — FASC+

## Expiração com o festival (P1.6)

- Corte: **mesmo `EVENT_END` do tamagotchi** — `2026-11-23T00:00:00-03:00` (`FASC_CONFIG.eventEndIso` / `window.fascEventEnded()`).
- Após essa data a caixinha **não lista** recados (filtro na leitura + `.lt('created_at', eventEndIso)`).
- Sem delete físico nesta fase; limpeza pode ser job posterior.
- Novos envios também bloqueados no client após o fim do evento.

## SQL (obrigatório uma vez)

No Dashboard → SQL Editor, rode:

`supabase/STEP_C_inbox_anon.sql`

## Como usar

1. Usuário loga, preenche **handle** no perfil e salva.
2. Compartilha: `profile.html?u=SEUHANDLE`
3. Outra pessoa logada abre esse link e envia recado (anônimo por padrão).
4. O dono vê em **Minha caixinha**, responde ou oculta.

## Regras

- Só **autenticado** envia (anti-spam básico); pode marcar anônimo.
- Não envia para si mesmo.
- Só o dono lê a inbox (RLS).
- Respostas ficam na mesma linha (`answer` + `answered_at`).
- View `inbox_anon_public` expõe só itens já respondidos e não ocultos (fase 2: mural público).

## Privacidade

Anonimato = o **dono não vê** o `from_profile_id` quando `is_anonymous = true`.
O backend ainda exige login para rate-limit futuro por usuário.

## Mural de gentilezas (P1.3)

- Coluna `is_public boolean default false` em `inbox_anon`.
- Dono marca **um** recado por vez: `update { is_public: true } where id = …` (RLS: só a própria caixinha).
- Leitura pública: RPC `get_kindness_wall` / `get_kindness_wall_by_handle` — **nunca** retorna `from_profile_id`.
- UI do mural sempre mostra remetente como **anônimo**.
- SQL: `supabase/STEP_N_inbox_is_public.sql`.
