import { useMemo, useState } from 'react';

/**
 * Ganhos por dia, nos últimos 30 dias.
 *
 * Série única, então não há legenda: o título já diz o que a linha é. A cor
 * também é única — com uma série só não existe par de cores para alguém
 * confundir, e o verde da área foi conferido contra o fundo branco do cartão.
 *
 * O eixo é de dias corridos, não dos dias em que houve ganho. Ligar 3 de agosto
 * direto a 17 desenharia uma subida suave onde houve duas semanas paradas.
 */

const ACCENT = '#0a9d6c';
const DIAS = 30;

/** Altura do desenho. Largura é 100% — o SVG escala pelo viewBox. */
const W = 720;
const H = 180;
const PAD = { topo: 14, base: 26, esq: 4, dir: 4 };

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const diaISO = (d) => d.toISOString().slice(0, 10);

/**
 * Soma os lançamentos por dia e devolve a série contínua.
 * Cancelado fica de fora: não é ganho, e somá-lo inflaria a curva.
 */
function montarSerie(lancamentos) {
  const porDia = new Map();
  for (const l of lancamentos || []) {
    if (l.status === 'CANCELLED') continue;
    const chave = String(l.created_at).slice(0, 10);
    porDia.set(chave, (porDia.get(chave) || 0) + Number(l.amount || 0));
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const serie = [];
  for (let i = DIAS - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const chave = diaISO(d);
    serie.push({ data: d, chave, valor: porDia.get(chave) || 0 });
  }
  return serie;
}

export default function GraficoGanhos({ lancamentos, carregando }) {
  const [ativo, setAtivo] = useState(null);

  const serie = useMemo(() => montarSerie(lancamentos), [lancamentos]);
  const maximo = useMemo(() => Math.max(...serie.map((p) => p.valor), 0), [serie]);
  const total = useMemo(() => serie.reduce((s, p) => s + p.valor, 0), [serie]);

  const larguraUtil = W - PAD.esq - PAD.dir;
  const alturaUtil = H - PAD.topo - PAD.base;
  const passo = serie.length > 1 ? larguraUtil / (serie.length - 1) : 0;

  const x = (i) => PAD.esq + i * passo;
  // Sem nenhum ganho o gráfico fica na linha de base em vez de dividir por zero.
  const y = (v) => (maximo <= 0 ? PAD.topo + alturaUtil : PAD.topo + alturaUtil * (1 - v / maximo));

  const linha = serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.valor)}`).join(' ');
  const area = `${linha} L${x(serie.length - 1)},${PAD.topo + alturaUtil} L${x(0)},${PAD.topo + alturaUtil} Z`;

  /** Converte a posição do mouse no dia mais próximo. */
  const aoMover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round((px - PAD.esq) / (passo || 1));
    setAtivo(Math.min(serie.length - 1, Math.max(0, i)));
  };

  if (carregando) {
    return <p className="py-10 text-center text-sm text-ink/40">Carregando…</p>;
  }

  // Curva reta no zero não informa nada e ainda sugere que houve medição.
  if (total <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/10 py-10 text-center">
        <p className="text-sm text-ink/50">Você ainda não recebeu nenhum ganho.</p>
        <p className="mt-1 text-xs text-ink/35">
          Assim que o primeiro lead for convertido, a curva aparece aqui.
        </p>
      </div>
    );
  }

  const p = ativo != null ? serie[ativo] : null;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-grotesk text-2xl font-bold text-ink">{brl(total)}</span>
        <span className="text-sm text-ink/45">nos últimos 30 dias</span>
      </div>

      <div
        className="relative mt-3"
        onMouseMove={aoMover}
        onMouseLeave={() => setAtivo(null)}
        onTouchStart={(e) => aoMover(e.touches[0])}
        onTouchMove={(e) => aoMover(e.touches[0])}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 180 }}
          role="img"
          aria-label={`Ganhos por dia nos últimos 30 dias, somando ${brl(total)}`}
        >
          <defs>
            <linearGradient id="areaGanhos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.20" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grade discreta: referência sem competir com a linha. */}
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={PAD.esq}
              x2={W - PAD.dir}
              y1={PAD.topo + alturaUtil * f}
              y2={PAD.topo + alturaUtil * f}
              stroke="rgba(11,29,58,0.07)"
              strokeWidth="1"
            />
          ))}

          <path d={area} fill="url(#areaGanhos)" />
          <path
            d={linha}
            fill="none"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {p && (
            <>
              <line
                x1={x(ativo)}
                x2={x(ativo)}
                y1={PAD.topo}
                y2={PAD.topo + alturaUtil}
                stroke="rgba(11,29,58,0.18)"
                strokeWidth="1"
              />
              {/* Anel branco separa o ponto da área por baixo dele. */}
              <circle cx={x(ativo)} cy={y(p.valor)} r="5.5" fill="#fff" />
              <circle cx={x(ativo)} cy={y(p.valor)} r="4" fill={ACCENT} />
            </>
          )}

          {/* Só as pontas recebem rótulo: uma data por dia viraria borrão. */}
          <text x={PAD.esq} y={H - 8} fontSize="11" fill="rgba(11,29,58,0.40)">
            {serie[0].data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </text>
          <text x={W - PAD.dir} y={H - 8} fontSize="11" textAnchor="end" fill="rgba(11,29,58,0.40)">
            hoje
          </text>
        </svg>

        {p && (
          <div
            className="pointer-events-none absolute -top-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{
              left: `${(x(ativo) / W) * 100}%`,
              transform: `translateX(${ativo > serie.length / 2 ? '-100%' : '0'})`,
            }}
          >
            <span className="block font-semibold">{brl(p.valor)}</span>
            <span className="block text-white/60">
              {p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
