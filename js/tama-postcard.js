/**
 * CRICRI · cartão-postal compartilhável do bichinho (P1.1)
 * Canvas client-side — Web Share API + fallback download
 */
(function (global) {
  'use strict';

  var W = 1080;
  var H = 1350;
  var FESTIVAL = 'FASC+ · Festival de Artes de São Cristóvão';
  var DATES = '19–22 de novembro de 2026';

  var SHELLS = {
    rosa: {
      fur: '#e33d6b', light: '#f7c9d6', ear: '#ffe1ea', label: 'Rosa',
      bg0: '#1a1210', bg1: '#3a1820', bg2: '#0c0a08',
      accent: '#e33d6b', accentSoft: 'rgba(227,61,107,0.14)',
      frame: 'rgba(227,61,107,0.6)', text: '#f2e8d2', muted: '#c4b9a8'
    },
    ocre: {
      fur: '#d49a2c', light: '#f7e2b4', ear: '#ffe9b8', label: 'Ocre',
      bg0: '#1a140c', bg1: '#3a2a12', bg2: '#0c0a08',
      accent: '#d49a2c', accentSoft: 'rgba(212,154,44,0.16)',
      frame: 'rgba(212,154,44,0.65)', text: '#f7ecd4', muted: '#cbb896'
    },
    azul: {
      fur: '#1b6f7e', light: '#b8e6ef', ear: '#d6f4fa', label: 'Azul',
      bg0: '#0c1418', bg1: '#143038', bg2: '#080c0e',
      accent: '#3db8c9', accentSoft: 'rgba(61,184,201,0.14)',
      frame: 'rgba(61,184,201,0.55)', text: '#e2f4f7', muted: '#9ab8be'
    },
    tuxedo: {
      fur: '#2a2621', light: '#f6efdc', ear: '#d9d0bd', label: 'Tuxedo',
      bg0: '#12110f', bg1: '#2a2621', bg2: '#080807',
      accent: '#ebe3cf', accentSoft: 'rgba(235,227,207,0.1)',
      frame: 'rgba(235,227,207,0.4)', text: '#f6efdc', muted: '#a39a8a'
    }
  };

  var STAGE_EMOJI = {
    ovo: '🥚', bebe: '🐱', filhote: '🐤', cria: '🐾',
    festa: '🎉', adulta: '👑', ancia: '✨'
  };

  var STAGE_LABEL = {
    ovo: 'Ovo', bebe: 'Bebê', filhote: 'Filhote', cria: 'Cria',
    festa: 'Festeira', adulta: 'Roda', ancia: 'Anciã'
  };

  /* Espécies escolhidas no app (mesmo catálogo do tamagotchi.js) */
  var SPECIES = {
    unicornio: { name: 'Unicórnio', emoji: '🦄', blurb: 'Magia da praça', tint: '#c084fc', motif: '✦' },
    grilo: { name: 'Grilo', emoji: '🦗', blurb: 'O som do CRICRI', tint: '#86efac', motif: '♪' },
    caramelo: { name: 'Caramelo', emoji: '🐕', blurb: 'Coração de rua', tint: '#fbbf24', motif: '♥' },
    viralata: { name: 'Caramelo', emoji: '🐕', blurb: 'Coração de rua', tint: '#fbbf24', motif: '♥' },
    preguica: { name: 'Bicho-preguiça', emoji: '🦥', blurb: 'Calma sergipana', tint: '#a3e635', motif: '…' },
    gaviao: { name: 'Gavião-carijó', emoji: '🦅', blurb: 'Olho na cidade', tint: '#fb923c', motif: '△' },
    jabuti: { name: 'Jabuti', emoji: '🐢', blurb: 'Passo firme', tint: '#34d399', motif: '◇' },
    suindara: { name: 'Suindara', emoji: '🦉', blurb: 'Noite na roda', tint: '#a78bfa', motif: '☾' },
    prea: { name: 'Preá', emoji: '🐹', blurb: 'Esperto do mato', tint: '#fcd34d', motif: '·' }
  };

  var FORM_LABEL = {
    barroco: 'Barroco', azulejo: 'Azulejo', cortejo: 'Cortejo',
    lenda: 'Lenda', total: 'Mutação Total'
  };

  function resolveSpecies(s) {
    var id = (s && (s.speciesId || s.species || s.animalId)) || null;
    if (id === 'viralata') id = 'caramelo';
    var sp = (id && SPECIES[id]) ? SPECIES[id] : null;
    return {
      id: id || 'desconhecido',
      name: sp ? sp.name : (s && s.speciesName) || 'CRICRI',
      emoji: sp ? sp.emoji : (s && s.speciesEmoji) || null,
      blurb: sp ? sp.blurb : 'Companheiro FASC+',
      tint: sp ? sp.tint : '#E6BE49',
      motif: sp ? sp.motif : '✦'
    };
  }

  function resolveForm(s) {
    var fid = s && s.formId;
    if (!fid) return null;
    return { id: fid, label: FORM_LABEL[fid] || fid };
  }

  function resolveMutations(s) {
    var list = [];
    try {
      var muts = (s && (s.mutations || s.muts || (s.genome && s.genome.mutations))) || [];
      if (!Array.isArray(muts)) muts = [];
      muts.slice(0, 3).forEach(function (m) {
        if (!m) return;
        if (typeof m === 'string') list.push({ id: m, emoji: '✦', name: m });
        else list.push({ id: m.id || '', emoji: m.emoji || '✦', name: m.name || m.id || '' });
      });
    } catch (_) {}
    return list;
  }

  function petEmojiFor(summary) {
    if (!summary) return '🐾';
    if (summary.stageId === 'ovo') return '🥚';
    if (summary.speciesEmoji) return summary.speciesEmoji;
    return summary.emoji || '🐾';
  }

  function getState() {
    if (global.CricriTamaRead && global.CricriTamaRead.loadLocal) {
      return global.CricriTamaRead.loadLocal();
    }
    try {
      var raw = localStorage.getItem('cricri-tama-v3')
        || localStorage.getItem('cricri-tama-v2')
        || localStorage.getItem('fasc-tama-v2');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function summarize(s) {
    if (global.CricriTamaRead && global.CricriTamaRead.summarize) {
      var base = global.CricriTamaRead.summarize(s);
      if (base) {
        var sp2 = resolveSpecies(s);
        var form2 = resolveForm(s);
        base.speciesId = sp2.id;
        base.speciesName = sp2.name;
        base.speciesEmoji = sp2.emoji;
        base.speciesBlurb = sp2.blurb;
        base.speciesTint = sp2.tint;
        base.speciesMotif = sp2.motif;
        base.formId = form2 ? form2.id : null;
        base.formLabel = form2 ? form2.label : null;
        base.mutations = resolveMutations(s);
        if (base.stageId !== 'ovo' && sp2.emoji) base.emoji = sp2.emoji;
      }
      return base;
    }
    if (!s || !s.started) return null;
    var sid = s.stageId || 'ovo';
    var shellId = s.shell || 'rosa';
    var sp = resolveSpecies(s);
    var form = resolveForm(s);
    return {
      name: String(s.name || 'Roda').slice(0, 24),
      stageId: sid,
      stageLabel: STAGE_LABEL[sid] || sid,
      shellId: shellId,
      shellLabel: (SHELLS[shellId] && SHELLS[shellId].label) || shellId,
      careScore: Number(s.careScore) || 0,
      speciesId: sp.id,
      speciesName: sp.name,
      speciesEmoji: sp.emoji,
      speciesBlurb: sp.blurb,
      speciesTint: sp.tint,
      speciesMotif: sp.motif,
      formId: form ? form.id : null,
      formLabel: form ? form.label : null,
      mutations: resolveMutations(s),
      emoji: (sid === 'ovo') ? '🥚' : (sp.emoji || STAGE_EMOJI[sid] || '🐾'),
      alive: s.alive !== false
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawCat(ctx, cx, cy, scale, shell) {
    var fur = shell.fur;
    var light = shell.light;
    var ear = shell.ear;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // ears
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(-70, -40);
    ctx.lineTo(-110, -120);
    ctx.lineTo(-20, -70);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(70, -40);
    ctx.lineTo(110, -120);
    ctx.lineTo(20, -70);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ear;
    ctx.beginPath();
    ctx.moveTo(-62, -48);
    ctx.lineTo(-92, -100);
    ctx.lineTo(-30, -68);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(62, -48);
    ctx.lineTo(92, -100);
    ctx.lineTo(30, -68);
    ctx.closePath();
    ctx.fill();

    // head
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, 10, 95, 88, 0, 0, Math.PI * 2);
    ctx.fill();

    // muzzle
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(0, 35, 48, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    ctx.fillStyle = '#17120e';
    ctx.beginPath();
    ctx.ellipse(-32, 0, 12, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(32, 0, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-28, -6, 4, 0, Math.PI * 2);
    ctx.arc(36, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    // nose
    ctx.fillStyle = '#e33d6b';
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(-8, 28);
    ctx.lineTo(8, 28);
    ctx.closePath();
    ctx.fill();

    // mouth
    ctx.strokeStyle = '#17120e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-10, 38, 10, 0.1, Math.PI - 0.1);
    ctx.arc(10, 38, 10, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // whiskers
    ctx.strokeStyle = 'rgba(23,18,14,0.45)';
    ctx.lineWidth = 2;
    [[-20, 30, -90, 20], [-20, 38, -95, 40], [-20, 46, -88, 58],
     [20, 30, 90, 20], [20, 38, 95, 40], [20, 46, 88, 58]].forEach(function (w) {
      ctx.beginPath();
      ctx.moveTo(w[0], w[1]);
      ctx.lineTo(w[2], w[3]);
      ctx.stroke();
    });

    ctx.restore();
  }

  function hexAlpha(hex, a) {
    if (!hex || hex[0] !== '#') return 'rgba(230,190,73,' + a + ')';
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function drawGlowOrb(ctx, x, y, r, color, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexAlpha(color, alpha));
    g.addColorStop(0.45, hexAlpha(color, alpha * 0.35));
    g.addColorStop(1, hexAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPostcard(summary) {
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível');

    var shell = SHELLS[summary.shellId] || SHELLS.rosa;
    var tint = summary.speciesTint || shell.accent;
    var motif = summary.speciesMotif || '✦';
    var petEmoji = petEmojiFor(summary);
    var name = summary.name || 'Roda';

    // ─── fundo cinematográfico ───
    var bg = ctx.createLinearGradient(0, 0, W * 0.2, H);
    bg.addColorStop(0, '#050308');
    bg.addColorStop(0.35, shell.bg0);
    bg.addColorStop(0.7, shell.bg1);
    bg.addColorStop(1, '#030205');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // orbes de luz festiva (neon festival)
    drawGlowOrb(ctx, W * 0.18, H * 0.22, 320, tint, 0.45);
    drawGlowOrb(ctx, W * 0.85, H * 0.35, 280, shell.accent, 0.38);
    drawGlowOrb(ctx, W * 0.5, H * 0.72, 360, tint, 0.22);
    drawGlowOrb(ctx, W * 0.12, H * 0.85, 200, shell.accent, 0.2);

    // vinheta
    var vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.5, H * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // confete / partículas festivas
    var confetti = ['✦', '✧', '·', '✶', '✺', motif, '★', '·'];
    for (var i = 0; i < 55; i++) {
      var cx = ((i * 137) + 41) % W;
      var cy = ((i * 89) + 23) % H;
      var size = 12 + (i % 7) * 5;
      ctx.globalAlpha = 0.12 + (i % 5) * 0.06;
      ctx.fillStyle = (i % 3 === 0) ? tint : shell.accent;
      ctx.font = size + 'px serif';
      ctx.textAlign = 'center';
      ctx.fillText(confetti[i % confetti.length], cx, cy);
    }
    ctx.globalAlpha = 1;

    // linhas de luz diagonais (efeito stage)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    for (var L = -4; L < 12; L++) {
      ctx.beginPath();
      ctx.moveTo(L * 120, 0);
      ctx.lineTo(L * 120 + 400, H);
      ctx.stroke();
    }
    ctx.restore();

    // ─── moldura glass ───
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    roundRect(ctx, 40, 40, W - 80, H - 80, 40);
    ctx.fill();
    // borda dupla neon
    ctx.strokeStyle = hexAlpha(tint, 0.85);
    ctx.lineWidth = 3;
    roundRect(ctx, 44, 44, W - 88, H - 88, 38);
    ctx.stroke();
    ctx.strokeStyle = hexAlpha(shell.accent, 0.55);
    ctx.lineWidth = 1.5;
    roundRect(ctx, 56, 56, W - 112, H - 112, 32);
    ctx.stroke();

    // ─── header marca ───
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // chip FASC
    ctx.fillStyle = hexAlpha(shell.accent, 0.18);
    roundRect(ctx, W / 2 - 160, 78, 320, 36, 18);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(shell.accent, 0.55);
    ctx.lineWidth = 1.5;
    roundRect(ctx, W / 2 - 160, 78, 320, 36, 18);
    ctx.stroke();
    ctx.fillStyle = shell.accent;
    ctx.font = '700 20px Oswald, system-ui, sans-serif';
    ctx.letterSpacing = '0.12em';
    ctx.fillText('FASC+  ·  19–22 NOV 2026', W / 2, 102);

    // título CRICRI com glow
    ctx.shadowColor = hexAlpha(tint, 0.7);
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#fff8e7';
    ctx.font = '800 64px Oswald, system-ui, sans-serif';
    ctx.fillText('CRICRI', W / 2, 175);
    ctx.shadowBlur = 0;

    ctx.fillStyle = shell.muted;
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText('São Cristóvão · a cidade em tempo real', W / 2, 210);

    // ─── badge espécie premium ───
    var badgeLabel = ((summary.speciesEmoji || petEmoji) + '   ' + (summary.speciesName || 'CRICRI')).toUpperCase();
    ctx.font = '700 26px Oswald, system-ui, sans-serif';
    var bw = Math.min(560, Math.max(280, ctx.measureText(badgeLabel).width + 64));
    var bx = W / 2 - bw / 2;
    var by = 240;
    var bgrad = ctx.createLinearGradient(bx, by, bx + bw, by + 52);
    bgrad.addColorStop(0, hexAlpha(tint, 0.35));
    bgrad.addColorStop(1, hexAlpha(shell.accent, 0.25));
    ctx.fillStyle = bgrad;
    roundRect(ctx, bx, by, bw, 52, 26);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(tint, 0.9);
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, 52, 26);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(badgeLabel, W / 2, by + 34);

    // ─── stage do pet (spotlight) ───
    var py = 520;
    // outer glow ring
    drawGlowOrb(ctx, W / 2, py, 300, tint, 0.55);
    drawGlowOrb(ctx, W / 2, py, 160, '#ffffff', 0.18);

    // disco de palco
    var disk = ctx.createRadialGradient(W / 2, py, 20, W / 2, py, 250);
    disk.addColorStop(0, hexAlpha(tint, 0.4));
    disk.addColorStop(0.5, hexAlpha(shell.accent, 0.18));
    disk.addColorStop(0.85, 'rgba(0,0,0,0.35)');
    disk.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(W / 2, py, 250, 0, Math.PI * 2);
    ctx.fill();

    // anéis concêntricos
    for (var ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.arc(W / 2, py, 200 + ring * 22, 0, Math.PI * 2);
      ctx.strokeStyle = hexAlpha(ring % 2 ? shell.accent : tint, 0.35 - ring * 0.08);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // faíscas ao redor do pet
    for (var s = 0; s < 16; s++) {
      var ang = (s / 16) * Math.PI * 2;
      var rr = 195 + (s % 3) * 18;
      var sx = W / 2 + Math.cos(ang) * rr;
      var sy = py + Math.sin(ang) * rr * 0.92;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = s % 2 ? tint : shell.accent;
      ctx.font = (14 + (s % 4) * 4) + 'px serif';
      ctx.fillText(s % 3 === 0 ? '✦' : '·', sx, sy);
    }
    ctx.globalAlpha = 1;

    // emoji do animal (com sombra suave)
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(petEmoji, W / 2, py - 6);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // ─── identidade ───
    ctx.textBaseline = 'alphabetic';
    // nome com highlight
    ctx.shadowColor = hexAlpha(tint, 0.55);
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fffdf6';
    ctx.font = '800 62px Oswald, system-ui, sans-serif';
    ctx.fillText(name, W / 2, 780);
    ctx.shadowBlur = 0;

    ctx.fillStyle = shell.muted;
    ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillText(summary.speciesBlurb || 'Companheiro FASC+', W / 2, 820);

    // ─── chips de stats (glassmorphism) ───
    var chips = [];
    chips.push({ label: summary.stageLabel || 'Estágio', sub: 'ESTÁGIO', color: tint });
    chips.push({ label: 'Casca ' + (summary.shellLabel || ''), sub: 'CASCA', color: shell.accent });
    if (summary.formLabel) chips.push({ label: summary.formLabel, sub: 'FORMA', color: tint });
    chips.push({ label: String(summary.careScore || 0), sub: 'CARE', color: shell.accent });

    var chipW = 200;
    var gap = 18;
    var totalW = chips.length * chipW + (chips.length - 1) * gap;
    // se passar, usa 2 linhas
    var startY = 870;
    if (chips.length > 3) {
      chipW = 230;
      gap = 16;
      var row1 = chips.slice(0, 2);
      var row2 = chips.slice(2);
      function drawChipRow(row, y) {
        var tw = row.length * chipW + (row.length - 1) * gap;
        var x0 = W / 2 - tw / 2;
        row.forEach(function (c, idx) {
          var x = x0 + idx * (chipW + gap);
          ctx.fillStyle = 'rgba(12,10,16,0.72)';
          roundRect(ctx, x, y, chipW, 78, 18);
          ctx.fill();
          ctx.strokeStyle = hexAlpha(c.color, 0.65);
          ctx.lineWidth = 1.8;
          roundRect(ctx, x, y, chipW, 78, 18);
          ctx.stroke();
          ctx.fillStyle = hexAlpha(c.color, 0.9);
          ctx.font = '600 14px Oswald, system-ui, sans-serif';
          ctx.fillText(c.sub, x + chipW / 2, y + 26);
          ctx.fillStyle = '#fff';
          ctx.font = '700 24px Oswald, system-ui, sans-serif';
          ctx.fillText(c.label, x + chipW / 2, y + 56);
        });
      }
      drawChipRow(row1, startY);
      drawChipRow(row2, startY + 94);
    } else {
      var x0 = W / 2 - totalW / 2;
      chips.forEach(function (c, idx) {
        var x = x0 + idx * (chipW + gap);
        ctx.fillStyle = 'rgba(12,10,16,0.72)';
        roundRect(ctx, x, startY, chipW, 78, 18);
        ctx.fill();
        ctx.strokeStyle = hexAlpha(c.color, 0.65);
        ctx.lineWidth = 1.8;
        roundRect(ctx, x, startY, chipW, 78, 18);
        ctx.stroke();
        ctx.fillStyle = hexAlpha(c.color, 0.9);
        ctx.font = '600 14px Oswald, system-ui, sans-serif';
        ctx.fillText(c.sub, x + chipW / 2, startY + 26);
        ctx.fillStyle = '#fff';
        ctx.font = '700 24px Oswald, system-ui, sans-serif';
        ctx.fillText(c.label, x + chipW / 2, startY + 56);
      });
    }

    // mutações
    if (summary.mutations && summary.mutations.length) {
      var mutY = chips.length > 3 ? startY + 200 : startY + 110;
      var mutTxt = summary.mutations.map(function (m) {
        return (m.emoji || '✦') + ' ' + (m.name || '');
      }).join('   ·   ');
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, W / 2 - 280, mutY, 560, 44, 22);
      ctx.fill();
      ctx.strokeStyle = hexAlpha(tint, 0.4);
      ctx.lineWidth = 1;
      roundRect(ctx, W / 2 - 280, mutY, 560, 44, 22);
      ctx.stroke();
      ctx.fillStyle = shell.text;
      ctx.font = '600 20px Oswald, system-ui, sans-serif';
      ctx.fillText(mutTxt, W / 2, mutY + 29);
    }

    // ─── footer festivo ───
    ctx.fillStyle = hexAlpha(shell.accent, 0.15);
    roundRect(ctx, W / 2 - 260, H - 120, 520, 52, 26);
    ctx.fill();
    ctx.fillStyle = shell.accent;
    ctx.font = '700 22px Oswald, system-ui, sans-serif';
    ctx.fillText('✦  NA RODA DO FASC+  ✦', W / 2, H - 86);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillText('cricri · são cristóvão / se', W / 2, H - 48);

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao gerar imagem'));
        }, 'image/png');
      } else {
        try {
          var data = canvas.toDataURL('image/png');
          var bin = atob(data.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/png' }));
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'cricri-postal.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  async function sharePostcard() {
    var state = getState();
    var summary = summarize(state);
    if (!summary) {
      throw new Error('Comece a cuidar do seu CRICRI antes de compartilhar.');
    }

    var canvas = drawPostcard(summary);
    var blob = await canvasToBlob(canvas);
    var filename = 'cricri-' + String(summary.name || 'roda').toLowerCase().replace(/[^a-z0-9]+/gi, '-') + '.png';
    var file = null;
    try {
      file = new File([blob], filename, { type: 'image/png' });
    } catch (_) {}

    var shareData = {
      title: 'Meu CRICRI — ' + summary.name,
      text: (summary.speciesEmoji || petEmojiFor(summary)) + ' ' + summary.name +
        (summary.speciesName ? ' · ' + summary.speciesName : '') +
        (summary.formLabel ? ' · ' + summary.formLabel : '') +
        ' · ' + (summary.stageLabel || '') +
        ' · Casca ' + (summary.shellLabel || '') +
        ' · FASC+ 19–22/11/2026 · São Cristóvão'
    };

    // 1) Share com arquivo (mobile Chrome/Safari moderno)
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        shareData.files = [file];
        await navigator.share(shareData);
        return { method: 'share-file' };
      } catch (e) {
        if (e && e.name === 'AbortError') return { method: 'aborted' };
        // cai no fallback de download
      }
    }
    // 2) Share só texto + download da imagem
    if (navigator.share) {
      try {
        var textOnly = { title: shareData.title, text: shareData.text };
        await navigator.share(textOnly);
        downloadBlob(blob, filename);
        return { method: 'share-text+download' };
      } catch (e) {
        if (e && e.name === 'AbortError') return { method: 'aborted' };
        downloadBlob(blob, filename);
        return { method: 'download' };
      }
    }

    // 3) Desktop / sem Web Share → download direto
    downloadBlob(blob, filename);
    return { method: 'download' };
  }

  function wireButton(btn) {
    if (!btn || btn.dataset.postcardBound === '1') return;
    btn.dataset.postcardBound = '1';
    btn.addEventListener('click', async function () {
      var prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Gerando…';
      try {
        var r = await sharePostcard();
        if (r.method === 'download' || r.method === 'share-text+download') {
          btn.textContent = 'Baixado ✓';
        } else if (r.method === 'aborted') {
          btn.textContent = prev;
        } else {
          btn.textContent = 'Compartilhado ✓';
        }
        setTimeout(function () {
          btn.textContent = prev;
          btn.disabled = false;
        }, 1600);
      } catch (e) {
        btn.textContent = prev;
        btn.disabled = false;
        alert(e.message || 'Não foi possível gerar o cartão.');
      }
    });
  }

  function boot() {
    var btn = document.getElementById('btn-share-cricri');
    if (!btn) return;
    function syncVisibility() {
      var s = getState();
      btn.hidden = !(s && s.started);
    }
    syncVisibility();
    wireButton(btn);
    // re-checa ao focar a aba / storage (start em outra aba) / após start local
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') syncVisibility();
    });
    global.addEventListener('storage', function (e) {
      if (!e.key || e.key.indexOf('tama') !== -1 || e.key.indexOf('cricri-tama') !== -1) {
        syncVisibility();
      }
    });
    // start no mesmo documento: botão Start (data-action=start) grava state
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest
        ? e.target.closest('[data-action="start"], .btn-start, #btn-start')
        : null;
      if (t) {
        setTimeout(syncVisibility, 200);
        setTimeout(syncVisibility, 800);
      }
    });
    setInterval(syncVisibility, 2500);
  }

  global.CricriTamaPostcard = {
    share: sharePostcard,
    draw: function () {
      var s = summarize(getState());
      if (!s) throw new Error('Sem bichinho');
      return drawPostcard(s);
    },
    wire: wireButton
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
