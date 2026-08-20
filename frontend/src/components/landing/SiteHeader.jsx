import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoWordmark } from './Logo';

/**
 * Nav plana de 4 itens + um CTA sólido.
 *
 * Não replicamos o mega-menu de 3 níveis da JCDecaux: aquilo existe para 15+
 * produtos e, com um produto só, lê como fantasia de porte. Também mantemos o
 * CTA visível no mobile — a Eletromidia esconde o dela no hamburguer e perde a
 * única ação primária persistente.
 */

const LINKS = [
  { href: '#produto', rotulo: 'O produto' },
  { href: '#atribuicao', rotulo: 'Atribuição' },
  { href: '#formatos', rotulo: 'Formatos' },
  { href: '#simulador', rotulo: 'Simular campanha' },
];

/** WhatsApp comercial. Formato wa.me: 55 (BR) + 19 (DDD) + número, só dígitos. */
export const WHATSAPP_NUMERO = '5519987207888';

const WHATSAPP =
  `https://wa.me/${WHATSAPP_NUMERO}?text=` +
  encodeURIComponent('Olá! Quero anunciar nos tablets da FastLead.');

function IconWhats({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.2 1.26-1.96 1.42-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.2-4.98-4.4-.14-.19-1.19-1.58-1.19-3.02s.76-2.14 1.03-2.44c.27-.3.58-.37.78-.37h.56c.18 0 .42-.07.66.5.24.58.83 2.02.9 2.17.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.3 2.36 1.45.3.15.47.13.64-.08.17-.2.73-.86.93-1.15.2-.3.39-.24.66-.15.27.1 1.71.81 2 .96.3.15.49.22.56.34.07.13.07.72-.17 1.4Z" />
    </svg>
  );
}

export default function SiteHeader() {
  const [rolou, setRolou] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const irPara = (e, href) => {
    e.preventDefault();
    setMenuAberto(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${
        rolou ? 'border-ink/[0.07] bg-white/90 backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-6 px-5 md:px-8">
        <Link to="/" aria-label="FastLead — início" className="no-underline">
          <LogoWordmark dark={false} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => irPara(e, l.href)}
              className="rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-ink/60 no-underline transition hover:bg-ink/[0.04] hover:text-ink"
            >
              {l.rotulo}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-ink/12 px-3.5 py-2 text-[13px] font-semibold text-ink/70 no-underline transition hover:border-ink/25 hover:text-ink sm:inline-flex"
          >
            <IconWhats className="h-4 w-4 text-[#25D366]" />
            Falar com especialista
          </a>
          <Link
            to="/entrar"
            className="hidden rounded-lg px-3 py-2 text-[13px] font-medium text-ink/60 no-underline transition hover:text-ink md:block"
          >
            Entrar
          </Link>
          <Link
            to="/cadastro/empresa"
            className="rounded-lg bg-brand px-4 py-2.5 text-[13px] font-bold text-white no-underline transition hover:bg-[#1d51d8]"
          >
            Anunciar
          </Link>

          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            className="ml-1 grid h-9 w-9 place-items-center rounded-lg text-ink/70 transition hover:bg-ink/[0.05] lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuAberto ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuAberto && (
        <div className="border-t border-ink/[0.07] bg-white lg:hidden">
          <nav className="mx-auto flex max-w-[1240px] flex-col px-5 py-2 md:px-8">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => irPara(e, l.href)}
                className="border-b border-ink/[0.06] py-3.5 text-[15px] font-medium text-ink/75 no-underline last:border-0"
              >
                {l.rotulo}
              </a>
            ))}
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 mb-2 flex items-center justify-center gap-2 rounded-lg border border-ink/12 py-3 text-[14px] font-semibold text-ink/75 no-underline"
            >
              <IconWhats className="h-4 w-4 text-[#25D366]" />
              Falar com especialista
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

export { WHATSAPP, IconWhats };
