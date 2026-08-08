import type { TamaState } from '../lib/tamagotchi';
import { displayEmoji, shellColors, speciesById, stageMeta } from '../lib/tamagotchi';

interface Props {
  state: TamaState;
}

export function CriSprite({ state }: Props) {
  const colors = shellColors(state.shell);
  const stage = stageMeta(state.stageId);
  const sp = speciesById(state.speciesId);
  const eyesShut = state.sleeping || !state.alive;
  const emoji = displayEmoji(state);

  return (
    <div className="cri-sprite" aria-hidden>
      <div className="cri-sprite__emoji-face" style={{ fontSize: state.stageId === 'ovo' ? 72 : 64 }}>
        {emoji}
      </div>
      <svg viewBox="0 0 200 200" width="160" height="100" style={{ marginTop: -24 }}>
        <ellipse cx="100" cy="70" rx="50" ry="28" fill={colors.fur} opacity="0.85" />
        <ellipse cx="100" cy="78" rx="30" ry="16" fill={colors.light} opacity="0.9" />
        {!eyesShut && state.alive && state.stageId !== 'ovo' && (
          <>
            <circle cx="88" cy="68" r="3" fill="#1a1210" />
            <circle cx="112" cy="68" r="3" fill="#1a1210" />
          </>
        )}
      </svg>
      <div className="cri-sprite__badge">
        <span className="cri-sprite__emoji">{stage.emoji}</span>
        <span className="cri-sprite__stage">
          {stage.label}
          {state.speciesId && state.stageId !== 'ovo' ? ` · ${sp.name}` : ''}
        </span>
      </div>
    </div>
  );
}
