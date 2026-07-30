import { useNavigate } from 'react-router-dom';
import { LogoWordmark } from '../landing/Logo';
import { useAuthStore } from '../../stores/authStore';

// Top bar for the logged-in area. `accent` + `badge` differentiate the persona.
export default function AppHeader({ accent = '#2563FF', badge = 'Anunciante', nav = [], active, onNav }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const name = user?.name || user?.fullName || user?.email?.split('@')[0] || 'Você';
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  const doLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <LogoWordmark />
          <span className="hidden rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] sm:inline"
            style={{ background: `${accent}18`, color: accent }}>
            {badge}
          </span>
        </div>

        {nav.length > 0 && (
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n, i) => {
              const isActive = active != null ? n === active : i === 0;
              return (
                <button
                  key={n}
                  onClick={() => onNav && onNav(n)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${isActive ? 'text-ink' : 'text-ink/50 hover:text-ink'}`}
                  style={isActive ? { background: `${accent}14`, color: accent } : undefined}
                >
                  {n}
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">{name}</p>
            <p className="text-xs leading-tight text-ink/45">{user?.email}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: accent }}>
            {initials || '·'}
          </span>
          <button onClick={doLogout} title="Sair"
            className="rounded-full border border-black/10 p-2 text-ink/50 transition hover:bg-black/5 hover:text-ink">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
