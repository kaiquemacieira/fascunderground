# Monitor de falhas de sincronização

## API
```js
CricriSyncMonitor.summary()
CricriSyncMonitor.list()
CricriSyncMonitor.clear()
CricriSyncMonitor.onFailure((entry) => console.log(entry))

CricriPeriodicSync.status() // inclui failures
CricriPeriodicSync.failures()
```

## Evento
```js
window.addEventListener('cricri:sync-failure', (e) => {
  console.log(e.detail);
});
```

## Fontes
- `periodic-sync` — registro/handlers
- `service-worker` — periodicsync / background sync
- `tamagotchi` — cloud save
- `network` — offline

Persistência: `localStorage` chave `cricri-sync-failures-v1` (últimas 40).
