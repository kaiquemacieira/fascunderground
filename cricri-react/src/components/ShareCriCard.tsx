import { useRef, useState } from 'react';
import type { TamaState } from '../lib/tamagotchi';
import { displayEmoji, speciesById, stageMeta } from '../lib/tamagotchi';
import { playSfx } from '../lib/sfx';

interface Props {
  state: TamaState;
}

/** Gera PNG do card festival e compartilha / baixa */
export function ShareCriCard({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  const sp = speciesById(state.speciesId);
  const stage = stageMeta(state.stageId);
  const emoji = displayEmoji(state);
  const isEgg = state.stageId === 'ovo';

  async function drawCard(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = 1080;
    const h = 1350;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // fundo festival
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a0f0c');
    grad.addColorStop(0.45, '#3d1810');
    grad.addColorStop(1, '#0c0a08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // vinheta
    const vig = ctx.createRadialGradient(w / 2, h * 0.4, 80, w / 2, h * 0.4, 700);
    vig.addColorStop(0, 'rgba(193,82,62,0.28)');
    vig.addColorStop(1, 'transparent');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // moldura dourada
    ctx.strokeStyle = 'rgba(212,154,44,0.55)';
    ctx.lineWidth = 6;
    roundRect(ctx, 48, 48, w - 96, h - 96, 40);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(250,244,234,0.12)';
    ctx.lineWidth = 2;
    roundRect(ctx, 64, 64, w - 128, h - 128, 32);
    ctx.stroke();

    // selo topo
    ctx.fillStyle = 'rgba(193,82,62,0.9)';
    roundRect(ctx, w / 2 - 160, 100, 320, 56, 28);
    ctx.fill();
    ctx.fillStyle = '#FAF4EA';
    ctx.font = '700 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRICRI · SÃO CRISTÓVÃO', w / 2, 138);

    // emoji enorme
    ctx.font = '200px serif';
    ctx.fillText(emoji, w / 2, 420);

    // nome
    ctx.fillStyle = '#FAF4EA';
    ctx.font = '800 64px Inter, system-ui, sans-serif';
    ctx.fillText(state.name || 'Cri', w / 2, 560);

    // espécie / estágio
    ctx.fillStyle = 'rgba(250,244,234,0.75)';
    ctx.font = '600 36px Inter, system-ui, sans-serif';
    const line = isEgg
      ? `🥚 Ovo · vai nascer ${sp.emoji} ${sp.name}`
      : `${sp.emoji} ${sp.name} · ${stage.label}`;
    ctx.fillText(line, w / 2, 620);

    // pills stats
    const pills = [
      `Care ${state.careScore}`,
      `❤️ ${Math.round(state.happy)}`,
      `⚡ ${Math.round(state.energy)}`,
    ];
    let px = w / 2 - (pills.length * 140) / 2;
    pills.forEach((label) => {
      ctx.fillStyle = 'rgba(250,244,234,0.1)';
      roundRect(ctx, px, 680, 128, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#FAF4EA';
      ctx.font = '600 24px Inter, system-ui, sans-serif';
      ctx.fillText(label, px + 64, 712);
      px += 140;
    });

    // faixa festival
    ctx.fillStyle = 'rgba(212,154,44,0.15)';
    roundRect(ctx, 120, 780, w - 240, 120, 20);
    ctx.fill();
    ctx.fillStyle = '#d49a2c';
    ctx.font = '700 28px Inter, system-ui, sans-serif';
    ctx.fillText('Festival de Artes · SE', w / 2, 830);
    ctx.fillStyle = 'rgba(250,244,234,0.7)';
    ctx.font = '400 24px Inter, system-ui, sans-serif';
    ctx.fillText(
      isEgg ? 'Estou chocando meu Cri na roda' : 'Meu companheiro na roda CRICRI',
      w / 2,
      875
    );

    // rodapé
    ctx.fillStyle = 'rgba(250,244,234,0.45)';
    ctx.font = '500 22px Inter, system-ui, sans-serif';
    ctx.fillText('App independente · cricri na cidade', w / 2, 1240);
    ctx.fillStyle = 'rgba(193,82,62,0.9)';
    ctx.font = '700 26px Inter, system-ui, sans-serif';
    ctx.fillText('Cuide. Evolua. Compartilhe.', w / 2, 1285);

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
    });
  }

  async function share() {
    setBusy(true);
    setHint('');
    try {
      playSfx('click');
      const blob = await drawCard();
      if (!blob) throw new Error('Falha ao gerar card');

      const file = new File([blob], `cri-${state.name || 'cabrunco'}.png`, {
        type: 'image/png',
      });
      const text = isEgg
        ? `Meu Cri está no ovo no CRICRI 🥚 — vou cuidar até nascer ${sp.emoji} ${sp.name}!`
        : `Esse é ${state.name}, meu ${sp.name} ${sp.emoji} no CRICRI · ${stage.label}!`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Meu Cri · CRICRI',
          text,
        });
        setHint('Compartilhado!');
      } else if (navigator.share) {
        await navigator.share({ title: 'Meu Cri · CRICRI', text });
        // ainda baixa a imagem
        downloadBlob(blob, file.name);
        setHint('Texto compartilhado · imagem baixada');
      } else {
        downloadBlob(blob, file.name);
        setHint('Card baixado — envie no Stories ou WhatsApp');
      }
      playSfx('success');
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setHint('');
      } else {
        setHint('Não foi possível compartilhar. Tente de novo.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-cri">
      <canvas ref={canvasRef} className="share-cri__canvas" aria-hidden />
      <button
        type="button"
        className="share-cri__btn"
        disabled={busy || !state.started}
        onClick={share}
      >
        {busy ? 'Gerando card…' : '✨ Compartilhar Cri'}
      </button>
      {hint && <p className="share-cri__hint">{hint}</p>}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
