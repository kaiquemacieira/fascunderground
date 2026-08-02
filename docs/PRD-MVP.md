# FASC+ — PRD MVP (travado)

**Status:** aprovado (CEO)  
**Evento-alvo:** Festival de Artes de São Cristóvão · 19–22/11/2026  
**Princípio:** menos superfície de bug durante o evento ao vivo.

## No MVP (ship)

| Vertical | Loop do usuário | Por quê |
|----------|-----------------|--------|
| **Feed / Mural** | ver o que tá rolando · scrap · status | presença social na rua |
| **Mapa** | spots + geofence + minha posição | orientação no território |
| **Afters** | ver / confirmar presença em afters | extensão natural do rolê |

## Fora do MVP (backlog pós-evento)

- Marketplace
- IA
- Minha Casa (perfil rico)
- PWA completa (manifest + SW) — **pré-req offline fica em checklist, não bloqueia schema**

## Auth

- **Magic link (e-mail)** no MVP
- OTP telefone: fase 2 se conversão de login for baixa

## Ambientes

| Projeto Supabase | Uso |
|------------------|-----|
| `fasc-dev` | desenvolvimento + seed |
| `fasc-prod` | evento real |

## Não negociáveis

1. RLS em **toda** tabela pública antes de qualquer front apontar pra prod
2. `service_role` **nunca** no frontend/git
3. A11y contínua (já no CI) — não “sprint final”
4. Código > documento de 100 páginas

## Critérios de pronto do MVP

- [ ] Usuário entra com magic link
- [ ] Feed lê posts reais (Supabase) com like/comment
- [ ] Mapa lê spots reais + realtime de status
- [ ] Afters listáveis + confirmar presença
- [ ] LGPD: aviso antes de geoloc
- [ ] Checklist Etapa 8 ok
