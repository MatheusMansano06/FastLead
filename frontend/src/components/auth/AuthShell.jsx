import { Link } from 'react-router-dom';
import { LogoWordmark, LogoMark } from '../landing/Logo';

// Two-column branded auth layout in the landing style.
// The left panel changes accent/copy per persona ("empresa" | "motorista").
// theme.accent drives buttons/links across the whole auth flow.

export const AUTH_THEMES = {
  empresa: {
    key: 'empresa',
    accent: '#2563FF', // brand blue
    accentSoft: 'rgba(37,99,255,0.12)',
    label: 'Anunciante',
    panelFrom: '#0B1D3A',
    panelTo: '#123a86',
    glow: 'rgba(37,99,255,0.55)',
    eyebrow: 'Área do anunciante',
    title: 'Sua marca em cada corrida.',
    subtitle:
      'Gerencie campanhas, acompanhe leads em tempo real e fale direto com quem escaneou o QR — sem intermediário.',
    bullets: [
      'Campanhas em telas premium dentro dos veículos',
      'Relatórios de acesso, QR e leads potenciais',
      'Segmentação por cidade, período e nº de veículos',
    ],
  },
  motorista: {
    key: 'motorista',
    accent: '#0a9d6c', // mint/green
    accentSoft: 'rgba(10,157,108,0.12)',
    label: 'Motorista parceiro',
    panelFrom: '#06281d',
    panelTo: '#0a9d6c',
    glow: 'rgba(0,201,138,0.55)',
    eyebrow: 'Área do motorista',
    title: 'Renda extra que anda com você.',
    subtitle:
      'Acompanhe seus ganhos por lead, o status do tablet e seus repasses — tudo enquanto você roda a cidade.',
    bullets: [
      'Ganhe por lead convertido em cada corrida',
      'Tablet FastLead no banco de trás, pronto pra rodar',
      'Relatório mensal de acessos e repasses no app',
    ],
  },
};

function Check({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export default function AuthShell({ theme, children, footer }) {
  const t = typeof theme === 'string' ? AUTH_THEMES[theme] : theme;

  return (
    <div className="relative min-h-screen w-full bg-[#f4f5f7] text-ink lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ─── Brand panel (persona-specific) ─── */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{
          background: `linear-gradient(150deg, ${t.panelFrom} 0%, ${t.panelTo} 100%)`,
        }}
      >
        {/* glow blobs */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl"
          style={{ background: t.glow, opacity: 0.35 }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full blur-3xl"
          style={{ background: t.glow, opacity: 0.22 }}
        />

        <Link to="/" className="relative z-10 no-underline">
          <LogoWordmark dark />
        </Link>

        <div className="relative z-10 max-w-md">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
            {t.eyebrow}
          </span>
          <h1 className="mt-4 font-grotesk text-4xl font-bold leading-[1.08] tracking-tight text-white xl:text-5xl">
            {t.title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/70">{t.subtitle}</p>

          <ul className="mt-8 space-y-3">
            {t.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-sm text-white/85">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <Check className="h-3 w-3 text-white" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} FastLead · Publicidade que anda com a cidade
        </p>
      </aside>

      {/* ─── Form column ─── */}
      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-8 md:px-12 lg:py-12">
        {/* mobile top bar */}
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link to="/" className="no-underline">
            <LogoWordmark dark={false} />
          </Link>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ background: t.accentSoft, color: t.accent }}
          >
            {t.label}
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>

        {footer && (
          <div className="mx-auto mt-8 w-full max-w-md text-center text-sm text-ink/55">
            {footer}
          </div>
        )}
      </main>
    </div>
  );
}

export { LogoMark };
