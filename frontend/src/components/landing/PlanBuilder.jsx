import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CIDADES,
  NOME_UF,
  REGIOES,
  UFS,
  normalizar,
  pracaDaCidade,
  pracaDaRegiao,
  pracaDaUF,
} from '../../lib/pracas';
import {
  DEGRAUS_CONTRATO,
  DEGRAUS_HORAS,
  DEGRAUS_VEICULOS,
  PERIODOS,
  calcularPlano,
  descontoPrazo,
  moeda,
  numero,
  proximoDegrauContrato,
} from '../../lib/rateCard';

/* ─────────────────────────── ícones ─────────────────────────── */

const Ico = ({ d, className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const IconCarro = (p) => <Ico {...p} d="M5 17h14M4 17V11l2-5h12l2 5v6M4 17v2M20 17v2M7.5 13.5h.01M16.5 13.5h.01" />;
const IconAgenda = (p) => <Ico {...p} d="M3 9h18M7 3v3M17 3v3M4 5h16v16H4z" />;
const IconRelogio = (p) => <Ico {...p} d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />;
const IconSol = (p) => <Ico {...p} d="M12 3v1.5M12 19.5V21M4.2 4.2l1.1 1.1M18.7 18.7l1.1 1.1M3 12h1.5M19.5 12H21M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />;
const IconPin = (p) => <Ico {...p} d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />;
const IconMapa = (p) => <Ico {...p} d="m9 4-6 3v13l6-3 6 3 6-3V4l-6 3-6-3Zm0 0v13m6-10v13" />;
const IconGlobo = (p) => <Ico {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />;
const IconRaio = (p) => <Ico {...p} d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />;
const IconFoguete = (p) => <Ico {...p} d="M4.5 15.5c-1.5 1.5-2 6-2 6s4.5-.5 6-2a2.83 2.83 0 0 0-4-4ZM15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M9 15l-3-3c1-5.5 5-9.5 10-10 .5 5-3.5 9-9 10Z" />;
const IconTablet = (p) => <Ico {...p} d="M5 3h14v18H5zM11 18h2" />;
const IconLua = (p) => <Ico {...p} d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />;
const IconPor = (p) => <Ico {...p} d="M12 4v5m-4.2-.8 1.4 1.4M3 15h2m14 0h2m-3.8-5.4 1.4-1.4M6 19h12M8.5 15a3.5 3.5 0 1 1 7 0" />;

const ICONE_PERIODO = { manha: IconSol, tarde: IconPor, noite: IconLua };

/* ────────────────────── slider com degraus ────────────────────── */

/**
 * Slider que anda de degrau em degrau (nunca em valor contínuo). O `<input
 * type=range>` percorre ÍNDICES do array de degraus — assim o thumb encaixa
 * exatamente nos rótulos desenhados acima da trilha.
 */
function SliderDegraus({ icone: Icone, titulo, descricao, degraus, indice, onChange, cor, formatarRotulo, formatarBolha }) {
  const max = degraus.length - 1;
  const pct = max === 0 ? 0 : (indice / max) * 100;

  return (
    <div className="grid gap-4 py-6 md:grid-cols-[190px_1fr] md:items-center md:gap-8">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${cor}14`, color: cor }}
        >
          <Icone className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink">{titulo}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink/45">{descricao}</p>
        </div>
      </div>

      <div className="min-w-0 pt-1">
        {/* Rótulos dos degraus. Posicionados na MESMA porcentagem dos pontos da
            trilha (i/max), não distribuídos por flex — com flex-1 o centro de
            cada rótulo cai em (i+0.5)/n e desalinha do ponto. Nas pontas o
            alinhamento vira left/right para não estourar a viewport. */}
        <div className="relative mb-2 h-4">
          {degraus.map((d, i) => {
            const p = max === 0 ? 0 : (i / max) * 100;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange(i)}
                className={`absolute top-0 cursor-pointer whitespace-nowrap bg-transparent p-0 text-[11px] font-semibold tabular-nums transition ${
                  i === indice ? 'text-ink' : 'text-ink/35 hover:text-ink/60'
                }`}
                style={{
                  left: `${p}%`,
                  transform: `translateX(${i === 0 ? '0%' : i === max ? '-100%' : '-50%'})`,
                }}
              >
                {formatarRotulo(d)}
              </button>
            );
          })}
        </div>

        <div className="relative">
          {/* trilha preenchida */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ink/10" />
          <div
            className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
            style={{ width: `${pct}%`, backgroundColor: cor }}
          />
          {/* pontos dos degraus */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
            {degraus.map((_, i) => (
              <span
                key={i}
                className="h-[11px] w-[11px] rounded-full border-2 bg-white transition-colors"
                style={{ borderColor: i <= indice ? cor : 'rgba(11,29,58,0.18)' }}
              />
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={indice}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={titulo}
            className="fl-range relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent"
            style={{ '--fl-cor': cor }}
          />
        </div>

        {/* Bolha do valor atual. Nos extremos ela deixa de ser centralizada no
            thumb e "encosta" na borda da trilha — centralizar sempre fazia a
            bolha estourar a viewport no mobile. */}
        <div className="relative mt-1 h-6">
          <span
            className="absolute whitespace-nowrap rounded-md px-2 py-[3px] text-[11px] font-bold tabular-nums text-white shadow-sm"
            style={{
              left: `${pct}%`,
              transform: `translateX(${pct < 12 ? '0%' : pct > 88 ? '-100%' : '-50%'})`,
              backgroundColor: cor,
            }}
          >
            {formatarBolha(degraus[indice])}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── seletor de praças ───────────────────── */

const ABAS = [
  { id: 'cidade', rotulo: 'Cidades/UF', icone: IconPin },
  { id: 'estado', rotulo: 'Estados', icone: IconMapa },
  { id: 'regiao', rotulo: 'Regiões', icone: IconGlobo },
];

function PracaPicker({ pracas, setPracas }) {
  const [aba, setAba] = useState('cidade');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  const opcoes = useMemo(() => {
    if (aba === 'cidade') return CIDADES.map(pracaDaCidade);
    if (aba === 'estado') return UFS.map(pracaDaUF);
    return REGIOES.map((r) => pracaDaRegiao(r.id));
  }, [aba]);

  const selecionadas = new Set(pracas.map((p) => p.id));
  const filtradas = useMemo(() => {
    const q = normalizar(busca);
    const livres = opcoes.filter((o) => !selecionadas.has(o.id));
    if (!q) return livres.slice(0, 8);
    return livres.filter((o) => normalizar(o.rotulo).includes(q)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, opcoes, pracas]);

  const adicionar = (o) => {
    setPracas([...pracas, o]);
    setBusca('');
    setAberto(false);
  };

  const trocarAba = (id) => {
    setAba(id);
    setBusca('');
    setAberto(false);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[190px_1fr] md:gap-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <IconPin className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink">Abrangência</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink/45">Onde sua marca circula.</p>
        </div>
      </div>

      <div className="min-w-0">
        {/* abas */}
        <div className="inline-flex w-full rounded-xl bg-ink/[0.04] p-1 sm:w-auto">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              type="button"
              onClick={() => trocarAba(id)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[12px] font-semibold transition sm:flex-none sm:px-5 ${
                aba === id ? 'bg-white text-brand shadow-sm ring-1 ring-brand/15' : 'text-ink/50 hover:text-ink/80'
              }`}
            >
              <Icone className="h-3.5 w-3.5" />
              {rotulo}
            </button>
          ))}
        </div>

        {/* campo com chips */}
        <div ref={wrapRef} className="relative mt-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-2.5 py-2 focus-within:border-brand/40 focus-within:ring-4 focus-within:ring-brand/10">
            {pracas.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand/[0.08] py-1 pl-2.5 pr-1.5 text-[12px] font-semibold text-brand"
              >
                {p.rotulo}
                <button
                  type="button"
                  onClick={() => setPracas(pracas.filter((x) => x.id !== p.id))}
                  aria-label={`Remover ${p.rotulo}`}
                  className="grid h-4 w-4 place-items-center rounded text-brand/60 transition hover:bg-brand/15 hover:text-brand"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setAberto(true);
              }}
              onFocus={() => setAberto(true)}
              onBlur={() => window.setTimeout(() => setAberto(false), 120)}
              placeholder={pracas.length ? 'Adicionar…' : 'Digite e selecione locais'}
              className="w-0 min-w-[110px] flex-1 border-0 bg-transparent px-1.5 py-1 text-[13px] text-ink outline-none placeholder:text-ink/35"
            />
          </div>

          {aberto && filtradas.length > 0 && (
            <ul className="absolute z-30 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-ink/10 bg-white py-1 shadow-[0_20px_50px_-18px_rgba(11,29,58,0.35)]">
              {filtradas.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adicionar(o)}
                    className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] text-ink/80 transition hover:bg-brand/[0.06] hover:text-brand"
                  >
                    {o.rotulo}
                    {o.tipo === 'estado' && <span className="text-[11px] text-ink/35">{NOME_UF[o.uf]}</span>}
                    {o.tipo === 'regiao' && <span className="text-[11px] text-ink/35">{o.ufs.length} estados</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── simulador ─────────────────────── */

export default function PlanBuilder() {
  const [pracas, setPracas] = useState([
    pracaDaCidade(CIDADES.find((c) => c.cidade === 'São Paulo')),
    pracaDaCidade(CIDADES.find((c) => c.cidade === 'Campinas')),
  ]);
  const [iVeiculos, setIVeiculos] = useState(5); // 500
  const [iContrato, setIContrato] = useState(4); // 6m
  const [iHoras, setIHoras] = useState(4); // 5h
  const [periodos, setPeriodos] = useState(['manha']);

  const veiculos = DEGRAUS_VEICULOS[iVeiculos];
  const contrato = DEGRAUS_CONTRATO[iContrato];
  const horas = DEGRAUS_HORAS[iHoras];

  const plano = useMemo(
    () => calcularPlano({ veiculos, contratoId: contrato.id, horas, periodos, pracas }),
    [veiculos, contrato.id, horas, periodos, pracas],
  );

  const upsell = proximoDegrauContrato(contrato.id);
  const planoUpsell = useMemo(
    () =>
      upsell
        ? calcularPlano({ veiculos, contratoId: upsell.id, horas, periodos, pracas })
        : null,
    [upsell, veiculos, horas, periodos, pracas],
  );

  const togglePeriodo = (id) =>
    setPeriodos((atual) =>
      atual.includes(id) ? (atual.length === 1 ? atual : atual.filter((p) => p !== id)) : [...atual, id],
    );

  return (
    <section id="simulador" className="relative w-full bg-[#F4F6FA] px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[1180px]">
        {/* cabeçalho */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
            Simulador de mídia
          </span>
          <h2 className="mt-3 font-grotesk text-[32px] font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]">
            Monte seu plano de mídia nos tablets
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink/55 md:text-base">
            Escolha a abrangência, a quantidade de veículos, a duração da campanha e o
            período de exibição. Veja seu investimento estimado em tempo real.
          </p>
        </div>

        {/* painel */}
        <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_370px]">
          {/* ── controles ──
              min-w-0: item de grid tem `min-width: auto` por padrão e não
              encolhe abaixo do min-content dos filhos, estourando a viewport
              no mobile. */}
          <div className="min-w-0 rounded-2xl border border-ink/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(11,29,58,0.04),0_18px_40px_-28px_rgba(11,29,58,0.22)] md:p-8">
            <PracaPicker pracas={pracas} setPracas={setPracas} />

            <div className="mt-2 divide-y divide-ink/[0.07]">
              <SliderDegraus
                icone={IconCarro}
                titulo="Veículos"
                descricao="Quantos carros exibem sua campanha."
                degraus={DEGRAUS_VEICULOS}
                indice={iVeiculos}
                onChange={setIVeiculos}
                cor="#2563FF"
                formatarRotulo={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                formatarBolha={(v) => `${numero(v)} carros`}
              />

              <SliderDegraus
                icone={IconAgenda}
                titulo="Contrato"
                descricao="Por quanto tempo fica no ar."
                degraus={DEGRAUS_CONTRATO}
                indice={iContrato}
                onChange={setIContrato}
                cor="#00A86B"
                formatarRotulo={(c) => c.label}
                formatarBolha={(c) => c.nome}
              />

              <SliderDegraus
                icone={IconRelogio}
                titulo="Tempo"
                descricao="Horas de exibição por dia."
                degraus={DEGRAUS_HORAS}
                indice={iHoras}
                onChange={setIHoras}
                cor="#00A0C4"
                formatarRotulo={(h) => `${h}H`}
                formatarBolha={(h) => `${h}h por dia`}
              />

              {/* período */}
              <div className="grid gap-4 pt-6 md:grid-cols-[190px_1fr] md:gap-8">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/10 text-[#7C5CFF]">
                    <IconSol className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink">Período</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink/45">Faixas do dia.</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PERIODOS.map((p) => {
                    const Icone = ICONE_PERIODO[p.id];
                    const ativo = periodos.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePeriodo(p.id)}
                        aria-pressed={ativo}
                        className={`relative flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                          ativo
                            ? 'border-[#7C5CFF]/35 bg-[#7C5CFF]/[0.06]'
                            : 'border-ink/10 bg-white hover:border-ink/20'
                        }`}
                      >
                        <Icone className={`h-4 w-4 shrink-0 ${ativo ? 'text-[#7C5CFF]' : 'text-ink/35'}`} />
                        <span>
                          <span className={`block text-[13px] font-bold ${ativo ? 'text-ink' : 'text-ink/60'}`}>
                            {p.nome}
                          </span>
                          <span className="block text-[11px] tabular-nums text-ink/40">{p.janela}</span>
                        </span>
                        {ativo && (
                          <svg viewBox="0 0 24 24" className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#7C5CFF]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12l5 5L20 6" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* rodapé do painel */}
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-ink/[0.07] pt-5">
              <span className="flex items-center gap-2 text-[12px] text-ink/50">
                <IconTablet className="h-4 w-4 text-brand" />
                Exibição em tablets no banco do passageiro
              </span>
              <span className="flex items-center gap-2 text-[12px] text-ink/50">
                <IconCarro className="h-4 w-4 text-brand" />
                Alcance qualificado em mobilidade urbana
              </span>
            </div>
          </div>

          {/* ── resultado ── */}
          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-ink/[0.07] bg-white p-7 shadow-[0_1px_2px_rgba(11,29,58,0.04),0_18px_40px_-28px_rgba(11,29,58,0.22)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/[0.08] px-3 py-1.5 text-[11px] font-bold text-brand">
                <IconRaio className="h-3.5 w-3.5" />
                Estimativa instantânea
              </span>

              <p className="mt-5 text-[15px] font-semibold leading-snug text-ink">
                Seu investimento para
                <br />
                este plano será de
              </p>

              <p className="mt-2 font-grotesk text-[40px] font-bold leading-none tracking-tight text-brand tabular-nums md:text-[46px]">
                {moeda(plano.total)}
              </p>

              <dl className="mt-5 space-y-2 border-t border-ink/[0.07] pt-4 text-[12.5px]">
                {[
                  ['Equivalente por mês', moeda(plano.mensal)],
                  ['Por veículo/mês', moeda(plano.porVeiculoMes)],
                  ['Impactos estimados', numero(plano.impactosEstimados)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink/50">{k}</dt>
                    <dd className="font-semibold tabular-nums text-ink">{v}</dd>
                  </div>
                ))}
                {plano.descontoTotal > 0 && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[#00A86B]">Desconto aplicado</dt>
                    <dd className="font-semibold tabular-nums text-[#00A86B]">
                      −{Math.round(plano.descontoTotal * 100)}%
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-4 text-[11.5px] leading-relaxed text-ink/40">
                Valor ilustrativo. A proposta final é ajustada conforme segmentação e
                disponibilidade de veículos na praça.
              </p>
            </div>

            {/* upsell */}
            {upsell && planoUpsell && (
              <div className="rounded-2xl border border-[#00A86B]/20 bg-gradient-to-b from-[#F0FBF6] to-white p-7">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#00A86B] text-white">
                    <IconFoguete className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-[#00A86B]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00A86B]">
                    Oferta inteligente
                  </span>
                </div>

                <h3 className="mt-4 font-grotesk text-xl font-bold text-ink">Turbine seu plano</h3>
                <p className="mt-1.5 text-[13px] font-semibold text-ink/70">
                  Passe para {upsell.nome} e reduza o custo mensal.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
                  Ampliando o prazo você aumenta a presença de marca, melhora a recorrência
                  de impacto e desbloqueia{' '}
                  <strong className="font-semibold text-[#00A86B]">
                    {Math.round(descontoPrazo(upsell.id) * 100)}% de desconto progressivo
                  </strong>
                  .
                </p>

                <div className="mt-4 flex items-baseline justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-[#00A86B]/15">
                  <span className="text-[12px] text-ink/50">Novo custo mensal</span>
                  <span className="font-grotesk text-lg font-bold tabular-nums text-[#00A86B]">
                    {moeda(planoUpsell.mensal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIContrato(iContrato + 1)}
                  className="mt-4 w-full rounded-xl bg-[#00A86B] px-6 py-3.5 text-[14px] font-bold text-white transition hover:brightness-105"
                >
                  Quero turbinar meu plano
                </button>
              </div>
            )}

            <Link
              to="/cadastro/empresa"
              className="rounded-xl bg-brand px-6 py-4 text-center text-[14px] font-bold text-white no-underline shadow-[0_14px_34px_-14px_rgba(37,99,255,0.85)] transition hover:brightness-110"
            >
              Receber proposta deste plano
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
