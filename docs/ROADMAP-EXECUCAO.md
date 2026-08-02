# Ordem de execução (CEO + CTO)

## Agora (esta entrega) — P0 feito no repo

- [x] Escopo MVP travado: Feed + Mapa + Afters
- [x] Schema SQL normalizado
- [x] RLS completo (+ scraps)
- [x] Trigger de profile no signup
- [x] Storage bucket policies
- [x] Seed de spots/afters (dev)
- [x] Delegação de eventos nos scraps
- [x] escapeHtml no composer de scrap

## Sua ação (humano) — bloqueante

1. Criar projetos Supabase `fasc-dev` e `fasc-prod` (sa-east-1)
2. Rodar migrations 001→005 **só no dev**
3. Ativar Auth Email (magic link)
4. Mandar de volta: `SUPABASE_URL` + `ANON_KEY` do **dev**

## Próxima sessão de código (quando tiver as keys)

1. `js/supabase-client.js` (ES module) com auth session
2. Substituir spots do `mock.js` por `from('spots').select()` + realtime
3. Feed: listar posts reais
4. Scraps → tabela `scraps`
5. Afters UI mínima

## Explicitamente NÃO fazer agora

- Marketplace schema
- IA
- PWA completa (só checklist)
- Reescrever o front inteiro em React
