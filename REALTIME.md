# Sincronização em tempo real (CRICRI)

## Front

`js/realtime-sync.js` monta canais Supabase Realtime:

| Canal | Tabela | Efeito |
|-------|--------|--------|
| `cricri-tama-{uid}` | `tama_state` | Pet sincroniza entre aparelhos do mesmo login |
| `cricri-presence` | `profiles` | Amigos online atualizam sem esperar 60s |
| `cricri-inbox-{uid}` | `inbox_anon` | Novo Meow / reply recarrega a caixinha |
| spots | `spots` | Status do mapa ao vivo |

```js
CricriRealtime.status()
CricriRealtime.restart()
window.addEventListener('cricri:realtime', (e) => {
  console.log(e.detail.kind, e.detail.data)
})
```

Hooks: `__cricriApplyRemoteTama`, `__cricriLoadFriendsOnline`, `__cricriReloadInbox`, `cricriRefreshSpots`.

## Supabase

1. Rode `supabase/STEP_R_realtime.sql` no SQL Editor.
2. Ou: **Database → Replication** e habilite `spots`, `tama_state`, `profiles`, `inbox_anon`.

## Tamagotchi

1. Boot: `cloudLoad` + merge com local.
2. Cada ação: debounce 1,2s → upsert `tama_state`.
3. Realtime: outro device aplica estado remoto (ignora eco ~2,5s).

Offline: `localStorage`; ao voltar a rede, save + Realtime reaproximam.
