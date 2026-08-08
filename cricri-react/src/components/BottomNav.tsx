import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Cat, User, Plus } from 'lucide-react';
import clsx from 'clsx';
import { playSfx } from '../lib/sfx';
import { subscribeNotifs } from '../lib/notifications';

const items = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/explorar', icon: Search, label: 'Explorar' },
  { to: '/compose', icon: Plus, label: 'Publicar', primary: true },
  { to: '/tamagotchi', icon: Cat, label: 'Cri' },
  { to: '/perfil', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  const [unread, setUnread] = useState(0);

  useEffect(() => subscribeNotifs((s) => setUnread(s.unread)), []);

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map(({ to, icon: Icon, label, primary }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => playSfx('click')}
          className={({ isActive }) =>
            clsx(
              'bottom-nav__item',
              isActive && 'bottom-nav__item--active',
              primary && 'bottom-nav__item--primary'
            )
          }
          end={to === '/'}
        >
          <span className="bottom-nav__icon">
            <Icon size={primary ? 22 : 24} strokeWidth={primary ? 2.2 : 1.8} />
            {to === '/perfil' && unread > 0 && (
              <span className="nav-badge" aria-label={`${unread} avisos`}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
