# Confirmação de e-mail — Supabase (CRICRI)

A confirmação de e-mail **não se ativa só no front**. Configure no painel do projeto.

## 1. Ativar confirmação

1. Abra [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Projeto **bcnbwshwehofncfkdnra** (ou o seu)
3. **Authentication** → **Providers** → **Email**
4. Ative **Confirm email** (Enable email confirmations)
5. Salve

Com isso:
- `signUp` cria o usuário
- **não** devolve `session` até o usuário clicar no link do e-mail
- o app mostra: "Enviamos um link de confirmação…"

## 2. URL de redirecionamento

**Authentication** → **URL Configuration**

- **Site URL:** `http://127.0.0.1:5500/` (dev) ou a URL de produção
- **Redirect URLs** (adicione todas que usar):
  - `http://127.0.0.1:5500/profile.html`
  - `http://127.0.0.1:5500/login.html`
  - `http://localhost:5500/profile.html`
  - `http://localhost:5500/login.html`
  - URL de produção + `/profile.html` e `/login.html`

O front envia `emailRedirectTo` → `profile.html`.

## 3. Template do e-mail (opcional)

**Authentication** → **Email Templates** → **Confirm signup**

Sugestão de corpo:

```
Confirme sua conta CRICRI

Olá,

Clique no link para ativar sua conta no festival de São Cristóvão:

{{ .ConfirmationURL }}

Se você não criou conta, ignore este e-mail.
```

## 4. SMTP (produção)

No plano free o e-mail sai pelo Supabase e pode cair em spam.
Para produção: **Project Settings** → **Authentication** → **SMTP Settings**
(SendGrid, Resend, Amazon SES, etc.)

## 5. Testar

1. Criar conta com e-mail real
2. Abrir a caixa de entrada (e spam)
3. Clicar no link
4. Voltar em **Entrar** com a mesma senha

## 6. Desativar confirmação (só dev)

Se quiser testar sem e-mail:

**Authentication** → **Providers** → **Email** → desligar **Confirm email**

Aí o `signUp` já devolve `session` e o usuário entra na hora.

## 7. E-mail já existe

O app detecta:
- erro explícito do GoTrue (`user_already_exists` / "already registered")
- resposta "fantasma" com `identities: []` (proteção anti-enumeração)

Mensagem ao usuário:

> Este e-mail já existe. Use outro e-mail ou entre na aba Entrar.
