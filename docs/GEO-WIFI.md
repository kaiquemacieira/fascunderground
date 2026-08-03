# Geolocalização por WiFi / rede

## O que o CRICRI faz
O app **não escaneia redes WiFi** (SSID/BSSID). Navegadores bloqueiam isso por privacidade.

A posição “por WiFi” vem do **sistema operacional** (Google Location Services, Apple Location, etc.), quando o app pede:

```js
navigator.geolocation.watchPosition(success, error, {
  enableHighAccuracy: false,  // ← prefere WiFi + celular
  maximumAge: 45000,
  timeout: 12000
});
```

## Modos no mapa

| Perfil | `enableHighAccuracy` | Fonte típica | Quando |
|--------|----------------------|--------------|--------|
| **eco** | `false` | WiFi + rede celular | Padrão, mapa aberto |
| **mid** | `false` | Rede (mais frequente) | Perto de um spot |
| **high** | `true` | GNSS (GPS) | Botão **GPS**, dentro da geofence, “centralizar em mim” |

Chip no header do mapa: `±40 m · WiFi/rede` ou `±12 m · GPS`.

## Por que WiFi-first no festival
- Centro histórico denso → WiFi/células costumam bastar (±30–80 m)
- Menos bateria em Android barato / 4G instável
- Fix mais rápido que GPS frio
- Geofence fina (~90–120 m) sobe para GPS só perto do spot

## Offline
Ver `GEO-OFFLINE.md`: sem rádio, usa **último fix** salvo no aparelho (que pode ter sido WiFi ou GPS).

## API
```js
projanoMap.getProfile()        // 'eco' | 'mid' | 'high'
projanoMap.getLocationMode()   // 'WiFi/rede' | 'rede' | 'GPS'
projanoMap.preferNetwork()     // volta para eco
projanoMap.startWatching()     // rede
// precise:
projanoMap.startWatching // via opts.precise no código interno / botão GPS
```

## LGPD
Só pedimos posição com mapa visível. Não lemos lista de WiFi. Último fix fica no `localStorage` do aparelho (`cricri_geo_last_v1`).

### Presença em spot entre amigos (P2/P3.1)
Com geoloc ativa no mapa, ao entrar na zona de um spot o CRICRI pode informar **somente amigos mútuos** que vocês estão no mesmo lugar (“Seu CRICRI encontrou o de X em [spot]”).

Isso **não** publica localização para o feed, mural ou perfis públicos.
Não há match com quem não está na sua lista **e** não te tem de volta.
Detalhes: tabela `spot_presence` + RPC `get_cricri_meets` (SECURITY DEFINER, filtro de mutualidade). Ver `docs/CRICRI-MEET.md`.
