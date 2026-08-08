import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function Header({ title = 'CRICRI', showBack, right }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="app-header__left">
        {showBack ? (
          <button className="app-header__back" onClick={() => navigate(-1)} aria-label="Voltar">
            ←
          </button>
        ) : (
          <span className="app-header__logo">CRICRI</span>
        )}
      </div>
      {title && title !== 'CRICRI' && <h1 className="app-header__title">{title}</h1>}
      <div className="app-header__right">{right}</div>
    </header>
  );
}
