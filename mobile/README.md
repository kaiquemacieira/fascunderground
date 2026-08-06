# CRICRI Mapa · Expo (sem Google Maps)

Mapa **gratuito** com **Leaflet + OpenStreetMap/CARTO** dentro de um WebView.
Não usa Google Maps SDK → sem API key paga, sem mapa branco por cobrança.

## Rodar

```bash
cd mobile
npm install
npx expo start
```

## Fluxo Rolê/After

1. **Marcar Rolê/After**
2. Toque no mapa (tiles escuros OSM)
3. Formulário abre com as coordenadas
4. **Solicitar** → Supabase + e-mail admin

## Dependências

- `react-native-webview` + Leaflet CDN
- `expo-location` (GPS opcional)
- Supabase (spots + role_requests)

**Não** inclui `react-native-maps` nem Google API Key.
