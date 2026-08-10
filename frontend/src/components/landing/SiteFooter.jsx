import { Link } from 'react-router-dom';
import { LogoWordmark } from './Logo';
import { IconWhats, WHATSAPP } from './SiteHeader';

/**
 * Rodapé com as DUAS PORTAS separadas e explícitas (anunciante × motorista).
 * Os três concorrentes analisados separam "quero anunciar" de "quero ceder meu
 * ativo" — no nosso caso é exatamente o par anunciante × motorista, e misturar
 * os dois no mesmo CTA é o que mais confunde na landing antiga.
 */

const COLUNAS = [
  {
    titulo: 'Produto',
    itens: [
      { rotulo: 'O produto', href: '#produto' },
      { rotulo: 'Atribuição ISL', href: '#atribuicao' },
      { rotulo: 'Formatos', href: '#formatos' },
      { rotulo: 'Simular campanha', href: '#simulador' },
      { rotulo: 'Curadoria de conteúdo', href: '#curadoria' },
    ],
  },
  {
    titulo: 'Para anunciantes',
    itens: [
      { rotulo: 'Criar conta', to: '/cadastro/empresa' },
      { rotulo: 'Entrar no painel', to: '/entrar/empresa' },
    ],
  },
  {
    titulo: 'Para motoristas',
    itens: [
      { rotulo: 'Quero ser parceiro', to: '/cadastro/motorista' },
      { rotulo: 'Entrar no app', to: '/entrar/motorista' },
    ],
  },
];

export default function SiteFooter() {
  const irPara = (e, href) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer className="w-full bg-ink px-5 pb-10 pt-16 text-white md:px-8 md:pt-20">
      <div className="mx-auto max-w-[1240px]">
        {/* duas portas */}
        <div className="grid gap-4 border-b border-white/10 pb-14 md:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.04] p-7 ring-1 ring-white/10 md:p-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-aqua">
              Sou anunciante
            </span>
            <h3 className="mt-3 font-grotesk text-2xl font-bold">
              Quero minha marca nos carros
            </h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-white/55">
              Monte o plano, suba a arte e acompanhe impressão, scan e lead no painel.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                to="/cadastro/empresa"
                className="rounded-lg bg-brand px-5 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-[#1d51d8]"
              >
                Criar conta de anunciante
              </Link>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-[13.5px] font-semibold text-white/85 no-underline transition hover:border-white/40 hover:text-white"
              >
                <IconWhats className="h-4 w-4 text-[#25D366]" />
                WhatsApp comercial
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-7 ring-1 ring-white/10 md:p-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#33d69f]">
              Sou motorista
            </span>
            <h3 className="mt-3 font-grotesk text-2xl font-bold">
              Quero faturar com as corridas
            </h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-white/55">
              O tablet roda no banco de trás e você ganha por lead convertido, com
              relatório no app.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                to="/cadastro/motorista"
                className="rounded-lg bg-[#00A86B] px-5 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-[#00915c]"
              >
                Quero ser parceiro
              </Link>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-[12.5px] font-medium text-white/45">
                Uber · 99 · inDrive · Táxi
              </span>
            </div>
          </div>
        </div>

        {/* navegação */}
        <div className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <LogoWordmark dark />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/45">
              Mídia digital em veículos de aplicativo com atribuição real: da
              impressão na tela ao lead com nome e telefone.
            </p>
          </div>

          {COLUNAS.map((col) => (
            <div key={col.titulo}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                {col.titulo}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.itens.map((i) => (
                  <li key={i.rotulo}>
                    {i.to ? (
                      <Link
                        to={i.to}
                        className="text-[13.5px] text-white/65 no-underline transition hover:text-white"
                      >
                        {i.rotulo}
                      </Link>
                    ) : (
                      <a
                        href={i.href}
                        onClick={(e) => irPara(e, i.href)}
                        className="text-[13.5px] text-white/65 no-underline transition hover:text-white"
                      >
                        {i.rotulo}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-7 text-[13.5px] md:flex-row md:items-center md:gap-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
            Comercial
          </span>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white/70 no-underline transition hover:text-white"
          >
            <IconWhats className="h-4 w-4 text-[#25D366]" />
            (19) 99729-2504
          </a>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-7 text-[12.5px] text-white/35 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} FastLead. Todos os direitos reservados.</p>
          <p>Connect rides. Deliver brands. Drive income.</p>
        </div>
      </div>
    </footer>
  );
}
