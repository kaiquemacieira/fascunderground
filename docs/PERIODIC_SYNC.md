# Periodic Background Sync (CRICRI)

## Tags
| Tag | Intervalo mín. | Função |
|-----|----------------|--------|
| `cricri-tick` | 15 min | Tamagotchi tick + presença |
| `cricri-data` | 30 min | Revalida shell + refresh feed/programação |

## Cliente
`js/periodic-sync.js` registra as tags e escuta `CRICRI_PERIODIC_SYNC`.

```js
CricriPeriodicSync.status()
CricriPeriodicSync.runNow('cricri-tick')
```

## Requisitos (Chrome)
- HTTPS
- Site engajado / PWA instalada aumenta chance de disparo
- Sem suporte → fallback com `setInterval` só com aba visível

## SW
`periodicsync` → `postMessage` aos clients + revalidate cache em `cricri-data`.
