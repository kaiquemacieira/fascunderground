// js/mock.js — mapa + geoloc adaptativa + geofencing + bússola
console.log('Mock carregado');

(function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') {
    console.warn('Leaflet ou #map não encontrado');
    return;
  }

  const map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([-22.9005, -43.2210], 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // ---- Geofences ----
  const spots = [
    { id: 'bar-do-ze', name: 'Bar do Zé', lat: -22.8998, lng: -43.2185, status: 'rolando agora', radius: 90 },
    { id: 'largo-matriz', name: 'Largo da Matriz', lat: -22.9012, lng: -43.2230, status: '62% pronto', radius: 110 },
    { id: 'largo-rosario', name: 'Largo do Rosário', lat: -22.8985, lng: -43.2200, status: 'vai rolar às 23h', radius: 100 },
    { id: 'quintal-ana', name: 'Quintal da Ana', lat: -22.9020, lng: -43.2190, status: 'terminou', radius: 80 },
    { id: 'roda-bica', name: 'Roda da Bica', lat: -22.9000, lng: -43.2245, status: 'rolando agora', radius: 95 }
  ];

  const pinkIcon = L.divIcon({
    className: 'projano-marker',
    html: '<div class="spot-dot"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const activeIcon = L.divIcon({
    className: 'projano-marker active',
    html: '<div class="spot-dot active"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  const spotLayers = {};

  spots.forEach((spot) => {
    const marker = L.marker([spot.lat, spot.lng], { icon: pinkIcon })
      .addTo(map)
      .bindPopup(
        `<strong>${spot.name}</strong><br>` +
        `<span style="opacity:0.8">${spot.status}</span><br>` +
        `<span style="opacity:0.55;font-size:0.75em">zona · ${spot.radius} m</span>`
      );

    const fence = L.circle([spot.lat, spot.lng], {
      radius: spot.radius,
      color: '#E8467C',
      weight: 1,
      dashArray: '4 6',
      fillColor: '#E8467C',
      fillOpacity: 0.06,
      opacity: 0.35,
      interactive: false
    }).addTo(map);

    spotLayers[spot.id] = { marker, fence, spot };
  });

  // ---- Perfis GPS ----
  const GEO_PROFILES = {
    eco:  { enableHighAccuracy: false, timeout: 12000, maximumAge: 40000 },
    mid:  { enableHighAccuracy: true,  timeout: 10000, maximumAge: 12000 },
    high: { enableHighAccuracy: true,  timeout: 8000,  maximumAge: 2000 }
  };

  const APPROACH_BUFFER_M = 220;
  const POOR_ACCURACY_M = 70;
  const OUTLIER_JUMP_M = 180;
  const MIN_UPDATE_MS = 7000;
  const MIN_MOVE_M = 18;
  const FENCE_CHECK_MS = 4000;
  const SAMPLE_WINDOW = 5;
  const PRECISE_BURST_MS = 25000;

  // ---- Bússola + fusão giroscópio ----
  // Filtro complementar: gyro (alta freq.) + magnetômetro (referência absoluta)
  const FUSION_GYRO_WEIGHT = 0.92;  // quanto confiar no gyro entre amostras mag
  const MAG_TRUST_BASE = 0.12;      // quanto puxar para o mag quando estável
  const MAG_TRUST_MOVING = 0.04;    // menos trust no mag se o aparelho está girando rápido
  const GYRO_DEADZONE = 0.8;        // deg/s — ignora ruído de fundo
  const GYRO_SPIKE = 400;           // deg/s — rejeita leituras absurdas
  const CALIB_MIN_SAMPLES = 40;
  const CALIB_MIN_VARIANCE = 25;
  const CALIB_DURATION_MS = 8000;

  function makeUserIconHtml(heading) {
    const rot = heading == null ? 0 : heading;
    const hasHeading = heading != null;
    return (
      `<div class="user-marker-wrap${hasHeading ? ' has-heading' : ''}">` +
        `<div class="user-cone" style="transform:rotate(${rot}deg)"></div>` +
        `<div class="user-dot"><span class="user-pulse"></span></div>` +
      `</div>`
    );
  }

  function buildUserIcon(heading) {
    return L.divIcon({
      className: 'projano-user-marker',
      html: makeUserIconHtml(heading),
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  }

  let userMarker = null;
  let accuracyCircle = null;
  let watchId = null;
  let lastPos = null;
  let lastRaw = null;
  let lastUiUpdate = 0;
  let followedOnce = false;
  let mapVisible = false;
  let pageVisible = !document.hidden;
  let watching = false;
  let currentProfile = 'eco';
  let preciseUntil = 0;
  const samples = [];

  const insideFences = new Set();
  let lastFenceCheck = 0;

  // estado da bússola + fusão
  let heading = null;          // graus fundidos, 0 = norte, horário
  let headingRaw = null;       // referência magnetômetro
  let compassActive = false;
  let compassPerm = 'unknown'; // unknown | granted | denied | unsupported
  let motionPerm = 'unknown';
  let orientHandler = null;
  let motionHandler = null;
  let calibSamples = [];
  let calibrating = false;
  let calibTimer = null;
  let lastGyroTs = 0;          // performance.now() da última amostra gyro
  let lastMagTs = 0;
  let gyroRateZ = 0;           // deg/s em torno do eixo vertical do mundo (aprox.)
  let fusionMode = 'mag';      // mag | fusion | gyro

  function haversineM(a, b) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function nearestSpotDistance(lat, lng) {
    let min = Infinity;
    let nearest = null;
    const pos = { lat, lng };
    for (const s of spots) {
      const d = haversineM(pos, { lat: s.lat, lng: s.lng });
      if (d < min) { min = d; nearest = s; }
    }
    return { dist: min, spot: nearest };
  }

  function desiredProfile(lat, lng, accuracy) {
    if (Date.now() < preciseUntil) return 'high';
    const { dist, spot } = nearestSpotDistance(lat, lng);
    const approachLimit = (spot ? spot.radius : 100) + APPROACH_BUFFER_M;
    if (spot && dist <= spot.radius + 40) return 'high';
    if (spot && dist <= approachLimit) return 'mid';
    if (accuracy != null && accuracy > POOR_ACCURACY_M) return 'mid';
    return 'eco';
  }

  function setStatus(text, kind) {
    const el = document.getElementById('geo-status');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('live', 'error', 'pending', 'paused');
    if (kind) el.classList.add(kind);
  }

  function setAccuracyHint(accuracy, profile) {
    let hint = document.getElementById('geo-accuracy');
    if (!hint) {
      const header = document.querySelector('.map-header');
      if (!header) return;
      hint = document.createElement('span');
      hint.id = 'geo-accuracy';
      hint.className = 'geo-accuracy';
      header.appendChild(hint);
    }
    if (accuracy == null) { hint.hidden = true; return; }
    hint.hidden = false;
    const acc = Math.round(accuracy);
    const mode = profile === 'high' ? 'GPS' : profile === 'mid' ? 'misto' : 'rede';
    hint.textContent = `±${acc} m · ${mode}`;
    hint.classList.toggle('good', acc <= 35);
    hint.classList.toggle('ok', acc > 35 && acc <= 80);
    hint.classList.toggle('poor', acc > 80);
  }

  function setFenceChip(names) {
    let chip = document.getElementById('geo-fence-chip');
    if (!chip) {
      const header = document.querySelector('.map-header');
      if (!header) return;
      chip = document.createElement('span');
      chip.id = 'geo-fence-chip';
      chip.className = 'geo-fence-chip';
      header.appendChild(chip);
    }
    if (!names.length) { chip.hidden = true; chip.textContent = ''; return; }
    chip.hidden = false;
    chip.textContent = names.length === 1 ? `em ${names[0]}` : `em ${names.length} zonas`;
    chip.title = names.join(' · ');
  }

  function setCompassChip(deg, state) {
    let chip = document.getElementById('geo-compass');
    if (!chip) {
      const header = document.querySelector('.map-header');
      if (!header) return;
      chip = document.createElement('button');
      chip.type = 'button';
      chip.id = 'geo-compass';
      chip.className = 'geo-compass';
      chip.title = 'Calibrar bússola';
      header.appendChild(chip);
      chip.addEventListener('click', () => openCompassCalibration());
    }
    if (state === 'off') {
      chip.innerHTML = `<span class="compass-needle">◎</span> bússola`;
      chip.classList.remove('live', 'calib');
      return;
    }
    if (state === 'calib') {
      chip.innerHTML = `<span class="compass-needle spin">↻</span> calibrando`;
      chip.classList.add('calib');
      chip.classList.remove('live');
      return;
    }
    const d = Math.round(((deg % 360) + 360) % 360);
    const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
    const dir = dirs[Math.round(d / 45) % 8];
    chip.innerHTML = `<span class="compass-needle" style="transform:rotate(${d}deg)">↑</span> ${d}° ${dir}`;
    chip.classList.add('live');
    chip.classList.remove('calib');
  }

  function smoothPosition(lat, lng, accuracy) {
    const acc = Math.max(accuracy || 50, 8);
    const weight = 1 / (acc * acc);
    samples.push({ lat, lng, accuracy: acc, weight, time: Date.now() });
    while (samples.length > SAMPLE_WINDOW) samples.shift();
    const cutoff = Date.now() - 60000;
    while (samples.length && samples[0].time < cutoff) samples.shift();
    let wSum = 0, latSum = 0, lngSum = 0, accBest = acc;
    for (const s of samples) {
      wSum += s.weight;
      latSum += s.lat * s.weight;
      lngSum += s.lng * s.weight;
      if (s.accuracy < accBest) accBest = s.accuracy;
    }
    if (wSum === 0) return { lat, lng, accuracy: acc };
    return { lat: latSum / wSum, lng: lngSum / wSum, accuracy: accBest };
  }

  function isPlausible(lat, lng, accuracy, time) {
    if (accuracy != null && accuracy > 500) return false;
    if (!lastRaw) return true;
    const dt = (time - lastRaw.time) / 1000;
    if (dt <= 0) return true;
    const dist = haversineM(lastRaw, { lat, lng });
    const maxDist = Math.max(OUTLIER_JUMP_M, 25 * dt + 40);
    if (dist > maxDist) {
      console.warn('GPS outlier rejeitado', { dist: Math.round(dist) });
      return false;
    }
    return true;
  }

  function notifyFence(type, spot) {
    const msg = type === 'enter'
      ? `Entrou na zona · ${spot.name}`
      : `Saiu da zona · ${spot.name}`;
    if (typeof showScrapToast === 'function') showScrapToast(msg);
    else console.log('[geofence]', msg);
    window.dispatchEvent(new CustomEvent('projano:geofence', {
      detail: { type, id: spot.id, name: spot.name, status: spot.status, radius: spot.radius }
    }));
  }

  function setFenceActive(id, active) {
    const layer = spotLayers[id];
    if (!layer) return;
    layer.marker.setIcon(active ? activeIcon : pinkIcon);
    layer.fence.setStyle({
      fillOpacity: active ? 0.18 : 0.06,
      opacity: active ? 0.7 : 0.35,
      weight: active ? 2 : 1
    });
    layer.marker.setZIndexOffset(active ? 500 : 0);
  }

  function checkGeofences(lat, lng, force) {
    const now = Date.now();
    if (!force && now - lastFenceCheck < FENCE_CHECK_MS) return;
    lastFenceCheck = now;
    const pos = { lat, lng };
    const entered = [];
    const exited = [];

    spots.forEach((spot) => {
      const dist = haversineM(pos, { lat: spot.lat, lng: spot.lng });
      const wasInside = insideFences.has(spot.id);
      const accPad = lastPos && lastPos.accuracy ? Math.min(lastPos.accuracy * 0.4, 30) : 0;
      const threshold = wasInside
        ? spot.radius + 20 + accPad
        : Math.max(spot.radius - accPad * 0.3, spot.radius * 0.7);
      const isInside = dist <= threshold;
      if (isInside && !wasInside) { entered.push(spot); setFenceActive(spot.id, true); }
      else if (!isInside && wasInside) { exited.push(spot); setFenceActive(spot.id, false); }
    });

    entered.forEach((s) => {
      insideFences.add(s.id);
      notifyFence('enter', s);
      preciseUntil = Date.now() + PRECISE_BURST_MS;
      maybeSwitchProfile(s.lat, s.lng, lastPos?.accuracy);
    });
    exited.forEach((s) => {
      insideFences.delete(s.id);
      notifyFence('exit', s);
    });

    const names = [...insideFences].map((id) => spotLayers[id]?.spot.name).filter(Boolean);
    setFenceChip(names);
  }

  function refreshUserMarkerIcon() {
    if (!userMarker) return;
    userMarker.setIcon(buildUserIcon(heading));
  }

  function applyPosition(lat, lng, accuracy, force) {
    const now = Date.now();
    const smoothed = smoothPosition(lat, lng, accuracy);
    const next = { lat: smoothed.lat, lng: smoothed.lng, accuracy: smoothed.accuracy, time: now };

    if (!force && lastPos) {
      const moved = haversineM(lastPos, next);
      const tooSoon = now - lastUiUpdate < MIN_UPDATE_MS;
      if (tooSoon && moved < MIN_MOVE_M) {
        lastPos = next;
        checkGeofences(next.lat, next.lng, false);
        setAccuracyHint(next.accuracy, currentProfile);
        return;
      }
    }

    lastPos = next;
    lastUiUpdate = now;

    if (!userMarker) {
      userMarker = L.marker([next.lat, next.lng], {
        icon: buildUserIcon(heading),
        zIndexOffset: 1000
      }).addTo(map).bindPopup('<strong>Você está aqui</strong>');
    } else {
      userMarker.setLatLng([next.lat, next.lng]);
      refreshUserMarkerIcon();
    }

    const radius = Math.max(next.accuracy || 40, 15);
    if (!accuracyCircle) {
      accuracyCircle = L.circle([next.lat, next.lng], {
        radius,
        color: '#3B9EFF',
        weight: 1,
        fillColor: '#3B9EFF',
        fillOpacity: 0.1,
        opacity: 0.35
      }).addTo(map);
    } else {
      accuracyCircle.setLatLng([next.lat, next.lng]);
      accuracyCircle.setRadius(radius);
    }

    if (!followedOnce) {
      followedOnce = true;
      map.setView([next.lat, next.lng], Math.max(map.getZoom(), 16), { animate: true });
    }

    setStatus('ao vivo', 'live');
    setAccuracyHint(next.accuracy, currentProfile);
    checkGeofences(next.lat, next.lng, force);
    maybeSwitchProfile(next.lat, next.lng, next.accuracy);
  }

  function onPosition(pos, force) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const time = pos.timestamp || Date.now();
    if (!isPlausible(lat, lng, accuracy, time)) return;
    lastRaw = { lat, lng, accuracy, time };
    applyPosition(lat, lng, accuracy, force);
  }

  function onGeoError(err) {
    let msg = 'indisponível';
    if (err && err.code === 1) msg = 'permissão negada';
    else if (err && err.code === 2) msg = 'posição indisponível';
    else if (err && err.code === 3) msg = 'tempo esgotado';
    setStatus(msg, 'error');
  }

  function stopWatching(reason) {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    watching = false;
    if (reason === 'pause') {
      setStatus('pausado', 'paused');
      setAccuracyHint(null, currentProfile);
    }
  }

  function startWatch(profile) {
    if (!navigator.geolocation) { onGeoError({ code: 0 }); return; }
    if (!mapVisible || !pageVisible) { setStatus('pausado', 'paused'); return; }

    const nextProfile = profile || currentProfile || 'eco';
    const opts = GEO_PROFILES[nextProfile] || GEO_PROFILES.eco;

    if (watching && currentProfile === nextProfile && watchId != null) return;

    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    currentProfile = nextProfile;
    setStatus('buscando…', 'pending');

    navigator.geolocation.getCurrentPosition(
      (pos) => onPosition(pos, true),
      onGeoError,
      opts
    );

    watchId = navigator.geolocation.watchPosition(
      (pos) => onPosition(pos, false),
      onGeoError,
      opts
    );
    watching = true;
  }

  function maybeSwitchProfile(lat, lng, accuracy) {
    if (!watching || !mapVisible || !pageVisible) return;
    const want = desiredProfile(lat, lng, accuracy);
    if (want !== currentProfile) {
      if (want === 'high' || want === 'mid' || Date.now() > preciseUntil) {
        startWatch(want);
      }
    }
  }

  function startWatching(opts) {
    if (opts && opts.precise) {
      preciseUntil = Date.now() + PRECISE_BURST_MS;
      startWatch('high');
      return;
    }
    const seed = lastPos || { lat: -22.9005, lng: -43.2210, accuracy: 100 };
    startWatch(desiredProfile(seed.lat, seed.lng, seed.accuracy));
  }

  function syncWatchState() {
    if (mapVisible && pageVisible) startWatching();
    else stopWatching('pause');
  }

  function centerOnUser() {
    if (lastPos && Date.now() - lastPos.time < 45000) {
      map.setView([lastPos.lat, lastPos.lng], Math.max(map.getZoom(), 16), { animate: true });
      if (userMarker) userMarker.openPopup();
      preciseUntil = Date.now() + PRECISE_BURST_MS;
      startWatch('high');
      return;
    }
    startWatching({ precise: true });
  }

  // ========== BÚSSOLA + FUSÃO GIROSCÓPIO ==========

  function normalizeDeg(d) {
    return ((d % 360) + 360) % 360;
  }

  function shortestDelta(from, to) {
    let d = to - from;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  function extractHeading(event) {
    if (typeof event.webkitCompassHeading === 'number' && !Number.isNaN(event.webkitCompassHeading)) {
      return event.webkitCompassHeading;
    }
    if (event.absolute === true && typeof event.alpha === 'number' && event.alpha != null) {
      return normalizeDeg(360 - event.alpha);
    }
    if (typeof event.alpha === 'number' && event.alpha != null) {
      return normalizeDeg(360 - event.alpha);
    }
    return null;
  }

  /**
   * Converte rotationRate do device (eixos locais) em taxa de yaw
   * aproximada no plano horizontal usando beta/gamma da orientação.
   * rotationRate: alpha=z (yaw local), beta=x (pitch), gamma=y (roll) em deg/s
   */
  function yawRateFromMotion(rotationRate, orientBeta, orientGamma) {
    if (!rotationRate) return 0;
    let ax = rotationRate.alpha; // z
    let bx = rotationRate.beta;  // x
    let gx = rotationRate.gamma; // y
    // alguns browsers usam null quando indisponível
    if (ax == null && bx == null && gx == null) return 0;
    ax = ax || 0;
    bx = bx || 0;
    gx = gx || 0;

    // Se a taxa total for absurda, descarta
    if (Math.abs(ax) > GYRO_SPIKE || Math.abs(bx) > GYRO_SPIKE || Math.abs(gx) > GYRO_SPIKE) {
      return 0;
    }

    // Aproximação: com o telefone quase vertical (uso de mapa),
    // o yaw no mundo ≈ -alpha (android) ou combinação leve.
    // Quando deitado (beta ~0), alpha já é yaw; quando em pé, mistura.
    const beta = (orientBeta || 0) * Math.PI / 180;
    const gamma = (orientGamma || 0) * Math.PI / 180;
    const cosB = Math.cos(beta);
    const sinB = Math.sin(beta);
    const cosG = Math.cos(gamma);
    const sinG = Math.sin(gamma);

    // Projeção simplificada da taxa angular no eixo vertical do mundo
    // (derivada de R_world * omega_body · up)
    const yawRate = ax * cosB * cosG - gx * sinB - bx * cosB * sinG;

    // Sinal: queremos horário a partir do norte (mesmo sentido do compass heading)
    return -yawRate;
  }

  let lastOrientBeta = 0;
  let lastOrientGamma = 0;

  function publishHeading() {
    if (heading == null) return;
    refreshUserMarkerIcon();
    setCompassChip(heading, 'live');
    window.dispatchEvent(new CustomEvent('projano:heading', {
      detail: {
        heading,
        raw: headingRaw,
        mode: fusionMode,
        gyroRate: gyroRateZ
      }
    }));
  }

  function fuseMagSample(magHeading) {
    const now = performance.now();
    headingRaw = magHeading;

    if (calibrating) {
      calibSamples.push(magHeading);
      lastMagTs = now;
      return;
    }

    if (heading == null) {
      heading = magHeading;
      lastMagTs = now;
      fusionMode = 'mag';
      publishHeading();
      return;
    }

    // Confiança no magnetômetro cai se o gyro indica rotação rápida
    // (mag atrasa e oscila; gyro conduz)
    const spinning = Math.abs(gyroRateZ) > 25;
    const magTrust = spinning ? MAG_TRUST_MOVING : MAG_TRUST_BASE;

    // Se o mag "pula" demais vs heading atual (> 35°) e gyro está calmo,
    // trata como interferência magnética e confia menos ainda
    const jump = Math.abs(shortestDelta(heading, magHeading));
    const trust = (!spinning && jump > 35) ? magTrust * 0.35 : magTrust;

    heading = normalizeDeg(heading + trust * shortestDelta(heading, magHeading));
    lastMagTs = now;
    fusionMode = Math.abs(gyroRateZ) > GYRO_DEADZONE ? 'fusion' : 'mag';
    publishHeading();
  }

  function fuseGyroSample(yawRateDeg, ts) {
    if (heading == null) {
      // sem referência absoluta ainda — só guarda taxa
      gyroRateZ = yawRateDeg;
      lastGyroTs = ts;
      return;
    }

    if (lastGyroTs > 0) {
      let dt = (ts - lastGyroTs) / 1000; // segundos
      if (dt > 0 && dt < 0.25) { // ignora gaps longos (aba em background)
        let rate = yawRateDeg;
        if (Math.abs(rate) < GYRO_DEADZONE) rate = 0;

        // Integração do gyro
        const gyroHeading = normalizeDeg(heading + rate * dt);

        // Se temos mag recente (< 400ms), complementar; senão gyro puro (curto prazo)
        const magFresh = lastMagTs > 0 && (ts - lastMagTs) < 400;
        if (magFresh && headingRaw != null) {
          const w = FUSION_GYRO_WEIGHT;
          heading = normalizeDeg(
            gyroHeading + (1 - w) * shortestDelta(gyroHeading, headingRaw) * 0 // mag já puxa em fuseMagSample
          );
          // na prática a integração gyro já atualizou; mag corrige no outro handler
          heading = gyroHeading;
          fusionMode = 'fusion';
        } else {
          heading = gyroHeading;
          fusionMode = 'gyro';
        }
        publishHeading();
      }
    }

    gyroRateZ = yawRateDeg;
    lastGyroTs = ts;
  }

  function onOrientation(event) {
    if (typeof event.beta === 'number') lastOrientBeta = event.beta;
    if (typeof event.gamma === 'number') lastOrientGamma = event.gamma;

    const raw = extractHeading(event);
    if (raw == null) return;
    fuseMagSample(raw);
  }

  function onMotion(event) {
    const rr = event.rotationRate;
    if (!rr) return;
    const ts = performance.now();
    const yawRate = yawRateFromMotion(rr, lastOrientBeta, lastOrientGamma);
    fuseGyroSample(yawRate, ts);
  }

  function stopCompass() {
    if (orientHandler) {
      window.removeEventListener('deviceorientationabsolute', orientHandler);
      window.removeEventListener('deviceorientation', orientHandler);
      orientHandler = null;
    }
    if (motionHandler) {
      window.removeEventListener('devicemotion', motionHandler);
      motionHandler = null;
    }
    compassActive = false;
    lastGyroTs = 0;
    setCompassChip(null, 'off');
  }

  function attachOrientationListeners() {
    orientHandler = onOrientation;
    motionHandler = onMotion;
    window.addEventListener('deviceorientationabsolute', orientHandler, true);
    window.addEventListener('deviceorientation', orientHandler, true);
    window.addEventListener('devicemotion', motionHandler, true);
    compassActive = true;
  }

  async function requestCompassPermission() {
    if (typeof window.DeviceOrientationEvent === 'undefined') {
      compassPerm = 'unsupported';
      return false;
    }

    // iOS 13+: orientation
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        compassPerm = res === 'granted' ? 'granted' : 'denied';
        if (compassPerm !== 'granted') return false;
      } catch (e) {
        compassPerm = 'denied';
        return false;
      }
    } else {
      compassPerm = 'granted';
    }

    // iOS: motion (giroscópio)
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEvent.requestPermission();
        motionPerm = res === 'granted' ? 'granted' : 'denied';
        // mag sozinho ainda funciona se motion for negado
      } catch (e) {
        motionPerm = 'denied';
      }
    } else {
      motionPerm = typeof DeviceMotionEvent !== 'undefined' ? 'granted' : 'unsupported';
    }

    return compassPerm === 'granted';
  }

  function varianceDeg(arr) {
    if (arr.length < 2) return 0;
    let sx = 0, sy = 0;
    for (const a of arr) {
      const r = (a * Math.PI) / 180;
      sx += Math.cos(r);
      sy += Math.sin(r);
    }
    const n = arr.length;
    const meanR = Math.atan2(sy / n, sx / n);
    let v = 0;
    for (const a of arr) {
      const r = (a * Math.PI) / 180;
      let d = r - meanR;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      v += d * d;
    }
    return (v / n) * (180 / Math.PI) ** 2;
  }

  function closeCalibUI(ok) {
    const overlay = document.getElementById('compass-calib');
    if (overlay) overlay.remove();
    calibrating = false;
    if (calibTimer) { clearTimeout(calibTimer); calibTimer = null; }

    if (ok) {
      // zera bias do filtro: ancora no mag fresco
      if (headingRaw != null) heading = headingRaw;
      lastGyroTs = 0;
      gyroRateZ = 0;
      if (typeof showScrapToast === 'function') {
        showScrapToast(motionPerm === 'granted'
          ? 'Bússola + giroscópio calibrados'
          : 'Bússola calibrada');
      }
      refreshUserMarkerIcon();
      setCompassChip(heading, heading != null ? 'live' : 'off');
    } else {
      setCompassChip(heading, heading != null ? 'live' : 'off');
    }
  }

  function finishCalibration() {
    const v = varianceDeg(calibSamples);
    const enough = calibSamples.length >= CALIB_MIN_SAMPLES && v >= CALIB_MIN_VARIANCE;

    if (enough && headingRaw != null) {
      heading = headingRaw;
      refreshUserMarkerIcon();
      closeCalibUI(true);
    } else {
      const progress = document.querySelector('#compass-calib .calib-hint');
      if (progress) {
        progress.textContent = enough
          ? 'Quase! Continue o movimento em 8…'
          : 'Mova o celular em forma de 8 no ar';
      }
      calibSamples = [];
      calibTimer = setTimeout(finishCalibration, CALIB_DURATION_MS);
    }
  }

  function openCompassCalibration() {
    (async () => {
      const ok = await requestCompassPermission();
      if (!ok) {
        if (typeof showScrapToast === 'function') {
          showScrapToast(
            compassPerm === 'unsupported'
              ? 'Bússola não suportada neste dispositivo'
              : 'Permissão de orientação negada'
          );
        }
        setCompassChip(null, 'off');
        return;
      }

      if (!compassActive) attachOrientationListeners();

      let overlay = document.getElementById('compass-calib');
      if (overlay) overlay.remove();

      const gyroLabel = motionPerm === 'granted'
        ? 'Fusão com giroscópio ativa'
        : 'Só magnetômetro (giroscópio indisponível)';

      overlay = document.createElement('div');
      overlay.id = 'compass-calib';
      overlay.className = 'compass-calib';
      overlay.innerHTML = `
        <div class="compass-calib-card">
          <div class="calib-visual" aria-hidden="true">
            <div class="calib-phone"></div>
            <svg class="calib-path" viewBox="0 0 120 80" fill="none">
              <path d="M20 40 C20 15, 50 15, 60 40 C70 65, 100 65, 100 40 C100 15, 70 15, 60 40 C50 65, 20 65, 20 40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Calibrar bússola</h3>
          <p class="calib-hint">Mova o celular no ar em forma de <b>8</b>, longe de metal e carregadores</p>
          <p class="calib-sub">${gyroLabel}</p>
          <div class="calib-bar"><div class="calib-bar-fill"></div></div>
          <div class="calib-actions">
            <button type="button" class="calib-cancel">agora não</button>
            <button type="button" class="calib-done">concluir</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      calibrating = true;
      calibSamples = [];
      setCompassChip(null, 'calib');

      const fill = overlay.querySelector('.calib-bar-fill');
      const started = Date.now();
      const tick = () => {
        if (!calibrating) return;
        const t = Math.min(1, (Date.now() - started) / CALIB_DURATION_MS);
        if (fill) fill.style.width = `${t * 100}%`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      overlay.querySelector('.calib-cancel').addEventListener('click', () => closeCalibUI(false));
      overlay.querySelector('.calib-done').addEventListener('click', () => {
        if (headingRaw != null) {
          heading = headingRaw;
          refreshUserMarkerIcon();
        }
        closeCalibUI(true);
      });

      if (calibTimer) clearTimeout(calibTimer);
      calibTimer = setTimeout(finishCalibration, CALIB_DURATION_MS);
    })();
  }

  // Controle Leaflet da bússola
  const CompassControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-bar projano-compass-btn');
      btn.type = 'button';
      btn.title = 'Calibrar bússola';
      btn.setAttribute('aria-label', 'Calibrar bússola digital');
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="12 6 14.5 12 12 18 9.5 12" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`;
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stop(e);
        openCompassCalibration();
      });
      return btn;
    }
  });
  map.addControl(new CompassControl());

  // Locate control
  const LocateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-bar projano-locate-btn');
      btn.type = 'button';
      btn.title = 'Minha localização (alta precisão)';
      btn.setAttribute('aria-label', 'Centralizar na minha localização');
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`;
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stop(e);
        centerOnUser();
      });
      return btn;
    }
  });
  map.addControl(new LocateControl());

  window.projanoMap = {
    map,
    getPosition: () => lastPos,
    getHeading: () => heading,
    getFusionMode: () => fusionMode,
    getProfile: () => currentProfile,
    centerOnUser,
    startWatching: () => startWatching(),
    stopWatching: () => stopWatching('pause'),
    calibrateCompass: openCompassCalibration,
    getActiveFences: () =>
      [...insideFences].map((id) => {
        const s = spotLayers[id]?.spot;
        return s ? { id: s.id, name: s.name, status: s.status, radius: s.radius } : null;
      }).filter(Boolean),
    getSpots: () => spots.map((s) => ({ ...s }))
  };

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        mapVisible = e.isIntersecting;
        if (e.isIntersecting) map.invalidateSize();
        syncWatchState();
      });
    }, { threshold: 0.15 });
    obs.observe(mapEl);
  } else {
    mapVisible = true;
  }

  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    syncWatchState();
    // pausa sensores em background; retoma se já tinha permissão
    if (document.hidden) {
      stopCompass();
    } else if (compassPerm === 'granted') {
      attachOrientationListeners();
      lastGyroTs = 0;
      setCompassChip(heading, heading != null ? 'live' : 'off');
    }
  });

  setStatus('pausado', 'paused');
  setCompassChip(null, 'off');
  setTimeout(() => map.invalidateSize(), 200);
})();
