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
      return global.CricriTamaRead.summarize(s);
    }
    if (!s || !s.started) return null;
    var sid = s.stageId || 'ovo';
    var shellId = s.shell || 'rosa';
    return {
      name: String(s.name || 'Roda').slice(0, 24),
      stageId: sid,
      stageLabel: STAGE_LABEL[sid] || sid,
      shellId: shellId,
      shellLabel: (SHELLS[shellId] && SHELLS[shellId].label) || shellId,
      careScore: Number(s.careScore) || 0,
      emoji: STAGE_EMOJI[sid] || '🐾',
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

  function drawPostcard(summary) {
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível');

    var shell = SHELLS[summary.shellId] || SHELLS.rosa;

    // background — cores da casca
    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, shell.bg0);
    grad.addColorStop(0.45, shell.bg1);
    grad.addColorStop(1, shell.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // decorative dots
    ctx.fillStyle = shell.accentSoft;
    for (var i = 0; i < 40; i++) {
      var dx = (i * 97) % W;
      var dy = (i * 53) % H;
      ctx.beginPath();
      ctx.arc(dx, dy, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }

    // frame
    ctx.strokeStyle = shell.frame;
    ctx.lineWidth = 8;
    roundRect(ctx, 48, 48, W - 96, H - 96, 36);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242,232,210,0.18)';
    ctx.lineWidth = 2;
    roundRect(ctx, 64, 64, W - 128, H - 128, 28);
    ctx.stroke();

    // brand
    ctx.fillStyle = shell.accent;
    ctx.font = '700 42px Oswald, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRICRI', W / 2, 140);

    ctx.fillStyle = shell.text;
    ctx.font = '600 28px Oswald, system-ui, sans-serif';
    ctx.fillText(FESTIVAL, W / 2, 190);

    ctx.fillStyle = shell.muted;
    ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillText(DATES, W / 2, 230);

    // pet circle backdrop
    ctx.fillStyle = shell.accentSoft;
    ctx.beginPath();
    ctx.arc(W / 2, 520, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shell.fur;
    ctx.lineWidth = 6;
    ctx.stroke();

    // cat
    if (summary.stageId === 'ovo') {
      ctx.font = '200px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🥚', W / 2, 520);
    } else {
      drawCat(ctx, W / 2, 530, 1.55, shell);
    }

    // name
    ctx.fillStyle = shell.text;
    ctx.font = '700 56px Oswald, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(summary.name || 'Roda', W / 2, 820);

    // meta pills — borda na cor da casca
    ctx.font = '600 26px Oswald, system-ui, sans-serif';
    var meta = [
      (STAGE_EMOJI[summary.stageId] || '🐾') + '  ' + (summary.stageLabel || summary.stageId),
      'Casca ' + (summary.shellLabel || summary.shellId),
      'Care ' + String(summary.careScore || 0)
    ];
    var pillY = 880;
    meta.forEach(function (line, idx) {
      var y = pillY + idx * 52;
      ctx.fillStyle = 'rgba(20,16,14,0.72)';
      roundRect(ctx, W / 2 - 220, y - 32, 440, 44, 22);
      ctx.fill();
      ctx.strokeStyle = shell.frame;
      ctx.lineWidth = 2;
      roundRect(ctx, W / 2 - 220, y - 32, 440, 44, 22);
      ctx.stroke();
      ctx.fillStyle = shell.text;
      ctx.fillText(line, W / 2, y);
    });

    // footer
    ctx.fillStyle = shell.muted;
    ctx.font = '400 22px system-ui, sans-serif';
    ctx.fillText('São Cristóvão / SE · cricri na roda', W / 2, H - 90);

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
      text: summary.name + ' · ' + (summary.stageLabel || '') + ' · FASC+ 19–22/11/2026 · São Cristóvão'
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
