/**
 * Precificação FastLead — fonte única da verdade.
 *
 * Vem da planilha `Fast_Lead_Tabela_Precificacao_v2.xlsx` (abas Premissas,
 * Tabela Comercial, Contratos, Simulador) e do documento
 * `Premissas de Precificação — Fast Lead`.
 *
 * FÓRMULA (os ajustes são SOMADOS e aplicados de uma vez sobre o preço-base):
 *
 *   preço = 1.500 × (horas ÷ 200) × (1 + ajustePacote + ajusteCarros
 *                                      + ajusteHoras + ajustePrazo)
 *
 * O pacote de referência é 200 horas · 100 carros · 8h/dia · 1 mês = R$ 1.500.
 *
 * ⚠️ O NÚMERO DE CARROS NÃO MULTIPLICA O PREÇO. As horas contratadas são
 * repartidas entre a frota (pulverização); mais carros = mais desconto, porque
 * a mesma tela é diluída em mais veículos. O modelo anterior multiplicava por
 * veículo e inflava o preço em uma ordem de grandeza.
 */

/** Preço-base do pacote de referência (200h · 100 carros · 8h/dia · 1 mês). */
export const PRECO_BASE = 1500;

/** Pacote de referência, em horas de tela por mês (8h/dia × 25 dias). */
export const PACOTE_REFERENCIA_H = 200;

/** Dias de operação considerados no mês. */
export const DIAS_OPERACAO_MES = 25;

/** Duração de cada inserção, em segundos. */
export const SEGUNDOS_POR_EXIBICAO = 10;

/**
 * Repartição do preço. As três fatias são PROPORCIONAIS: acompanham o preço
 * seja qual for o ajuste, então o desconto é rateado igualmente entre elas.
 * Consequência declarada: o motorista absorve um terço de cada desconto.
 */
export const FATIA_MOTORISTA = 1 / 3;
export const FATIA_CUSTOS = 1 / 3;
export const FATIA_MARGEM = 1 / 3;

/* ───────────────────────── eixos de ajuste ───────────────────────── */

/** Veículos. Referência: 100 carros. Poucos carros pagam mais; escala desconta. */
export const DEGRAUS_VEICULOS = [
  { valor: 10, ajuste: 0.1 },
  { valor: 50, ajuste: 0.05 },
  { valor: 100, ajuste: 0 },
  { valor: 200, ajuste: -0.05 },
  { valor: 300, ajuste: -0.08 },
  { valor: 500, ajuste: -0.1 },
  { valor: 1000, ajuste: -0.13 },
  { valor: 10000, ajuste: -0.2 },
];

/** Horas/dia. Referência: 8h (janela cheia). Só acréscimo — nunca desconto. */
export const DEGRAUS_HORAS = [
  { valor: 1, ajuste: 0.3 },
  { valor: 2, ajuste: 0.25 },
  { valor: 3, ajuste: 0.2 },
  { valor: 4, ajuste: 0.15 },
  { valor: 5, ajuste: 0.1 },
  { valor: 6, ajuste: 0.05 },
  { valor: 7, ajuste: 0.02 },
  { valor: 8, ajuste: 0 },
];

/** Contrato. Referência: 1 mês. `meses` multiplica o pacote (3 meses = 3 pacotes). */
export const DEGRAUS_CONTRATO = [
  { id: '1d', label: '1d', nome: '1 dia', ajuste: 0.2, meses: 1 / DIAS_OPERACAO_MES, dias: 1 },
  { id: '1s', label: '1s', nome: '1 semana', ajuste: 0.1, meses: 5 / DIAS_OPERACAO_MES, dias: 7 },
  { id: '1m', label: '1m', nome: '1 mês', ajuste: 0, meses: 1, dias: 30 },
  { id: '3m', label: '3m', nome: '3 meses', ajuste: -0.05, meses: 3, dias: 90 },
  { id: '6m', label: '6m', nome: '6 meses', ajuste: -0.1, meses: 6, dias: 180 },
  { id: '12m', label: '12m', nome: '12 meses', ajuste: -0.15, meses: 12, dias: 365 },
];

/** Tamanho do pacote, em horas/mês. Referência: 200h. */
export const DEGRAUS_PACOTE = [
  { valor: 50, ajuste: 0.1 },
  { valor: 100, ajuste: 0.05 },
  { valor: 200, ajuste: 0 },
  { valor: 400, ajuste: -0.05 },
  { valor: 1000, ajuste: -0.1 },
];

