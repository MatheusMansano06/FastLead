import { Link } from 'react-router-dom';
import { LogoWordmark } from '../../components/landing/Logo';

// Persona chooser used for both "entrar" (login) and "cadastro" (register).
// mode: 'login' | 'cadastro'
export default function AccessHub({ mode = 'login' }) {
  const isLogin = mode === 'login';
  const base = isLogin ? '/entrar' : '/cadastro';

  const options = [
    {
      key: 'empresa',
      eyebrow: 'Anunciante',
      title: 'Sou uma empresa',
      desc: isLogin
        ? 'Acesse o painel de campanhas, leads e relatórios.'
        : 'Coloque sua marca nas telas dentro dos veículos.',
      accent: '#2563FF',
      glow: 'rgba(37,99,255,0.55)',
      to: `${base}/empresa`,
      cta: isLogin ? 'Entrar como empresa' : 'Cadastrar empresa',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
        </svg>
      ),
    },
    {
      key: 'motorista',
      eyebrow: 'Motorista parceiro',
      title: 'Sou motorista',
      desc: isLogin
        ? 'Veja seus ganhos, repasses e o status do tablet.'
        : 'Fature com cada anúncio exibido durante as corridas.',
      accent: '#0a9d6c',
      glow: 'rgba(0,201,138,0.55)',
      to: `${base}/motorista`,
      cta: isLogin ? 'Entrar como motorista' : 'Cadastrar como motorista',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17h14M6.5 17l1-5.5A2 2 0 0 1 9.46 10h5.08a2 2 0 0 1 1.96 1.5L17.5 17" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /><path d="M3 11h18" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0B1D3A] text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-mint/20 blur-3xl" />

      <nav className="relative z-10 flex shrink-0 items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="no-underline"><LogoWordmark dark /></Link>
        <Link
          to={isLogin ? '/cadastro' : '/entrar'}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/85 no-underline transition hover:bg-white/10"
        >
          {isLogin ? 'Criar conta' : 'Já tenho conta'}
        </Link>
      </nav>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-aqua">
            {isLogin ? 'Acessar a plataforma' : 'Criar sua conta'}
          </span>
          <h1 className="mt-3 font-grotesk text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            Como você quer {isLogin ? 'entrar' : 'começar'}?
          </h1>
          <p className="mt-4 text-white/60">
            Escolha o seu perfil — cada um tem uma experiência feita sob medida.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {options.map((o) => (
            <Link
              key={o.key}
              to={o.to}
              className="group flex flex-col rounded-3xl bg-white/[0.04] p-7 no-underline ring-1 ring-white/10 transition hover:bg-white/[0.07] hover:ring-white/20 md:p-8"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                style={{ background: o.accent, boxShadow: `0 14px 40px -12px ${o.glow}` }}
              >
                {o.icon}
              </span>
              <span className="mt-5 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: o.accent === '#2563FF' ? '#7aa2ff' : '#33d69f' }}>
                {o.eyebrow}
              </span>
              <h2 className="mt-2 font-grotesk text-2xl font-bold text-white">{o.title}</h2>
              <p className="mt-2 flex-1 text-sm text-white/60">{o.desc}</p>
              <span
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold transition group-hover:gap-3"
                style={{ color: o.accent === '#2563FF' ? '#7aa2ff' : '#33d69f' }}
              >
                {o.cta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
