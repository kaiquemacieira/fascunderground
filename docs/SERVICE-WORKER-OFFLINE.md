# Service Worker offline · CRICRI

## Arquivos
- `sw.js` — shell + runtime + mapa + push
- `offline.html` — fallback de navegação
- `js/sw-register.js` — registro único

## Estratégias
| Tipo | Estratégia |
|------|------------|
| HTML (navigate) | network-first → cache → `offline.html` |
| JS/CSS/ícones | stale-while-revalidate |
| Tiles OSM | cache-first + `PRECACHE_MAP_AREA` |
| Supabase / APIs | network only (não cacheia) |

## Teste
1. Abra o site em HTTPS, espere o SW ativar (Application → Service Workers)
2. Navegue Home, Perfil, Tamagotchi
3. DevTools → Network → Offline
4. Recarregue: deve abrir shell cacheada ou `offline.html`
5. Em Explorar: **Baixar mapa offline** (se o botão existir)

## Atualizar cache
Basta mudar `SHELL` / `RUNTIME` version (`v3` → `v4`) no `sw.js` e fazer deploy.
