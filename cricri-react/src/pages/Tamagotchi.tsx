import { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { CriSprite } from '../components/CriSprite';
import {
  ageLabel,
  applyAction,
  eventIsOver,
  loadState,
  saveState,
  stageMeta,
  startPet,
  tickState,
  type CareAction,
  type TamaState,
} from '../lib/tamagotchi';
import { FEATURES } from '../lib/features';
import { playSfx } from '../lib/sfx';

const SHELLS: TamaState['shell'][] = ['rosa', 'ocre', 'azul', 'tuxedo'];

function StatBar({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="tama-stat">
      <div className="tama-stat__row">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="tama-stat__track">
        <div
          className="tama-stat__fill"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: tone || 'var(--gold)',
          }}
        />
      </div>
    </div>
  );
}

export function Tamagotchi() {
  const [state, setState] = useState<TamaState>(() => tickState(loadState()));
  const [msg, setMsg] = useState('');
  const [nameInput, setNameInput] = useState('Cri');
  const [shell, setShell] = useState<TamaState['shell']>('rosa');

  // tick periódico
  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        const next = tickState(prev);
        saveState(next);
        return next;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // tick ao focar a aba
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setState((prev) => {
          const next = tickState(prev);
          saveState(next);
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const act = useCallback((action: CareAction) => {
    setState((prev) => {
      const prevStage = prev.stageId;
      const { state: next, message } = applyAction(prev, action);
      setMsg(message);
      if (next.stageId !== prevStage) playSfx('evolve');
      else if (action === 'feed') playSfx('feed');
      else if (action === 'play') playSfx('play');
      else if (action === 'clean') playSfx('clean');
      else if (action === 'sleep') playSfx('sleep');
      else playSfx('click');
      return next;
    });
  }, []);


  if (!FEATURES.tamagotchi) {
    return (
      <div className="page">
        <Header title="Cri Cabrunco" showBack />
        <div className="page-body">
          <p className="page-hint">Tamagotchi desativado neste build.</p>
        </div>
      </div>
    );
  }

  const over = eventIsOver();
  const stage = stageMeta(state.stageId);

  // onboarding
  if (!state.started) {
    return (
      <div className="page">
        <Header title="Cri Cabrunco" showBack />
        <div className="page-body tama-onboard">
          <p className="tama-lead">
            Cuide do <strong>Cri</strong>, o cabrunco de São Cristóvão. Alimente, limpe, brinque e
            evolua até a Anciã.
          </p>

          <label className="field">
            <span>Nome</span>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value.slice(0, 16))}
              maxLength={16}
              placeholder="Cri"
            />
          </label>

          <p className="tama-shell-label">Cor da pelagem</p>
          <div className="tama-shells">
            {SHELLS.map((s) => (
              <button
                key={s}
                type="button"
                className={shell === s ? 'tama-shell tama-shell--on' : 'tama-shell'}
                data-shell={s}
                onClick={() => setShell(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 20 }}
            onClick={() => {
              const s = startPet(nameInput, shell);
              setState(s);
              setMsg(`${s.name} nasceu na roda!`);
            }}
            disabled={over}
          >
            {over ? 'Festival encerrado' : 'Começar'}
          </button>

          {/* Meow OFF — não deletado, só fora deste fluxo */}
          {!FEATURES.meow && (
            <p className="page-hint" style={{ marginTop: 24 }}>
              Caixinha Meow está desligada neste app.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header title={state.name} showBack />
      <div className="tama">
        <div className="tama__hero">
          <CriSprite state={state} />
          <div className="tama__meta">
            <span className="tama__stage">
              {stage.emoji} {stage.label}
            </span>
            <span className="tama__age">{ageLabel(state.bornAt)}</span>
            <span className="tama__care">Care {state.careScore}</span>
          </div>
          {state.sleeping && <p className="tama__status">Zzz… dormindo</p>}
          {!state.alive && <p className="tama__status tama__status--dead">Descansando em paz</p>}
          {state.sick && state.alive && <p className="tama__status tama__status--sick">Precisa de cuidado</p>}
          {msg && <p className="tama__msg">{msg}</p>}
          {over && (
            <p className="tama__status">
              A roda fechou. Obrigado por ficar com o Cri até o fim.
            </p>
          )}
        </div>

        <div className="tama__stats">
          <StatBar label="Fome" value={state.hunger} tone="#d49a2c" />
          <StatBar label="Felicidade" value={state.happy} tone="#e33d6b" />
          <StatBar label="Energia" value={state.energy} tone="#5eb0d4" />
          <StatBar label="Higiene" value={state.hygiene} tone="#3E8F5F" />
          <StatBar label="Saúde" value={state.health} tone="#C1523E" />
        </div>

        <div className="tama__actions">
          <button type="button" className="tama-btn" disabled={!state.alive || over} onClick={() => act('feed')}>
            🥟 Comer
          </button>
          <button type="button" className="tama-btn" disabled={!state.alive || over} onClick={() => act('play')}>
            🎉 Brincar
          </button>
          <button type="button" className="tama-btn" disabled={!state.alive || over} onClick={() => act('clean')}>
            🧼 Limpar
          </button>
          {state.sleeping ? (
            <button type="button" className="tama-btn" disabled={!state.alive || over} onClick={() => act('wake')}>
              ☀️ Acordar
            </button>
          ) : (
            <button type="button" className="tama-btn" disabled={!state.alive || over} onClick={() => act('sleep')}>
              😴 Dormir
            </button>
          )}
        </div>

        <p className="page-hint" style={{ padding: '8px 16px 24px' }}>
          Progresso salvo neste aparelho (mesmo save do app vanilla, se já usou).
          {!FEATURES.meow && ' · Meow desligado.'}
        </p>
      </div>
    </div>
  );
}
