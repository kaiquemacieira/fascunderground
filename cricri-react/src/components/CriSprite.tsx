import type { TamaState } from '../lib/tamagotchi';
import { shellColors, stageMeta } from '../lib/tamagotchi';

interface Props {
  state: TamaState;
}

/** Sprite SVG simples do Cri — cores pela shell, emoji pelo estágio */
export function CriSprite({ state }: Props) {
  const colors = shellColors(state.shell);
  const stage = stageMeta(state.stageId);
  const eyesShut = state.sleeping || !state.alive;

  return (
    <div className="cri-sprite" aria-hidden>
      <svg viewBox="0 0 200 200" width="180" height="180">
        {/* corpo */}
        <ellipse cx="100" cy="118" rx="58" ry="52" fill={colors.fur} />
        <ellipse cx="100" cy="125" rx="36" ry="28" fill={colors.light} opacity="0.9" />
        {/* orelhas */}
        <ellipse cx="62" cy="72" rx="18" ry="24" fill={colors.fur} />
        <ellipse cx="138" cy="72" rx="18" ry="24" fill={colors.fur} />
        <ellipse cx="62" cy="74" rx="9" ry="12" fill={colors.light} />
        <ellipse cx="138" cy="74" rx="9" ry="12" fill={colors.light} />
        {/* cabeça */}
        <circle cx="100" cy="88" r="44" fill={colors.fur} />
        {/* olhos */}
        {eyesShut ? (
          <>
            <path d="M78 90 Q88 96 98 90" stroke="#1a1210" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M102 90 Q112 96 122 90" stroke="#1a1210" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="88" cy="90" r="6" fill="#1a1210" />
            <circle cx="112" cy="90" r="6" fill="#1a1210" />
            <circle cx="90" cy="88" r="2" fill="#fff" />
            <circle cx="114" cy="88" r="2" fill="#fff" />
          </>
        )}
        {/* nariz / boca */}
        <ellipse cx="100" cy="102" rx="5" ry="3.5" fill="#1a1210" opacity="0.7" />
        {!state.alive && (
          <text x="100" y="70" textAnchor="middle" fontSize="28">
            💀
          </text>
        )}
      </svg>
      <div className="cri-sprite__badge">
        <span className="cri-sprite__emoji">{stage.emoji}</span>
        <span className="cri-sprite__stage">{stage.label}</span>
      </div>
    </div>
  );
}
