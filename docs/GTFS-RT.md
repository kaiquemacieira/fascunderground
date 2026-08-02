# GTFS-RT · CRICRI (São Cristóvão / Aracaju)

## Situação

A SMTT e o CTM da Grande Aracaju **não publicam** feed GTFS Schedule nem GTFS-Realtime aberto.
O app usa modelo local por padrão e ativa GTFS-RT quando houver URL.

## Config (`js/config.js`)

```js
transitRtUrl: '',           // JSON { delays: { "031": 3 } }
gtfsRtTripUpdatesUrl: '',   // Trip Updates JSON
gtfsRtVehicleUrl: ''        // Vehicle Positions JSON
```

## Formato delays
```json
{ "delays": { "031": 3, "307": -1 } }
```

## UI
- **previsão ao vivo** → modelo local
- **GTFS-RT ao vivo** → feed trip updates
- **API de atrasos** → JSON simples
