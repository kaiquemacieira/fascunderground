import { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { CriSprite } from '../components/CriSprite';
import {
  SPECIES,
  ageLabel,
  applyAction,
  defaultState,
  displayEmoji,
  eventIsOver,
  loadState,
  nextStageInfo,
  saveState,
  speciesById,
  stageMeta,
  startPet,
  tickState,
  type CareAction,
  type SpeciesId,
  type TamaState,
} from '../lib/tamagotchi';
import { playSfx } from '../lib/sfx';

const SHELLS: TamaState['shell'][] = ['rosa', 'ocre', 'azul', 'tuxedo'];

function safeLoad(): TamaState {
  try {
    return tickState(loadState());
  } catch {
    try {
      localStorage.removeItem('cricri-tama-v3');
    } catch {
      /* */
    }
    return defaultState();
  }
}

function StatBar({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const v = Number.isFinite(value) ? value : 0;
  return (
    <div className="tama-stat">
      <div className="tama-stat__row">
        <span>{label}</span>
        <span>{Math.round(v)}</span>
      </div>
      <div className="tama-stat__track">
        <div
          className="tama-stat__fill"
          style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: tone || 'var(--gold)' }}
        />
      </div>
    </div>
  );
}

export function Tamagotchi() {
  const [state, setState] = useState<TamaState>(safeLoad);
  const [msg, setMsg] = useState('');
  const [nameInput, setNameInput] = useState('Cri');
  const [shell, setShell] = useState<TamaState['shell']>('rosa');
  const [speciesId, setSpeciesId] = useState<SpeciesId>('gato');
  const [evolving, setEvolving] = useState(false);

  useEffect(() => {
    setState(safeLoad());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => {
        const next = tickState(prev);
        saveState(next);
        return next;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const act = useCallback((action: CareAction) => {
    setState((prev) => {
      const prevStage = prev.stageId;
      const { state: next, message } = applyAction(prev, action);
      setMsg(message);
      if (next.stageId !== prevStage) {
        setEvolving(true);
        playSfx('evolve');
        setTimeout(() => setEvolving(false), 1200);
      } else if (action === 'feed') playSfx('feed');
      else if (action === 'play') playSfx('play');
      else if (action === 'clean') playSfx('clean');
      else if (action === 'sleep') playSfx('sleep');
      else playSfx('click');
      return next;
    });
  }, []);

  const over = eventIsOver();
  const stage = stageMeta(state.stageId);
  const sp = speciesById(state.speciesId);
  const nextInfo = nextStageInfo(state);
  const isEgg = state.started && state.stageId === 'ovo';

  if (!state.started) {
    return (
      <div className="page">
        <Header title="Cri Cabrunco" showBack />
        <div className="page-body tama-onboard">
          <p className="tama-lead">
            Escolha o bichinho. Começa no <strong>ovo</strong> e, com cuidado (3 ações), quebra a casca
            e aparece de verdade — com animação.
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

          <p className="tama-shell-label">Bichinho</p>
          <div className="tama-species">
            {SPECIES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={
                  speciesId === s.id ? 'tama-species__btn tama-species__btn--on' : 'tama-species__btn'
                }
                onClick={() => setSpeciesId(s.id)}
              >
                <span className="tama-species__emoji">{s.emoji}</span>
                <span className="tama-species__name">{s.name}</span>
              </button>
            ))}
          </div>

          <p className="tama-shell-label">Cor</p>
          <div className="tama-shells">
            {SHELLS.map((s) => (
              <button
                key={s}
                type="button"
                className={shell === s ? 'tama-shell tama-shell--on' : 'tama-shell'}
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
            disabled={over}
            onClick={() => {
              const s = startPet(nameInput || 'Cri', shell, speciesId);
              setState(s);
              setMsg(`Ovo do ${speciesById(speciesId).name} — cuide para ele nascer!`);
              playSfx('success');
            }}
          >
            {over ? 'Festival encerrado' : 'Começar no ovo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header title={state.name || 'Cri'} showBack />
      <div className="tama">
        <div className="tama__hero">
          <CriSprite state={state} evolving={evolving} />

          {/* Barra de evolução ovo → bichinho / próximo estágio */}
          {nextInfo && (
            <div className="evo-bar">
              <div className="evo-bar__labels">
                <span>
                  {nextInfo.fromEmoji} {nextInfo.fromLabel}
                </span>
                <span>
                  {isEgg ? `${sp.emoji} ${sp.name}` : `${nextInfo.toEmoji} ${nextInfo.label}`}
                </span>
              </div>
              <div className="evo-bar__track">
                <div className="evo-bar__fill" style={{ width: `${nextInfo.progress}%` }} />
              </div>
              <p className="evo-bar__hint">
                {isEgg
                  ? nextInfo.need > 0
                    ? `Faltam ${nextInfo.need} cuidados para o ovo quebrar`
                    : 'Quase saindo do ovo…'
                  : nextInfo.need > 0
                    ? `Faltam ${nextInfo.need} care para ${nextInfo.label}`
                    : `Pronto para ${nextInfo.label}`}
              </p>
            </div>
          )}

          <div className="tama__meta">
            <span className="tama__stage">
              {displayEmoji(state)} {stage.label}
              {!isEgg ? ` · ${sp.name}` : ''}
            </span>
            <span className="tama__age">{ageLabel(state.bornAt)}</span>
            <span className="tama__care">Care {state.careScore}</span>
          </div>

          {state.sleeping && <p className="tama__status">Zzz…</p>}
          {!state.alive && <p className="tama__status tama__status--dead">Descansando em paz</p>}
          {msg && <p className="tama__msg">{msg}</p>}
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

        <p className="page-hint" style={{ textAlign: 'center', paddingBottom: 24 }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '0.8rem' }}
            onClick={() => {
              if (confirm('Resetar o Cri neste aparelho?')) {
                localStorage.removeItem('cricri-tama-v3');
                setState(defaultState());
                setMsg('');
              }
            }}
          >
            Resetar Cri
          </button>
        </p>
      </div>
    </div>
  );
}
