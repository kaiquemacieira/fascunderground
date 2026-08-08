import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { SpotsMap } from '../components/SpotsMap';
import { searchProfiles } from '../lib/profile';
import { fetchSpots, statusKind, type Spot } from '../lib/spots';
import type { Profile } from '../types';

type Tab = 'mapa' | 'pessoas';

export function Explore() {
  const [tab, setTab] = useState<Tab>('mapa');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSpotsLoading(true);
      const list = await fetchSpots();
      if (!cancelled) {
        setSpots(list);
        setSpotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'pessoas') return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const list = await searchProfiles(q);
        setResults(list);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => clearTimeout(t);
  }, [query, tab]);

  const onSelectSpot = useCallback((spot: Spot) => {
    setSelectedId(spot.id);
  }, []);

  return (
    <div className="page page--explore">
      <Header title="Explorar" />

      <div className="explore-tabs">
        <button
          type="button"
          className={tab === 'mapa' ? 'explore-tab explore-tab--active' : 'explore-tab'}
          onClick={() => setTab('mapa')}
        >
          Mapa
        </button>
        <button
          type="button"
          className={tab === 'pessoas' ? 'explore-tab explore-tab--active' : 'explore-tab'}
          onClick={() => setTab('pessoas')}
        >
          Pessoas
        </button>
      </div>

      {tab === 'mapa' && (
        <div className="explore-map">
          {spotsLoading ? (
            <p className="page-hint" style={{ padding: 16 }}>
              Carregando mapa…
            </p>
          ) : (
            <>
              <SpotsMap spots={spots} selectedId={selectedId} onSelect={onSelectSpot} />
              <ul className="spots-list">
                {spots.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={
                        selectedId === s.id
                          ? 'spots-list__item spots-list__item--active'
                          : 'spots-list__item'
                      }
                      onClick={() => setSelectedId(s.id)}
                    >
                      <MapPin
                        size={18}
                        strokeWidth={1.8}
                        className={`spot-pin spot-pin--${statusKind(s.status)}`}
                      />
                      <div className="spots-list__meta">
                        <span className="spots-list__name">{s.name}</span>
                        <span
                          className={`spots-list__status spots-list__status--${statusKind(s.status)}`}
                        >
                          {s.status}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'pessoas' && (
        <div className="page-body explore">
          <div className="search-box">
            <Search size={18} strokeWidth={1.8} />
            <input
              type="search"
              placeholder="Buscar pessoas por nome ou @handle…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="page-hint">Digite pelo menos 2 caracteres.</p>
          )}

          {searching && <p className="page-hint">Buscando…</p>}

          {!searching && searched && results.length === 0 && (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <p>Ninguém encontrado</p>
              <span>Tente outro nome ou handle.</span>
            </div>
          )}

          {!searching && results.length > 0 && (
            <ul className="people-list">
              {results.map((p) => {
                const name = p.display_name || p.username || 'Usuário';
                const handle = p.username ? `@${p.username}` : null;
                return (
                  <li key={p.id}>
                    <Link to={`/perfil/${p.id}`} className="people-list__item">
                      <Avatar src={p.avatar_url} name={name} size="md" />
                      <div className="people-list__meta">
                        <span className="people-list__name">{name}</span>
                        {handle && <span className="people-list__handle">{handle}</span>}
                        {p.bio && <span className="people-list__bio">{p.bio}</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {!query.trim() && (
            <p className="page-hint">Busque pessoas do CRICRI pelo nome ou handle.</p>
          )}
        </div>
      )}
    </div>
  );
}