/**
 * Períodos do dia. Segmentação da campanha — NÃO entram no preço.
 * A precificação tem quatro eixos (pacote, carros, horas/dia, prazo) e o
 * período não é um deles.
 */
export const PERIODOS = [
  { id: 'manha', nome: 'Manhã', janela: '06h — 12h' },
  { id: 'tarde', nome: 'Tarde', janela: '12h — 18h' },
  { id: 'noite', nome: 'Noite', janela: '18h — 00h' },
];

/* ───────────────────────── cálculo ───────────────────────── */

const ajusteDe = (degraus, valor) =>
  degraus.find((d) => d.valor === valor)?.ajuste ?? 0;

export const ajusteVeiculos = (v) => ajusteDe(DEGRAUS_VEICULOS, v);
export const ajusteHoras = (h) => ajusteDe(DEGRAUS_HORAS, h);
export const ajustePacote = (p) => ajusteDe(DEGRAUS_PACOTE, p);
export const ajustePrazo = (id) =>
  DEGRAUS_CONTRATO.find((c) => c.id === id)?.ajuste ?? 0;

/**
 * Preço de UM pacote (um mês de contrato).
 *
 * @param {{pacoteH:number, veiculos:number, horasDia:number, contratoId:string}} p
 */
export function precoDoPacote({ pacoteH, veiculos, horasDia, contratoId }) {
  const ajuste =
    ajustePacote(pacoteH) +
    ajusteVeiculos(veiculos) +
    ajusteHoras(horasDia) +
    ajustePrazo(contratoId);

  return PRECO_BASE * (pacoteH / PACOTE_REFERENCIA_H) * (1 + ajuste);
}

/**
 * Plano completo: preço do pacote, repartição e métricas derivadas.
 *
 * O contrato multiplica o pacote — 3 meses são 3 pacotes —, e dentro de cada
 * período as horas são repartidas entre os carros.
 */
export function calcularPlano({ pacoteH, veiculos, horasDia, contratoId }) {
  const contrato =
    DEGRAUS_CONTRATO.find((c) => c.id === contratoId) ?? DEGRAUS_CONTRATO[2];

  const ajusteTotal =
    ajustePacote(pacoteH) +
    ajusteVeiculos(veiculos) +
    ajusteHoras(horasDia) +
    ajustePrazo(contratoId);

  const pacote = precoDoPacote({ pacoteH, veiculos, horasDia, contratoId });
  const total = pacote * contrato.meses;

  const exibicoesPacote = (pacoteH * 3600) / SEGUNDOS_POR_EXIBICAO;
  const precoHora = pacote / pacoteH;

  const motoristaPacote = pacote * FATIA_MOTORISTA;

  return {
    // preço
    pacote,
    total,
    ajusteTotal,
    ajustes: {
      pacote: ajustePacote(pacoteH),
      veiculos: ajusteVeiculos(veiculos),
      horas: ajusteHoras(horasDia),
      prazo: ajustePrazo(contratoId),
    },

    // repartição (proporcional ao preço)
    motorista: motoristaPacote,
    custos: pacote * FATIA_CUSTOS,
    margem: pacote * FATIA_MARGEM,

    // métricas de tela
    precoHora,
    exibicoesPacote,
    custoPorExibicao: pacote / exibicoesPacote,
    cpmTecnico: (pacote / exibicoesPacote) * 1000,

    // por veículo
    horasPorVeiculo: veiculos ? pacoteH / veiculos : 0,
    exibicoesPorVeiculo: veiculos ? exibicoesPacote / veiculos : 0,
    motoristaPorVeiculo: veiculos ? motoristaPacote / veiculos : 0,

    // o que o motorista ganha por hora de tela
    taxaMotoristaHora: motoristaPacote / pacoteH,

    // campanha
    meses: contrato.meses,
    diasOperacao: Math.round(contrato.meses * DIAS_OPERACAO_MES),
    horasContratadas: pacoteH * contrato.meses,
    margemCampanha: pacote * FATIA_MARGEM * contrato.meses,
  };
}

/** Próximo degrau de contrato — alimenta o card de upsell "Turbine seu plano". */
export function proximoDegrauContrato(contratoId) {
  const i = DEGRAUS_CONTRATO.findIndex((c) => c.id === contratoId);
  if (i < 0 || i >= DEGRAUS_CONTRATO.length - 1) return null;
  return DEGRAUS_CONTRATO[i + 1];
}

/* ───────────────────────── formatação ───────────────────────── */

export const moeda = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const moedaCent = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const numero = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export const pct = (v) =>
  `${v > 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
