/**
 * HTML Leaflet + tiles CARTO/OSM (grátis, sem Google)
 * Comunicação com React Native via window.ReactNativeWebView.postMessage
 */
export function buildMapHtml({ spots = [], pois = [], center = [-11.0152, -37.2052], zoom = 16 }) {
  const spotsJson = JSON.stringify(spots);
  const poisJson = JSON.stringify(pois);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#0c0a08}
    .leaflet-container{background:#0c0a08;font-family:system-ui,sans-serif}
    .spot-dot{width:14px;height:14px;border-radius:50%;background:#e33d6b;border:2px solid #fff;box-shadow:0 0 0 3px rgba(227,61,107,.35)}
    .poi-hosp{width:12px;height:12px;border-radius:3px;background:#d49a2c;border:2px solid #fff}
    .poi-gastro{width:12px;height:12px;border-radius:3px;background:#3d8a9c;border:2px solid #fff}
    .pick-pin{width:16px;height:16px;border-radius:50%;background:#ff00cc;border:2px solid #fff;box-shadow:0 0 12px rgba(255,0,204,.6)}
    .leaflet-control-attribution{font-size:9px;background:rgba(0,0,0,.55)!important;color:#a89f90!important}
    .leaflet-control-attribution a{color:#cfc5b4!important}
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var spots = ${spotsJson};
  var pois = ${poisJson};
  var pickMode = false;
  var pickMarker = null;
  var layerOn = { spots: true, hospedagem: true, gastronomia: true };
  var spotLayer = L.layerGroup();
  var hospLayer = L.layerGroup();
  var gastroLayer = L.layerGroup();

  function post(obj){
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    } catch(e) {}
  }

  var map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([${center[0]}, ${center[1]}], ${zoom});

  // Tiles escuros gratuitos (CARTO / OSM) — sem Google, sem key
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  function icon(cls){
    return L.divIcon({
      className: '',
      html: '<div class="'+cls+'"></div>',
      iconSize: [16,16],
      iconAnchor: [8,8]
    });
  }

  spots.forEach(function(s){
    if (s.lat == null || s.lng == null) return;
    var m = L.marker([s.lat, s.lng], { icon: icon('spot-dot') })
      .bindPopup('<b>'+s.name+'</b><br>'+(s.status||'Spot CRICRI'));
    m.on('click', function(e){
      if (pickMode) {
        L.DomEvent.stopPropagation(e);
        placePick(s.lat, s.lng);
      } else {
        post({ type: 'spot', id: s.id, name: s.name, status: s.status, lat: s.lat, lng: s.lng });
      }
    });
    spotLayer.addLayer(m);
    L.circle([s.lat, s.lng], {
      radius: s.radius || 90,
      color: '#e33d6b',
      weight: 1,
      fillColor: '#e33d6b',
      fillOpacity: 0.08,
      interactive: false
    }).addTo(spotLayer);
  });
  spotLayer.addTo(map);

  pois.forEach(function(p){
    if (p.lat == null || p.lng == null) return;
    var cls = p.layer === 'hospedagem' ? 'poi-hosp' : 'poi-gastro';
    var m = L.marker([p.lat, p.lng], { icon: icon(cls) })
      .bindPopup('<b>'+p.name+'</b><br>'+(p.desc||''));
    m.on('click', function(e){
      if (pickMode) {
        L.DomEvent.stopPropagation(e);
        placePick(p.lat, p.lng);
      }
    });
    if (p.layer === 'hospedagem') hospLayer.addLayer(m);
    else gastroLayer.addLayer(m);
  });
  hospLayer.addTo(map);
  gastroLayer.addTo(map);

  function placePick(lat, lng){
    if (pickMarker) map.removeLayer(pickMarker);
    pickMarker = L.circleMarker([lat, lng], {
      radius: 10, color: '#ff00cc', fillColor: '#ff00cc', fillOpacity: 0.9, weight: 2
    }).addTo(map);
    pickMode = false;
    post({ type: 'pick', lat: lat, lng: lng });
  }

  map.on('click', function(e){
    if (!pickMode) return;
    placePick(e.latlng.lat, e.latlng.lng);
  });

  // API para o React Native
  window.CricriMap = {
    setPickMode: function(on){
      pickMode = !!on;
      map.getContainer().style.cursor = on ? 'crosshair' : '';
      post({ type: 'pickMode', on: pickMode });
    },
    setLayers: function(cfg){
      try { cfg = typeof cfg === 'string' ? JSON.parse(cfg) : cfg; } catch(e){ return; }
      if (cfg.spots) map.addLayer(spotLayer); else map.removeLayer(spotLayer);
      if (cfg.hospedagem) map.addLayer(hospLayer); else map.removeLayer(hospLayer);
      if (cfg.gastronomia) map.addLayer(gastroLayer); else map.removeLayer(gastroLayer);
    },
    centerOn: function(lat, lng, z){
      map.setView([lat, lng], z || 16);
    },
    invalidate: function(){ map.invalidateSize(true); }
  };

  post({ type: 'ready' });
  setTimeout(function(){ map.invalidateSize(true); }, 300);
})();
</script>
</body>
</html>`;
}
