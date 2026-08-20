/**
 * Precificação — espelho no servidor do rate card da landing.
 *
 * Fonte: `Fast_Lead_Tabela_Precificacao_v2.xlsx` (abas Premissas, Tabela
 * Comercial, Contratos, Simulador). Tem que andar junto com
 * `frontend/src/lib/rateCard.js`: quem viu uma estimativa antes de entrar não
 * pode encontrar outro número na hora de contratar.
 *
 * FÓRMULA (ajustes SOMADOS, aplicados de uma vez sobre o preço-base):
 *
 *   preço = 1.500 × (horas ÷ 200) × (1 + ajustePacote + ajusteCarros
 *                                      + ajusteHoras + ajustePrazo)
 *
 * ⚠️ O NÚMERO DE CARROS NÃO MULTIPLICA O PREÇO. As horas contratadas são
 * repartidas entre a frota (pulverização): mais carros dão DESCONTO, porque a
 * mesma tela é diluída em mais veículos. O modelo anterior cobrava
 * `veiculos × dias × horas × tarifa` e inflava o preço em uma ordem de grandeza.
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
 * O preço se divide em três fatias proporcionais: motorista, custos
 * operacionais e margem. Como são proporcionais, o motorista acompanha
 * desconto e acréscimo — absorve um terço de cada desconto.
 */
export const FATIA_MOTORISTA = 1 / 3;

type Degrau = { valor: number; ajuste: number };

