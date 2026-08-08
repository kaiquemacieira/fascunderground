import type { TamaState } from '../lib/tamagotchi';
import { displayEmoji, shellColors, speciesById, stageMeta } from '../lib/tamagotchi';

interface Props {
  state: TamaState;
  /** pulse ao evoluir */
  evolving?: boolean;
}

export function CriSprite({ state, evolving }: Props) {
  const colors = shellColors(state.shell);
  const stage = stageMeta(state.stageId);
  const sp = speciesById(state.speciesId);
  const emoji = displayEmoji(state);
  const isEgg = !state.started || state.stageId === 'ovo';
  const animClass = !isEgg && state.alive && !state.sleeping ? sp.anim : '';

  return (
    <div
      className={`cri-sprite ${evolving ? 'cri-sprite--evolve' : ''} ${state.sleeping ? 'cri-sprite--sleep' : ''}`}
      aria-hidden
    >
      <div
        className={`cri-sprite__face ${isEgg ? 'cri-sprite__face--egg' : ''} ${animClass}`}
        style={{ ['--fur' as string]: colors.fur }}
      >
        <span className="cri-sprite__emoji">{emoji}</span>
        {!isEgg && state.alive && (
          <span className="cri-sprite__glow" style={{ background: colors.light }} />
        )}
      </div>
      <div className="cri-sprite__badge">
        <span>{isEgg ? '🥚' : sp.emoji}</span>
        <span className="cri-sprite__stage">
          {stage.label}
          {!isEgg ? ` · ${sp.name}` : ' · chocando'}
        </span>
      </div>
    </div>
  );
}
