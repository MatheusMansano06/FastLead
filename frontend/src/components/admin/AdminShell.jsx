import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogoWordmark } from '../landing/Logo';
import { useAuthStore } from '../../stores/authStore';

/**
 * Moldura do painel administrativo.
 *
 * Antes cada tela do admin desenhava o próprio cabeçalho e só voltava para o
 * início por um botão "← Voltar" — para ir de Motoristas a Empresas era preciso
 * passar pelo meio. A navegação lateral fixa resolve isso: todas as seções
 * ficam a um clique, de qualquer lugar, e o operador sempre sabe onde está.
 *
 * O painel é claro como o resto do produto. O escuro anterior fazia o admin
 * parecer outro sistema, e obrigava cada tela a reinventar as cores de texto.
 */

const ACCENT = '#2563FF';

/** Ícones desenhados aqui para não trazer uma biblioteca só por seis traços. */
const ICONES = {
  visao: 'M3 12h4l3 8 4-16 3 8h4',
  empresas: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01',
  motoristas: 'M5 17h14M6 17l-1-5 2-5h10l2 5-1 5M7 12h10M8 17v2M16 17v2',
  campanhas: 'M3 11l18-8v18l-18-8v-2zM7 12v7',
  tablets: 'M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2',
  repasses: 'M12 3v18M8 7h6a3 3 0 010 6H9a3 3 0 000 6h7',
};

/**
 * Só entram seções que têm tela. O painel antigo oferecia "Campanhas" e
 * "Repasses" em botões que não levavam a lugar nenhum — os endpoints existem
 * no backend, as telas nunca foram feitas. Link morto ensina o operador a
 * desconfiar do menu inteiro.
 */
const SECOES = [
  { rotulo: 'Visão geral', caminho: '/admin', icone: 'visao' },
  { rotulo: 'Liberar tablets', caminho: '/admin/tablet-requests', icone: 'tablets' },
  { rotulo: 'Motoristas', caminho: '/admin/drivers', icone: 'motoristas' },
  { rotulo: 'Empresas', caminho: '/admin/companies', icone: 'empresas' },
];

function Icone({ nome, className = 'h-[18px] w-[18px]' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONES[nome]} />
    </svg>
  );
}

function ItemNav({ secao, ativo, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
      style={
        ativo
          ? { background: `${ACCENT}14`, color: ACCENT }
          : { color: 'rgba(11,29,58,0.60)' }
      }
    >
      <Icone nome={secao.icone} />
      <span className="flex-1">{secao.rotulo}</span>
      {badge > 0 && (
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
          style={{ background: ACCENT }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * @param titulo    Nome da tela, grande, no topo do conteúdo.
 * @param subtitulo Uma linha dizendo o que dá para fazer aqui.
 * @param acoes     Botões do canto direito do cabeçalho.
 * @param pendentes Contador que aparece ao lado de "Liberar tablets".
 */
export default function AdminShell({ titulo, subtitulo, acoes, pendentes = 0, children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const [menuAberto, setMenuAberto] = useState(false);

  // "/admin" casa exato; as demais casam por prefixo para que a tela de
  // detalhe (/admin/drivers/123) mantenha "Motoristas" aceso.
  const ativa = (caminho) =>
    caminho === '/admin' ? pathname === '/admin' : pathname.startsWith(caminho);

  const irPara = (caminho) => {
    setMenuAberto(false);
    navigate(caminho);
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {SECOES.map((s) => (
        <ItemNav
          key={s.caminho}
          secao={s}
          ativo={ativa(s.caminho)}
          onClick={() => irPara(s.caminho)}
          badge={s.caminho === '/admin/tablet-requests' ? pendentes : 0}
        />
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      {/* ---------- Barra lateral (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-black/5 bg-white px-4 py-5 lg:flex">
        <button onClick={() => irPara('/admin')} className="mb-1 px-2 text-left">
          <LogoWordmark />
        </button>
        <span
          className="mb-6 ml-2 w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ background: `${ACCENT}14`, color: ACCENT }}
        >
          Administração
        </span>

        {nav}

        <div className="mt-auto border-t border-black/5 pt-4">
          <p className="truncate px-3 text-sm font-semibold text-ink">{user?.name || 'Admin'}</p>
          <p className="truncate px-3 text-xs text-ink/45">{user?.email}</p>
          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink/50 transition-colors hover:bg-black/[0.04] hover:text-ink"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* ---------- Topo (mobile) ---------- */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-black/5 bg-white/90 px-5 py-3 backdrop-blur lg:hidden">
        <LogoWordmark />
        <button
          onClick={() => setMenuAberto((v) => !v)}
          className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-ink/60"
        >
          {menuAberto ? 'Fechar' : 'Menu'}
        </button>
      </div>
      {menuAberto && (
        <div className="border-b border-black/5 bg-white px-4 py-3 lg:hidden">{nav}</div>
      )}

      {/* ---------- Conteúdo ---------- */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-5 py-7 md:px-8">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-grotesk text-3xl font-bold text-ink">{titulo}</h1>
              {subtitulo && <p className="mt-1 text-sm text-ink/55">{subtitulo}</p>}
            </div>
            {acoes && <div className="flex items-center gap-2">{acoes}</div>}
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
