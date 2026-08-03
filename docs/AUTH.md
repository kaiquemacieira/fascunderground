# Auth FASC+ — e-mail/senha + Google

## Comportamento

| Ação | O que acontece |
|------|----------------|
| **Criar conta** | e-mail + senha (+ nome) → confirma **uma vez** no e-mail → depois só senha |
| **Entrar** | e-mail + senha (sessão fica salva no navegador) |
| **Google** | OAuth → volta para `profile.html` |

Não usa mais magic link a cada login.

## Dashboard Supabase (obrigatório)

### 1. E-mail
Authentication → Providers → **Email** → ON  
- “Confirm email” pode ficar ON (confirma 1x no cadastro).

### 2. Google
Authentication → Providers → **Google** → ON  
- Client ID e Client Secret do Google Cloud Console (OAuth 2.0).  
- Authorized redirect URI do Supabase (o painel mostra a URL).

### 3. URLs
Authentication → URL Configuration  
- Site URL: `http://localhost:4173` (ou seu host)  
- Redirect URLs: `http://localhost:4173/profile.html` (+ produção)

## Se a área do usuário “carregava pra sempre”
Corrigido: sessão com timeout, login visível na hora, `onChange` só uma vez, caixinha não trava se a tabela `inbox_anon` ainda não existir.


## Google redireciona para página branca / erro

Causas mais comuns (não é bug do HTML):

1. **Redirect URL não listada** em Authentication → URL Configuration → Redirect URLs.  
   Inclua exatamente: `https://SEU-DOMINIO/profile.html` e `http://localhost:PORTA/profile.html`.
2. **Site URL** diferente do host em que você está testando.
3. Provider **Google** desligado ou Client ID/Secret incorretos no Dashboard.
4. No Google Cloud Console, a Authorized redirect URI deve ser a do **Supabase**  
   (`https://bcnbwshwehofncfkdnra.supabase.co/auth/v1/callback`), não a do site.

O app usa `redirectTo = origin + /profile.html` e `detectSessionInUrl: true`.
Se ainda falhar, abra o console: `[CRICRI auth] Google redirectTo = …` e confira se essa URL está nas Redirect URLs.