/** Veículos. Referência: 100 carros. */
export const DEGRAUS_VEICULOS: Degrau[] = [
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
export const DEGRAUS_HORAS: Degrau[] = [
  { valor: 1, ajuste: 0.3 },
  { valor: 2, ajuste: 0.25 },
  { valor: 3, ajuste: 0.2 },
  { valor: 4, ajuste: 0.15 },
  { valor: 5, ajuste: 0.1 },
  { valor: 6, ajuste: 0.05 },
  { valor: 7, ajuste: 0.02 },
  { valor: 8, ajuste: 0 },
];

/** Prazo, em dias corridos. Referência: 1 mês. */
export const DEGRAUS_PRAZO = [
  { dias: 1, ajuste: 0.2 },
  { dias: 7, ajuste: 0.1 },
  { dias: 30, ajuste: 0 },
  { dias: 90, ajuste: -0.05 },
  { dias: 180, ajuste: -0.1 },
  { dias: 365, ajuste: -0.15 },
];

/** Tamanho do pacote, em horas/mês. Referência: 200h. */
export const DEGRAUS_PACOTE: Degrau[] = [
  { valor: 50, ajuste: 0.1 },
  { valor: 100, ajuste: 0.05 },
  { valor: 200, ajuste: 0 },
  { valor: 400, ajuste: -0.05 },
  { valor: 1000, ajuste: -0.1 },
];

/**
 * Ajuste do degrau mais próximo ABAIXO do valor pedido, com o primeiro degrau
 * como piso. O contratante escolhe números livres (137 carros, 250h) e a
 * planilha só define os degraus; arredondar para baixo cobra o ajuste do
 * degrau que ele de fato alcançou, nunca um desconto que não conquistou.
 */
function ajusteDoDegrau(degraus: Degrau[], valor: number): number {
  let ajuste = degraus[0].ajuste;
  for (const d of degraus) if (valor >= d.valor) ajuste = d.ajuste;
  return ajuste;
}

export const ajusteVeiculos = (v: number) => ajusteDoDegrau(DEGRAUS_VEICULOS, v);
export const ajusteHoras = (h: number) => ajusteDoDegrau(DEGRAUS_HORAS, h);
export const ajustePacote = (p: number) => ajusteDoDegrau(DEGRAUS_PACOTE, p);

export function ajustePrazo(dias: number): number {
  let ajuste = DEGRAUS_PRAZO[0].ajuste;
  for (const d of DEGRAUS_PRAZO) if (dias >= d.dias) ajuste = d.ajuste;
  return ajuste;
}

export interface PlanInput {
  /** Entre quantos carros as horas contratadas são pulverizadas. */
  vehicles: number;
  /** Minutos de tela por dia em cada carro. */
  dailyMinutes: number;
  /** Dias corridos de campanha. */
  days: number;
  /** Cidades-alvo. Segmentação — não entra no preço. */
  cities?: string[];
  /**
   * Horas de tela contratadas por mês.
   *
   * Na planilha, tamanho do pacote e janela diária são eixos INDEPENDENTES: a
   * tabela comercial segura o pacote em 200h enquanto varia as horas/dia, o
   * que implica variar os dias de entrega. Quando o contratante escolheu um
   * pacote no simulador, é esse número que tem que chegar aqui.
   *
   * Sem ele caímos em `horas/dia × 25 dias`, que acopla os dois eixos e cobra
   * o acréscimo de pacote pequeno junto com o de janela curta.
   */
  packageHours?: number;
}

export interface PlanQuote {
  /** Investimento da campanha inteira (pacote × meses). */
  total: number;
  /** Preço de um pacote, isto é, de um mês. */
  packagePrice: number;
  /** Horas de tela contratadas por mês. */
  packageHours: number;
  /** Horas de tela da campanha inteira. */
  totalHours: number;
  /** Quanto o motorista recebe por hora de tela — vai para Campaign. */
  driverRateHour: number;
  /** Fatia do motorista no pacote. */
  driverShare: number;
  ajusteTotal: number;
  ajustes: { pacote: number; veiculos: number; horas: number; prazo: number };
  days: number;
  months: number;
  dailyMinutes: number;
  vehicles: number;
  /** Exibições de 10s que cabem no pacote. */
  impressions: number;
  costPerImpression: number;
  cpm: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

/**
 * Quanto custa o plano.
 *
 * `dailyMinutes` é a janela diária; o pacote mensal sai de
 * `horas/dia × 25 dias de operação`.
 */
export function quotePlan(input: PlanInput): PlanQuote {
  const vehicles = Math.max(1, Math.floor(input.vehicles));
  const days = Math.max(1, Math.floor(input.days));
  const dailyMinutes = Math.max(1, Math.floor(input.dailyMinutes));

  const horasDia = dailyMinutes / 60;
  const packageHours = Math.max(1, input.packageHours ?? horasDia * DIAS_OPERACAO_MES);

  // Meses de contrato, pelos dias de operação. Campanha de 1 dia é uma fração
  // de pacote, não um pacote inteiro.
  const months = days / 30;

  const ajustes = {
    pacote: ajustePacote(packageHours),
    veiculos: ajusteVeiculos(vehicles),
    horas: ajusteHoras(horasDia),
    prazo: ajustePrazo(days),
  };
  const ajusteTotal = ajustes.pacote + ajustes.veiculos + ajustes.horas + ajustes.prazo;

  const packagePrice =
    PRECO_BASE * (packageHours / PACOTE_REFERENCIA_H) * (1 + ajusteTotal);

  const total = packagePrice * months;
  const driverShare = packagePrice * FATIA_MOTORISTA;
  const impressions = (packageHours * 3600) / SEGUNDOS_POR_EXIBICAO;

  return {
    total: round2(total),
    packagePrice: round2(packagePrice),
    packageHours: round2(packageHours),
    totalHours: round2(packageHours * months),
    // Quatro casas: a R$ 2,50/h uma inserção de 10s vale menos de um centavo,
    // e arredondar a taxa a centavos deslocaria o ganho do dia inteiro.
    driverRateHour: round4(driverShare / packageHours),
    driverShare: round2(driverShare),
    ajusteTotal: round4(ajusteTotal),
    ajustes,
    days,
    months: round4(months),
    dailyMinutes,
    vehicles,
    impressions: Math.round(impressions),
    costPerImpression: round4(packagePrice / impressions),
    cpm: round2((packagePrice / impressions) * 1000),
  };
}

/** Dias corridos entre duas datas, contando o primeiro e o último. */
export function daysBetween(start: Date, end: Date): number {
  const umDia = 24 * 60 * 60 * 1000;
  const a = new Date(start).setHours(0, 0, 0, 0);
  const b = new Date(end).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / umDia) + 1);
}
