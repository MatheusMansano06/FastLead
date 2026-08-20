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
  DEGRAUS_PACOTE,
  DEGRAUS_VEICULOS,
  PERIODOS,
  ajustePrazo,
  calcularPlano,
  moeda,
  moedaCent,
  numero,
  pct,
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
  // Defaults = pacote de referência da planilha (200h · 100 carros · 8h/dia · 1 mês).
  const [iPacote, setIPacote] = useState(2); // 200h
  const [iVeiculos, setIVeiculos] = useState(2); // 100 carros
  const [iContrato, setIContrato] = useState(2); // 1 mês
  const [iHoras, setIHoras] = useState(7); // 8h/dia
  const [periodos, setPeriodos] = useState(['manha']);

  const pacoteH = DEGRAUS_PACOTE[iPacote].valor;
  const veiculos = DEGRAUS_VEICULOS[iVeiculos].valor;
  const contrato = DEGRAUS_CONTRATO[iContrato];
  const horas = DEGRAUS_HORAS[iHoras].valor;

  // Praça e período são segmentação da campanha; não entram na fórmula.
  const plano = useMemo(
    () => calcularPlano({ pacoteH, veiculos, horasDia: horas, contratoId: contrato.id }),
    [pacoteH, veiculos, horas, contrato.id],
  );

  const upsell = proximoDegrauContrato(contrato.id);
  const planoUpsell = useMemo(
    () =>
      upsell
        ? calcularPlano({ pacoteH, veiculos, horasDia: horas, contratoId: upsell.id })
        : null,
    [upsell, pacoteH, veiculos, horas],
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
            O pacote é o volume de tela contratado por mês — <strong className="font-semibold text-ink/75">200 horas</strong>{' '}
            equivalem a 8h × 25 dias de operação. Os ajustes de pacote, volume, janela diária e
            prazo são somados e aplicados de uma vez sobre o preço-base.
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
                icone={IconTablet}
                titulo="Pacote"
                descricao="Horas de tela contratadas por mês. 200h é a referência."
                degraus={DEGRAUS_PACOTE}
                indice={iPacote}
                onChange={setIPacote}
                cor="#7C5CFF"
                formatarRotulo={(p) => (p.valor >= 1000 ? `${p.valor / 1000}k h` : `${p.valor}h`)}
                formatarBolha={(p) => `${numero(p.valor)}h · ${pct(p.ajuste)}`}
              />

              <SliderDegraus
                icone={IconCarro}
                titulo="Veículos"
                descricao="Entre quantos carros as horas contratadas são pulverizadas."
                degraus={DEGRAUS_VEICULOS}
                indice={iVeiculos}
                onChange={setIVeiculos}
                cor="#2563FF"
                formatarRotulo={(v) => (v.valor >= 1000 ? `${v.valor / 1000}k` : v.valor)}
                formatarBolha={(v) => `${numero(v.valor)} carros · ${pct(v.ajuste)}`}
              />

              <SliderDegraus
                icone={IconRelogio}
                titulo="Horas/dia"
                descricao="Janela diária de exibição. 8h é a janela cheia do pacote."
                degraus={DEGRAUS_HORAS}
                indice={iHoras}
                onChange={setIHoras}
                cor="#00A0C4"
                formatarRotulo={(h) => `${h.valor}H`}
                formatarBolha={(h) => `${h.valor}h por dia · ${pct(h.ajuste)}`}
              />

              <SliderDegraus
                icone={IconAgenda}
                titulo="Contrato"
                descricao="Duração da campanha. 1 mês é a referência neutra."
                degraus={DEGRAUS_CONTRATO}
                indice={iContrato}
                onChange={setIContrato}
                cor="#00A86B"
                formatarRotulo={(c) => c.label}
                formatarBolha={(c) => `${c.nome} · ${pct(c.ajuste)}`}
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

            {/* A campanha inteira — o contrato multiplica o pacote e as horas
                são repartidas entre os carros, não multiplicadas por veículo. */}
            <div className="mt-8 border-t border-ink/[0.07] pt-6">
              <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink">
                A campanha inteira
              </p>
              <p className="mt-1 text-[12px] leading-snug text-ink/45">
                O contrato multiplica o pacote: 3 meses são 3 pacotes. Dentro de cada período as
                horas são repartidas entre os carros.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-ink/[0.07] sm:grid-cols-3">
                {[
                  ['Duração', `${contrato.nome} · ${numero(plano.diasOperacao)} dias`],
                  ['Horas contratadas', `${numero(plano.horasContratadas)} h`],
                  ['Horas por veículo', `${plano.horasPorVeiculo.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`],
                  ['Exibições totais', numero(plano.exibicoesPacote * plano.meses)],
                  ['Exibições por veículo', numero(plano.exibicoesPorVeiculo)],
                  ['Investimento total', moeda(plano.total)],
                  ['Preço por mês', moeda(plano.pacote)],
                  ['Taxa do motorista', `${moedaCent(plano.taxaMotoristaHora)} /h`],
                  ['Motorista por veículo', moedaCent(plano.motoristaPorVeiculo)],
                  ['Margem da campanha', moeda(plano.margemCampanha)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white px-3.5 py-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink/40">{k}</p>
                    <p className="mt-1 font-grotesk text-[15px] font-bold tabular-nums text-ink">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* rodapé do painel */}
            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-ink/[0.07] pt-5">
              <span className="flex items-center gap-2 text-[12px] text-ink/50">
                <IconTablet className="h-4 w-4 text-brand" />
                Cada inserção dura 10 segundos
              </span>
              <span className="flex items-center gap-2 text-[12px] text-ink/50">
                <IconCarro className="h-4 w-4 text-brand" />
                Exibições na tela, não pessoas únicas alcançadas
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

              <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-ink/45">
                Preço do pacote
              </p>

              <p className="mt-1 font-grotesk text-[40px] font-bold leading-none tracking-tight text-brand tabular-nums md:text-[46px]">
                {moeda(plano.pacote)}
              </p>
              <p className="mt-2 text-[12px] text-ink/50">
                {numero(pacoteH)} horas · {numero(veiculos)} carros · {horas}h/dia · {contrato.nome}
              </p>

              {/* Decomposição: preço-base e cada eixo de ajuste, como na planilha. */}
              <dl className="mt-5 space-y-2 border-t border-ink/[0.07] pt-4 text-[12.5px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink/50">
                    Preço-base <span className="text-ink/35">{numero(pacoteH)}h × {moedaCent(7.5)}</span>
                  </dt>
                  <dd className="font-semibold tabular-nums text-ink">{moeda(1500 * (pacoteH / 200))}</dd>
                </div>
                {[
                  [`Pacote ${numero(pacoteH)} horas`, plano.ajustes.pacote],
                  [`Volume ${numero(veiculos)} carros`, plano.ajustes.veiculos],
                  [`Janela diária ${horas}h por dia`, plano.ajustes.horas],
                  [`Prazo ${contrato.nome}`, plano.ajustes.prazo],
                ].map(([k, a]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink/50">{k}</dt>
                    <dd className="flex items-baseline gap-2 tabular-nums">
                      <span className={a > 0 ? 'text-[#C2410C]' : a < 0 ? 'text-[#00A86B]' : 'text-ink/35'}>
                        {pct(a)}
                      </span>
                      <span className="font-semibold text-ink">
                        {a === 0 ? '+R$ 0' : moeda(1500 * (pacoteH / 200) * a)}
                      </span>
                    </dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 border-t border-ink/[0.07] pt-2">
                  <dt className="font-semibold text-ink">Ajuste total</dt>
                  <dd className="flex items-baseline gap-2 tabular-nums">
                    <span className={plano.ajusteTotal > 0 ? 'text-[#C2410C]' : plano.ajusteTotal < 0 ? 'text-[#00A86B]' : 'text-ink/35'}>
                      {pct(plano.ajusteTotal)}
                    </span>
                    <span className="font-bold text-ink">{moeda(plano.pacote)}</span>
                  </dd>
                </div>
              </dl>

              {/* Repartição do preço: as três fatias são proporcionais. */}
              <div className="mt-5 border-t border-ink/[0.07] pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink/45">
                    Margem por pacote
                  </span>
                  <span className="font-grotesk text-lg font-bold tabular-nums text-[#00A86B]">
                    {moeda(plano.margem)}
                  </span>
                </div>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
                  <span className="bg-[#7C5CFF]" style={{ width: '33.33%' }} />
                  <span className="bg-ink/25" style={{ width: '33.33%' }} />
                  <span className="bg-[#00A86B]" style={{ width: '33.34%' }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink/50">
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#7C5CFF]" />Motorista</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ink/25" />Custos</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#00A86B]" />Margem</span>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink/45">
                  33,3% do pacote. Motorista leva {moeda(plano.motorista)} — {moedaCent(plano.taxaMotoristaHora)} por
                  hora de tela.
                </p>
              </div>

              {/* Métricas de tela */}
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-ink/[0.07]">
                {[
                  ['Preço/hora', moedaCent(plano.precoHora)],
                  ['Custo por exibição', moedaCent(plano.custoPorExibicao)],
                  ['Exibições no pacote', numero(plano.exibicoesPacote)],
                  ['CPM técnico', moedaCent(plano.cpmTecnico)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white px-3.5 py-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink/40">{k}</p>
                    <p className="mt-1 font-grotesk text-[15px] font-bold tabular-nums text-ink">{v}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[11.5px] leading-relaxed text-ink/40">
                Os carros não multiplicam o preço: as horas contratadas são repartidas entre a
                frota. Valor ilustrativo — a proposta final é ajustada conforme ocupação e
                disponibilidade na praça.
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
                  Contratos longos ganham desconto pela previsibilidade de receita e pelo
                  compromisso comercial —{' '}
                  <strong className="font-semibold text-[#00A86B]">
                    {Math.abs(Math.round(ajustePrazo(upsell.id) * 100))}% no prazo de {upsell.nome}
                  </strong>
                  .
                </p>

                <div className="mt-4 flex items-baseline justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-[#00A86B]/15">
                  <span className="text-[12px] text-ink/50">Novo preço por pacote</span>
                  <span className="font-grotesk text-lg font-bold tabular-nums text-[#00A86B]">
                    {moeda(planoUpsell.pacote)}
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
