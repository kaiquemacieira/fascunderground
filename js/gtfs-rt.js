/**
 * CRICRI · Cliente GTFS-RT (Trip Updates)
 *
 * Aracaju / São Cristóvão (SMTT-CTM) NÃO publicam feed GTFS-RT aberto.
 * Este módulo fica pronto para quando houver URL oficial ou proxy próprio.
 *
 * Formatos aceitos (configure em FASC_CONFIG):
 *  1) transitRtUrl  → JSON simples: { delays: { "031": 3 } }  (minutos)
 *  2) gtfsRtTripUpdatesUrl → JSON GTFS-RT (entity[].tripUpdate) OU protobuf binário
 *
 * Uso:
 *   const feed = await window.CricriGtfsRt.fetchFeed();
 *   // feed.delaysByRoute["031"] = 4
 */
(function (global) {
  'use strict';

  var STATE = {
    lastFetch: 0,
    delaysByRoute: {},
    vehiclesByRoute: {},
    source: 'none', // 'gtfs-rt' | 'json-delays' | 'none'
    error: null
  };

  function cfg() {
    return global.FASC_CONFIG || {};
  }

  function routeKey(name) {
    if (!name) return '';
    // normaliza "031", "31", "FEST"
    var s = String(name).trim().toUpperCase();
    if (/^\d+$/.test(s)) s = s.padStart(3, '0');
    return s;
  }

  /** Parse JSON no formato entity[] GTFS-RT (exportado por proxies) */
  function parseTripUpdatesJson(data) {
    var delays = {};
    var entities = (data && data.entity) || (data && data.entities) || [];
    if (!Array.isArray(entities)) entities = [];

    entities.forEach(function (ent) {
      var tu = ent.tripUpdate || ent.trip_update;
      if (!tu) return;
      var trip = tu.trip || {};
      var routeId = routeKey(trip.routeId || trip.route_id || trip.routeShortName || trip.route_short_name);
      if (!routeId) return;

      var delaySec = null;
      if (typeof tu.delay === 'number') delaySec = tu.delay;
      var stu = tu.stopTimeUpdate || tu.stop_time_update || [];
      if (Array.isArray(stu) && stu.length) {
        var first = stu[0];
        var arr = first.arrival || first.departure;
        if (arr && typeof arr.delay === 'number') delaySec = arr.delay;
        else if (typeof first.arrivalDelay === 'number') delaySec = first.arrivalDelay;
        else if (typeof first.departureDelay === 'number') delaySec = first.departureDelay;
      }
      if (delaySec == null) return;
      var delayMin = Math.round(delaySec / 60);
      // guarda o maior atraso absoluto observado por linha (pior caso útil na UI)
      if (delays[routeId] == null || Math.abs(delayMin) > Math.abs(delays[routeId])) {
        delays[routeId] = delayMin;
      }
    });
    return delays;
  }

  /** Parse Vehicle Positions JSON (opcional) */
  function parseVehiclePositionsJson(data) {
    var byRoute = {};
    var entities = (data && data.entity) || [];
    entities.forEach(function (ent) {
      var vp = ent.vehicle;
      if (!vp || !vp.position) return;
      var trip = vp.trip || {};
      var routeId = routeKey(trip.routeId || trip.route_id);
      if (!routeId) return;
      if (!byRoute[routeId]) byRoute[routeId] = [];
      byRoute[routeId].push({
        lat: vp.position.latitude,
        lng: vp.position.longitude,
        bearing: vp.position.bearing,
        ts: vp.timestamp
      });
    });
    return byRoute;
  }

  /**
   * Protobuf GTFS-RT mínimo: tenta decodificar delay se protobufjs estiver no page.
   * Sem a lib, ignora binário e retorna {}.
   */
  async function parseTripUpdatesProtobuf(buffer) {
    if (!global.protobuf) return {};
    try {
      // schema mínimo embutido não é prático; espera-se que a página carregue gtfs-realtime.proto
      // Fallback: não parseia — use JSON proxy.
      console.info('[CRICRI GTFS-RT] protobuf detectado, mas use JSON proxy para confiabilidade no browser');
      return {};
    } catch (e) {
      return {};
    }
  }

  async function fetchFeed() {
    var c = cfg();
    var delaysUrl = c.transitRtUrl || global.FASC_TRANSIT_RT_URL || '';
    var tripUrl = c.gtfsRtTripUpdatesUrl || global.FASC_GTFS_RT_TRIP_URL || '';
    var vehUrl = c.gtfsRtVehicleUrl || global.FASC_GTFS_RT_VEHICLE_URL || '';

    STATE.error = null;

    // 1) JSON delays simples
    if (delaysUrl) {
      try {
        var r = await fetch(delaysUrl, { cache: 'no-store', mode: 'cors' });
        if (r.ok) {
          var j = await r.json();
          var d = j.delays || j;
          var mapped = {};
          Object.keys(d).forEach(function (k) {
            var v = parseInt(d[k], 10);
            if (!isNaN(v)) mapped[routeKey(k)] = v;
          });
          STATE.delaysByRoute = mapped;
          STATE.source = 'json-delays';
          STATE.lastFetch = Date.now();
          return STATE;
        }
      } catch (e) {
        STATE.error = e.message || String(e);
      }
    }

    // 2) GTFS-RT Trip Updates
    if (tripUrl) {
      try {
        var r2 = await fetch(tripUrl, { cache: 'no-store', mode: 'cors' });
        if (r2.ok) {
          var ct = (r2.headers.get('content-type') || '').toLowerCase();
          var delays = {};
          if (ct.indexOf('json') !== -1) {
            delays = parseTripUpdatesJson(await r2.json());
          } else {
            var buf = await r2.arrayBuffer();
            // tenta JSON mesmo assim (alguns servers erram content-type)
            try {
              var text = new TextDecoder().decode(buf);
              if (text.trim().charAt(0) === '{') {
                delays = parseTripUpdatesJson(JSON.parse(text));
              } else {
                delays = await parseTripUpdatesProtobuf(buf);
              }
            } catch (_) {
              delays = await parseTripUpdatesProtobuf(buf);
            }
          }
          if (Object.keys(delays).length) {
            STATE.delaysByRoute = delays;
            STATE.source = 'gtfs-rt';
            STATE.lastFetch = Date.now();
          }
        }
      } catch (e) {
        STATE.error = e.message || String(e);
      }
    }

    // 3) Vehicle positions (opcional)
    if (vehUrl) {
      try {
        var r3 = await fetch(vehUrl, { cache: 'no-store', mode: 'cors' });
        if (r3.ok) {
          var ct3 = (r3.headers.get('content-type') || '').toLowerCase();
          if (ct3.indexOf('json') !== -1) {
            STATE.vehiclesByRoute = parseVehiclePositionsJson(await r3.json());
          }
        }
      } catch (_) { /* opcional */ }
    }

    if (!STATE.lastFetch) STATE.source = 'none';
    return STATE;
  }

  function getDelay(routeCode) {
    var k = routeKey(routeCode);
    if (STATE.delaysByRoute[k] != null) return STATE.delaysByRoute[k];
    // tenta sem zero-pad
    var bare = String(routeCode).replace(/^0+/, '') || '0';
    if (STATE.delaysByRoute[bare] != null) return STATE.delaysByRoute[bare];
    return null;
  }

  function getState() {
    return {
      source: STATE.source,
      lastFetch: STATE.lastFetch,
      delaysByRoute: Object.assign({}, STATE.delaysByRoute),
      vehiclesByRoute: STATE.vehiclesByRoute,
      error: STATE.error,
      ageSec: STATE.lastFetch ? Math.round((Date.now() - STATE.lastFetch) / 1000) : null
    };
  }

  global.CricriGtfsRt = {
    fetchFeed: fetchFeed,
    getDelay: getDelay,
    getState: getState,
    routeKey: routeKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
