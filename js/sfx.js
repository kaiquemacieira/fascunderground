/**
 * CRICRI · SFX + síntese granular (Web Audio, sem MP3)
 * Mute em localStorage · só toca após gesto do usuário
 */
(function () {
  var KEY = 'cricri_sfx_mute_v1';
  var ctx = null;
  var unlocked = false;
  var sourceCache = {};

  function muted() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }
  function setMuted(on) {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('cricri:sfx-mute', { detail: { muted: !!on } }));
    } catch (_) {}
  }
  function ensure() {
    if (muted()) return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    unlocked = true;
    return ctx;
  }
  function unlock() { ensure(); }

  /* ---------- util ---------- */
  function tone(freq, dur, type, gain, slideTo) {
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    }
    var vol = gain == null ? 0.08 : gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, gain) {
    var c = ensure();
    if (!c) return;
    var n = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    var t0 = c.currentTime;
    var vol = gain == null ? 0.04 : gain;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(c.destination);
    src.start(t0);
  }

  /* ---------- buffers fonte p/ granular ---------- */
  function makeNoiseBuffer(seconds) {
    var c = ensure();
    if (!c) return null;
    var n = Math.floor(c.sampleRate * seconds);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < n; i++) {
      var white = Math.random() * 2 - 1;
      // pink-ish
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.04;
      b2 = 0.95 * b2 + white * 0.08;
      d[i] = (b0 + b1 + b2 + white * 0.1) * 0.35;
    }
    return buf;
  }

  /** Buffer “miado”: ruído filtrado + formantes senoidais envelopeados */
  function makeMeowBuffer() {
    var c = ensure();
    if (!c) return null;
    var dur = 0.55;
    var n = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) {
      var t = i / c.sampleRate;
      var env = Math.sin(Math.PI * (t / dur));
      env = Math.pow(env, 0.7);
      // glide de pitch no formante
      var f1 = 780 - t * 520;
      var f2 = 1400 - t * 400;
      var f3 = 2200 - t * 600;
      var v =
        Math.sin(2 * Math.PI * f1 * t) * 0.45 +
        Math.sin(2 * Math.PI * f2 * t) * 0.28 +
        Math.sin(2 * Math.PI * f3 * t) * 0.12 +
        (Math.random() * 2 - 1) * 0.04;
      d[i] = v * env * 0.7;
    }
    return buf;
  }

  function makeBellBuffer() {
    var c = ensure();
    if (!c) return null;
    var dur = 0.8;
    var n = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    var partials = [1, 2.0, 3.01, 4.2, 5.4];
    var amps = [1, 0.5, 0.3, 0.18, 0.1];
    var base = 420;
    for (var i = 0; i < n; i++) {
      var t = i / c.sampleRate;
      var env = Math.exp(-t * 4.5);
      var v = 0;
      for (var p = 0; p < partials.length; p++) {
        v += Math.sin(2 * Math.PI * base * partials[p] * t) * amps[p];
      }
      d[i] = v * env * 0.35;
    }
    return buf;
  }

  function getSource(kind) {
    if (sourceCache[kind]) return sourceCache[kind];
    var buf = null;
    if (kind === 'meow') buf = makeMeowBuffer();
    else if (kind === 'bell') buf = makeBellBuffer();
    else if (kind === 'noise') buf = makeNoiseBuffer(1.2);
    else buf = makeNoiseBuffer(0.8);
    sourceCache[kind] = buf;
    return buf;
  }

  /**
   * Síntese granular
   * @param {object} opts
   *  source: 'meow'|'bell'|'noise'
   *  duration: tempo total do gesto (s)
   *  grainMs: duração de cada grain
   *  density: grains por segundo
   *  playbackRate: centro (1 = original)
   *  rateJitter: ± aleatório no rate
   *  detune: cents médios
   *  posJitter: 0–1 espalha o offset no buffer
   *  gain: volume pico
   *  pan: -1..1 base (stereo se disponível)
   *  panJitter: espalha pan
   *  reverseChance: 0–1
   */
  function granular(opts) {
    var c = ensure();
    if (!c) return;
    opts = opts || {};
    var buf = getSource(opts.source || 'noise');
    if (!buf) return;

    var duration = opts.duration != null ? opts.duration : 0.35;
    var grainDur = (opts.grainMs != null ? opts.grainMs : 40) / 1000;
    var density = opts.density != null ? opts.density : 45;
    var rate0 = opts.playbackRate != null ? opts.playbackRate : 1;
    var rateJ = opts.rateJitter != null ? opts.rateJitter : 0.12;
    var posJ = opts.posJitter != null ? opts.posJitter : 0.5;
    var gain0 = opts.gain != null ? opts.gain : 0.06;
    var pan0 = opts.pan != null ? opts.pan : 0;
    var panJ = opts.panJitter != null ? opts.panJitter : 0.4;
    var revChance = opts.reverseChance != null ? opts.reverseChance : 0.08;

    var t0 = c.currentTime;
    var interval = 1 / density;
    var count = Math.min(80, Math.max(1, Math.floor(duration * density)));
    var bufDur = buf.duration;

    var master = c.createGain();
    master.gain.setValueAtTime(1, t0);
    master.connect(c.destination);

    for (var i = 0; i < count; i++) {
      (function (i) {
        var startAt = t0 + i * interval + (Math.random() * interval * 0.35);
        var gDur = grainDur * (0.7 + Math.random() * 0.6);
        var rate = rate0 * (1 + (Math.random() * 2 - 1) * rateJ);
        rate = Math.max(0.25, Math.min(3.5, rate));
        var offset = Math.random() * Math.max(0.001, bufDur - gDur) * posJ;
        if (opts.fixedPos != null) {
          offset = Math.max(0, Math.min(bufDur - gDur, opts.fixedPos + (Math.random() - 0.5) * 0.02));
        }
        var reverse = Math.random() < revChance;

        var src = c.createBufferSource();
        src.buffer = buf;
        src.playbackRate.setValueAtTime(reverse ? -Math.abs(rate) : rate, startAt);
        // alguns browsers não aceitam rate negativo — fallback
        if (reverse) {
          try {
            src.playbackRate.setValueAtTime(rate, startAt);
          } catch (_) {}
        }

        var g = c.createGain();
        var peak = gain0 * (0.55 + Math.random() * 0.55);
        // envelope Hann aproximado
        g.gain.setValueAtTime(0.0001, startAt);
        g.gain.linearRampToValueAtTime(peak, startAt + gDur * 0.3);
        g.gain.linearRampToValueAtTime(0.0001, startAt + gDur);

        var node = src;
        if (c.createStereoPanner) {
          var panner = c.createStereoPanner();
          var pan = Math.max(-1, Math.min(1, pan0 + (Math.random() * 2 - 1) * panJ));
          panner.pan.setValueAtTime(pan, startAt);
          src.connect(panner);
          panner.connect(g);
        } else {
          src.connect(g);
        }
        g.connect(master);

        try {
          src.start(startAt, offset, gDur);
        } catch (e) {
          // Safari às vezes rejeita offset — tenta sem
          try { src.start(startAt); } catch (_) {}
        }
      })(i);
    }
  }

  /* ---------- SFX (presets) ---------- */
  var SFX = {
    click: function () { tone(420, 0.06, 'square', 0.035); },
    post: function () {
      granular({
        source: 'bell',
        duration: 0.22,
        grainMs: 28,
        density: 55,
        playbackRate: 1.15,
        rateJitter: 0.08,
        gain: 0.05,
        panJitter: 0.35
      });
      tone(780, 0.08, 'triangle', 0.03);
    },
    send: function () {
      granular({
        source: 'bell',
        duration: 0.28,
        grainMs: 32,
        density: 50,
        playbackRate: 1.0,
        rateJitter: 0.1,
        gain: 0.05
      });
    },
    meow: function () {
      // miado granular + glide residual
      granular({
        source: 'meow',
        duration: 0.32,
        grainMs: 36,
        density: 60,
        playbackRate: 1.05,
        rateJitter: 0.18,
        posJitter: 0.75,
        gain: 0.07,
        panJitter: 0.55,
        reverseChance: 0.05
      });
      setTimeout(function () {
        granular({
          source: 'meow',
          duration: 0.18,
          grainMs: 28,
          density: 40,
          playbackRate: 0.82,
          rateJitter: 0.12,
          gain: 0.045,
          panJitter: 0.4
        });
      }, 120);
    },
    success: function () {
      granular({
        source: 'bell',
        duration: 0.35,
        grainMs: 40,
        density: 40,
        playbackRate: 1.2,
        rateJitter: 0.06,
        gain: 0.045
      });
      tone(523, 0.08, 'sine', 0.03);
      setTimeout(function () { tone(784, 0.12, 'sine', 0.03); }, 100);
    },
    error: function () {
      granular({
        source: 'noise',
        duration: 0.15,
        grainMs: 20,
        density: 35,
        playbackRate: 0.6,
        rateJitter: 0.2,
        gain: 0.035,
        posJitter: 1
      });
      tone(220, 0.14, 'square', 0.03, 140);
    },
    pop: function () {
      granular({
        source: 'noise',
        duration: 0.1,
        grainMs: 16,
        density: 50,
        playbackRate: 1.8,
        rateJitter: 0.25,
        gain: 0.04
      });
      tone(640, 0.06, 'triangle', 0.035, 900);
    },
    feed: function () {
      granular({
        source: 'noise',
        duration: 0.12,
        grainMs: 18,
        density: 40,
        playbackRate: 1.3,
        gain: 0.03
      });
      tone(300, 0.07, 'sine', 0.03);
    },
    play: function () {
      granular({
        source: 'bell',
        duration: 0.2,
        grainMs: 24,
        density: 45,
        playbackRate: 1.4,
        rateJitter: 0.15,
        gain: 0.04,
        panJitter: 0.6
      });
    },
    sleep: function () {
      granular({
        source: 'meow',
        duration: 0.4,
        grainMs: 55,
        density: 18,
        playbackRate: 0.55,
        rateJitter: 0.08,
        gain: 0.03,
        panJitter: 0.2
      });
    },
    evolve: function () {
      granular({
        source: 'bell',
        duration: 0.45,
        grainMs: 35,
        density: 55,
        playbackRate: 0.9,
        rateJitter: 0.2,
        gain: 0.05,
        panJitter: 0.7
      });
      setTimeout(function () {
        granular({
          source: 'meow',
          duration: 0.25,
          grainMs: 30,
          density: 50,
          playbackRate: 1.3,
          gain: 0.04
        });
      }, 150);
    },
    /** textura ambiente curta (rua / cartaz) */
    ambient: function () {
      granular({
        source: 'noise',
        duration: 0.8,
        grainMs: 50,
        density: 25,
        playbackRate: 0.7,
        rateJitter: 0.3,
        gain: 0.025,
        posJitter: 1,
        panJitter: 0.9
      });
    }
  };

  function play(name) {
    if (muted()) return;
    var fn = SFX[name];
    if (fn) {
      try { fn(); } catch (_) {}
    }
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, unlock, { once: true, passive: true });
  });

  window.CricriSfx = {
    play: play,
    unlock: unlock,
    muted: muted,
    setMuted: setMuted,
    toggleMute: function () {
      var next = !muted();
      setMuted(next);
      if (!next) play('click');
      return next;
    },
    /** API avançada */
    granular: granular,
    tone: function (f, d, type, g, slide) { tone(f, d, type, g, slide); },
    clearCache: function () { sourceCache = {}; }
  };
})();
