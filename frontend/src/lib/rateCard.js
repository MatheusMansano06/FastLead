/**
 * Tabela de referência do simulador de mídia da landing.
 *
 * ⚠️ VALORES ILUSTRATIVOS. Nada aqui vem da API — é uma estimativa comercial
 * para o anunciante ter ordem de grandeza antes de falar com a gente. Toda tela
 * que consome este arquivo é obrigada a exibir o selo "valor ilustrativo".
 * Número real de campanha sai de proposta / do painel, nunca daqui.
 *
 * Para reajustar preço, mexa SÓ neste arquivo — o layout não conhece número.
 *
 * Ancoragem da tarifa base: o modelo de negócio prevê ~R$ 250/veículo/mês na
 * configuração de referência (4h/dia, período único), do qual 30% é a comissão
 * do motorista. 4h × 30d × R$ 2,00 = R$ 240. Ver decisao_modelo_comissao.
 */

/** Tarifa base: R$ por veículo, por hora de exibição, por dia. */
export const TARIFA_HORA_VEICULO = 2.0;

/** Degraus do slider de veículos (espelham a print aprovada). */
export const DEGRAUS_VEICULOS = [10, 50, 100, 200, 300, 500, 1000, 10000];

/** Degraus do slider de contrato. `dias` alimenta o cálculo. */
export const DEGRAUS_CONTRATO = [
  { id: '1d', label: '1d', nome: '1 dia', dias: 1 },
  { id: '1s', label: '1s', nome: '1 semana', dias: 7 },
  { id: '1m', label: '1m', nome: '1 mês', dias: 30 },
  { id: '3m', label: '3m', nome: '3 meses', dias: 90 },
  { id: '6m', label: '6m', nome: '6 meses', dias: 180 },
  { id: '12m', label: '12m', nome: '12 meses', dias: 365 },
];

/** Degraus do slider de horas no ar por dia. */
export const DEGRAUS_HORAS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Períodos de exibição. O fator reflete disputa por inventário:
 * manhã e noite são pico de deslocamento, tarde é o vale.
 */
export const PERIODOS = [
  { id: 'manha', nome: 'Manhã', janela: '06h — 12h', fator: 1.05 },
  { id: 'tarde', nome: 'Tarde', janela: '12h — 18h', fator: 0.95 },
  { id: 'noite', nome: 'Noite', janela: '18h — 00h', fator: 1.1 },
];

/** Desconto por volume de veículos contratados. */
const DESCONTO_VOLUME = [
  { min: 10000, desconto: 0.35 },
  { min: 1000, desconto: 0.25 },
  { min: 500, desconto: 0.2 },
  { min: 300, desconto: 0.15 },
  { min: 200, desconto: 0.12 },
  { min: 100, desconto: 0.08 },
  { min: 50, desconto: 0.05 },
  { min: 0, desconto: 0 },
];

/** Desconto progressivo por prazo — é o gancho do bloco "Turbine seu plano". */
const DESCONTO_PRAZO = {
  '1d': 0,
  '1s': 0,
  '1m': 0.05,
  '3m': 0.1,
  '6m': 0.15,
  '12m': 0.22,
};

/**
 * Fator de praça. Mercados com mais disputa por inventário custam mais.
 * Aplicamos o MAIOR fator entre as praças escolhidas (a praça premium manda no
 * preço), não a média — senão diluir SP em 20 cidades pequenas baratearia SP.
 */
const FATOR_PRACA = { SP_CAPITAL: 1.25, RJ_CAPITAL: 1.15, CAPITAL: 1.05, INTERIOR: 1.0 };

export function fatorDePraca(pracas) {
  if (!pracas?.length) return 1.0;
  return Math.max(...pracas.map((p) => FATOR_PRACA[p.tier] ?? FATOR_PRACA.INTERIOR));
}

function descontoVolume(veiculos) {
  return DESCONTO_VOLUME.find((f) => veiculos >= f.min)?.desconto ?? 0;
}

export function descontoPrazo(contratoId) {
  return DESCONTO_PRAZO[contratoId] ?? 0;
}

/**
 * Fator de período. Nenhum selecionado = dia inteiro (1.0).
 *
 * Aplicamos o MAIOR fator entre os períodos escolhidos — o período premium
 * manda no preço —, pela mesma razão de `fatorDePraca`. A versão anterior
 * tirava a média e o preço CAÍA ao adicionar um período: manhã sozinha dava
 * 1.05, manhã+tarde dava (1.05+0.95)/2 = 1.00, e os três davam 1.033, ainda
 * abaixo de manhã sozinha. Quem compra manhã e aceita rodar de tarde também
 * não pode ficar mais barato do que quem só quer manhã.
 */
function fatorDePeriodo(periodosIds) {
  if (!periodosIds?.length) return 1.0;
  const fatores = PERIODOS.filter((p) => periodosIds.includes(p.id)).map((p) => p.fator);
  if (!fatores.length) return 1.0;
  return Math.max(...fatores);
}

/**
 * Estimativa de investimento do plano.
 *
 * @returns {{
 *   total: number, mensal: number, diario: number, porVeiculoMes: number,
 *   dias: number, descontoTotal: number, descontoPrazoPct: number,
 *   descontoVolumePct: number, economia: number,
 *   impactosEstimados: number
 * }}
 */
export function calcularPlano({ veiculos, contratoId, horas, periodos, pracas }) {
  const contrato = DEGRAUS_CONTRATO.find((c) => c.id === contratoId) ?? DEGRAUS_CONTRATO[2];
  const dias = contrato.dias;

  const bruto = veiculos * dias * horas * TARIFA_HORA_VEICULO;

  const fPeriodo = fatorDePeriodo(periodos);
  const fPraca = fatorDePraca(pracas);
  const dVolume = descontoVolume(veiculos);
  const dPrazo = descontoPrazo(contratoId);

  // Descontos são combinados de forma multiplicativa: 20% e 22% viram 37,6%,
  // não 42%. Evita que a soma dos degraus chegue perto de zerar a tarifa.
  const fatorDesconto = (1 - dVolume) * (1 - dPrazo);

  const semDesconto = bruto * fPeriodo * fPraca;
  const total = semDesconto * fatorDesconto;

  // Impacto = passageiros expostos. Referência operacional: ~2,5 corridas por
  // hora de tablet ligado. É premissa de planejamento, não medição.
  const impactosEstimados = Math.round(veiculos * dias * horas * 2.5);

  return {
    total,
    mensal: dias >= 30 ? (total / dias) * 30 : total,
    diario: total / dias,
    porVeiculoMes: veiculos ? (total / dias / veiculos) * 30 : 0,
    dias,
    descontoTotal: 1 - fatorDesconto,
    descontoPrazoPct: dPrazo,
    descontoVolumePct: dVolume,
    economia: semDesconto - total,
    impactosEstimados,
  };
}

/** Próximo degrau de contrato — alimenta o card de upsell "Turbine seu plano". */
export function proximoDegrauContrato(contratoId) {
  const i = DEGRAUS_CONTRATO.findIndex((c) => c.id === contratoId);
  if (i < 0 || i >= DEGRAUS_CONTRATO.length - 1) return null;
  return DEGRAUS_CONTRATO[i + 1];
}

export const moeda = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const numero = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
