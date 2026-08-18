/**
 * Peças visuais do painel administrativo.
 *
 * Cada tela do admin desenhava as próprias tabelas e cartões, com espaçamentos
 * e tons de cinza ligeiramente diferentes. Concentrar aqui faz as telas
 * parecerem o mesmo sistema e torna cada nova tela questão de montar, não de
 * redesenhar.
 */

const ACCENT = '#2563FF';

export const nf = new Intl.NumberFormat('pt-BR');
export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function Card({ children, className = '', padding = 'p-6' }) {
  return (
    <section
      className={`rounded-2xl border border-black/5 bg-white ${padding} shadow-[0_20px_50px_-45px_rgba(11,29,58,0.45)] ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Número grande do topo. `destaque` pinta o valor quando ele é o que o
 * operador veio olhar; o resto fica em tinta normal para não competir.
 */
export function Stat({ label, valor, hint, destaque = false, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-2xl border border-black/5 bg-white p-5 text-left shadow-[0_20px_50px_-45px_rgba(11,29,58,0.45)] ${
        onClick ? 'transition-colors hover:border-black/15' : ''
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
        {label}
      </div>
      <div
        className="font-grotesk mt-2 text-3xl font-bold tabular-nums"
        style={{ color: destaque ? ACCENT : '#0B1D3A' }}
      >
        {valor}
      </div>
      {hint && <div className="mt-1 text-xs text-ink/45">{hint}</div>}
    </Wrapper>
  );
}

const TONS = {
  neutro: { bg: 'rgba(11,29,58,0.06)', cor: 'rgba(11,29,58,0.65)' },
  info: { bg: '#2563FF14', cor: '#2563FF' },
  ok: { bg: '#00C98A1f', cor: '#068a5f' },
  alerta: { bg: '#F59E0B1f', cor: '#b45309' },
  erro: { bg: '#EF44441f', cor: '#b91c1c' },
};

export function Badge({ tom = 'neutro', children }) {
  const t = TONS[tom] ?? TONS.neutro;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: t.bg, color: t.cor }}
    >
      {children}
    </span>
  );
}

export function Botao({ children, onClick, variante = 'primario', disabled, className = '' }) {
  const estilos = {
    primario: { background: ACCENT, color: '#fff', border: '1px solid transparent' },
    neutro: { background: '#fff', color: 'rgba(11,29,58,0.7)', border: '1px solid rgba(0,0,0,0.10)' },
    perigo: { background: '#fff', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.35)' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={estilos[variante]}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Tabela com rolagem horizontal própria.
 *
 * Sem o contêiner de rolagem, uma tabela larga empurra a página inteira para o
 * lado no celular e a navegação vai junto.
 */
export function Tabela({ colunas, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-[0_20px_50px_-45px_rgba(11,29,58,0.45)]">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-black/5">
            {colunas.map((c) => (
              <th
                key={c}
                className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Linha({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-black/[0.04] last:border-0 ${
        onClick ? 'cursor-pointer transition-colors hover:bg-black/[0.02]' : ''
      }`}
    >
      {children}
    </tr>
  );
}

export function Celula({ children, className = '' }) {
  return <td className={`px-5 py-4 text-sm text-ink/80 ${className}`}>{children}</td>;
}

export function Vazio({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 py-16 text-center text-sm text-ink/40">
      {children}
    </div>
  );
}

export function Carregando({ children = 'Carregando…' }) {
  return <div className="py-16 text-center text-sm text-ink/40">{children}</div>;
}

export function Erro({ children }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {children}
    </div>
  );
}

/** Barrinha de abas usada nas telas com fila por status. */
export function Abas({ abas, ativa, onChange }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {abas.map((a) => {
        const on = ativa === a.key;
        return (
          <button
            key={a.key}
            onClick={() => onChange(a.key)}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            style={
              on
                ? { background: ACCENT, color: '#fff' }
                : { background: '#fff', color: 'rgba(11,29,58,0.55)', border: '1px solid rgba(0,0,0,0.08)' }
            }
          >
            {a.label}
            {a.contagem != null && <span className="ml-2 opacity-70">{a.contagem}</span>}
          </button>
        );
      })}
    </div>
  );
}
