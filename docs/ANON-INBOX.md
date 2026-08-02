# Caixinha anônima — FASC+

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
