# Geolocalização offline (PWA)

## Limite importante
O **Service Worker não acessa** `navigator.geolocation`.  
Offline = **último fix persistido no client** (`localStorage`), não um GPS novo sem rádio/GNSS.

## Camadas
| Qualidade | Idade | Uso |
|-----------|-------|-----|
| **fresh** | ≤ 3 min | Igual GPS ao vivo (proximidade, geofence) |
| **recent** | ≤ 6 h | Mapa offline, “você estava aqui” |
| **stale** | ≤ 24 h | Só referência visual com aviso |
| **expired** | > 24 h | Descarta → centro histórico SC |

## Fluxo
1. Cada fix bom → `fascGeoOffline.save()` + evento `projano:position`
2. Boot / offline → `load()` restaura `lastPos`
3. `refPoint()` usa `resolve(live)` → gps → cache → centro SC
4. UI: `ref: última posição (offline)` + status `offline · cache`
5. Volta online → `startWatching()` de novo

## API
```js
fascGeoOffline.save(pos)
fascGeoOffline.load()
fascGeoOffline.resolve(livePos)
fascGeoOffline.statusLabel(resolved)
projanoMap.getResolvedPosition()
```

## O que NÃO funciona offline
- Tiles do Carto/OSM (precisam de rede; shell HTML/CSS/JS sim)
- Heatmap em tempo real / presence no Supabase
- Novo fix GNSS se o SO negar ou o hardware estiver off

## LGPD
Só a **última posição** fica no aparelho. Não enviamos cache offline a terceiros.
Limpar: `localStorage.removeItem('cricri_geo_last_v1')`.

### Encontro de bichinhos (P2/P3.1)
Quando o mapa está ativo e você entra no geofence de um spot, o app pode registrar **apenas o id do spot** (não lat/lng contínuos) em `spot_presence`, para avisar se um **amigo com conexão mútua** está no mesmo spot ao mesmo tempo.

- **Só conexões mútuas** (você adicionou e a pessoa te adicionou). Desconhecidos **nunca** veem sua presença.
- Aviso: “Seu CRICRI encontrou o de [nome] em [spot]”.
- Sem geoloc / sem mapa aberto → sem presença compartilhada.
- Limpar presença: sair do spot (evento `leave`) ou `set_my_spot_presence(null)`.
