/**
 * Tabela de preço da mídia.
 *
 * Espelha `frontend/src/lib/rateCard.js`, que era o simulador da landing. A
 * fórmula é a mesma de propósito: o anunciante que viu uma estimativa antes de
 * entrar não pode encontrar outro número na hora de contratar.
 *
 * ⚠️ São dois arquivos em repositórios diferentes com a mesma tabela. Mexeu num,
 * mexa no outro no mesmo dia — divergência aqui não quebra teste nenhum, só
 * aparece como preço diferente do que foi prometido.
 *
 * A diferença de peso entre os dois: lá o número era ilustrativo e a tela
 * carregava selo dizendo isso. Aqui ele é cobrado. O que era ordem de grandeza
 * virou fatura.
 *
 * Ancoragem: ~R$ 250 por veículo/mês na configuração de referência (4h/dia),
 * dos quais 30% é a comissão do motorista. 4h × 30d × R$ 2,00 = R$ 240.
 */

/** Tarifa base: R$ por veículo, por hora de exibição, por dia. */
export const TARIFA_HORA_VEICULO = 2.0;

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

/**
 * Desconto por prazo, em dias.
 *
 * O simulador da landing usa degraus fechados (1d, 1s, 1m, 3m…). Aqui a conta é
 * por dia corrido, porque a empresa escolhe as datas num calendário e pode
 * pedir 45 dias. Os patamares são os mesmos degraus — quem contrata 45 dias cai
 * na faixa de 1 mês, e o desconto de 3 meses só entra aos 90.
 */
const DESCONTO_PRAZO = [
  { minDias: 365, desconto: 0.22 },
  { minDias: 180, desconto: 0.15 },
  { minDias: 90, desconto: 0.1 },
  { minDias: 30, desconto: 0.05 },
  { minDias: 0, desconto: 0 },
];

/**
 * Fator de praça. Mercado com mais disputa por inventário custa mais.
 *
 * Vale o MAIOR fator entre as praças escolhidas, não a média: diluir São Paulo
 * em vinte cidades pequenas não pode baratear São Paulo.
 */
const FATOR_PRACA: Record<string, number> = {
  SP_CAPITAL: 1.25,
  RJ_CAPITAL: 1.15,
  CAPITAL: 1.05,
  INTERIOR: 1.0,
};

/** UFs cujas capitais entram como praça premium. */
const CAPITAIS_PREMIUM: Record<string, string> = {
  'são paulo': 'SP_CAPITAL',
  'sao paulo': 'SP_CAPITAL',
  'rio de janeiro': 'RJ_CAPITAL',
};

const CAPITAIS = new Set([
  'belo horizonte',
  'brasília',
  'brasilia',
  'curitiba',
  'porto alegre',
  'salvador',
  'recife',
  'fortaleza',
  'goiânia',
  'goiania',
  'belém',
  'belem',
  'manaus',
  'vitória',
  'vitoria',
  'florianópolis',
  'florianopolis',
]);

function tierDaCidade(cidade: string): string {
  const c = cidade.trim().toLowerCase();
  if (CAPITAIS_PREMIUM[c]) return CAPITAIS_PREMIUM[c];
  if (CAPITAIS.has(c)) return 'CAPITAL';
  return 'INTERIOR';
}

/** Sem cidade escolhida a campanha roda em qualquer praça: fator neutro. */
export function fatorDePraca(cidades: string[]): number {
  if (!cidades?.length) return 1.0;
  return Math.max(...cidades.map((c) => FATOR_PRACA[tierDaCidade(c)] ?? 1.0));
}

export function descontoVolume(veiculos: number): number {
  return DESCONTO_VOLUME.find((f) => veiculos >= f.min)?.desconto ?? 0;
}

export function descontoPrazo(dias: number): number {
  return DESCONTO_PRAZO.find((f) => dias >= f.minDias)?.desconto ?? 0;
}

export interface PlanInput {
  /** Quantos carros a campanha quer ocupar. */
  vehicles: number;
  /** Minutos de tela por dia em cada carro. */
  dailyMinutes: number;
  /** Dias corridos de campanha. */
  days: number;
  /** Cidades-alvo; vazio significa qualquer praça. */
  cities?: string[];
}

export interface PlanQuote {
  total: number;
  perDay: number;
  perVehicleMonth: number;
  days: number;
  dailyMinutes: number;
  vehicles: number;
  /** Antes dos descontos, para a tela mostrar o que foi economizado. */
  grossTotal: number;
  savings: number;
  discounts: { volume: number; term: number; combined: number };
  placeFactor: number;
}

/**
 * Quanto custa o plano.
 *
 * O preço cresce com as três dimensões que consomem inventário: carros, horas
 * de tela por dia e dias de campanha. Dobrar as horas dobra o preço, porque
 * dobra o espaço ocupado na agenda do motorista — que é finita e tem teto.
 */
export function quotePlan(input: PlanInput): PlanQuote {
  const vehicles = Math.max(1, Math.floor(input.vehicles));
  const days = Math.max(1, Math.floor(input.days));
  const dailyMinutes = Math.max(1, Math.floor(input.dailyMinutes));
  const horas = dailyMinutes / 60;

  const bruto = vehicles * days * horas * TARIFA_HORA_VEICULO;

  const fPraca = fatorDePraca(input.cities ?? []);
  const dVolume = descontoVolume(vehicles);
  const dPrazo = descontoPrazo(days);

  // Descontos combinam multiplicando, não somando: 25% e 22% viram 41,5%, não
  // 47%. Somar deixaria os degraus altos chegarem perto de zerar a tarifa.
  const fatorDesconto = (1 - dVolume) * (1 - dPrazo);

  const semDesconto = bruto * fPraca;
  const total = semDesconto * fatorDesconto;

  const round2 = (v: number) => Math.round(v * 100) / 100;

  return {
    total: round2(total),
    perDay: round2(total / days),
    perVehicleMonth: round2((total / days / vehicles) * 30),
    days,
    dailyMinutes,
    vehicles,
    grossTotal: round2(semDesconto),
    savings: round2(semDesconto - total),
    discounts: {
      volume: dVolume,
      term: dPrazo,
      combined: round2(1 - fatorDesconto),
    },
    placeFactor: fPraca,
  };
}

/** Dias corridos entre duas datas, contando o primeiro e o último. */
export function daysBetween(start: Date, end: Date): number {
  const umDia = 24 * 60 * 60 * 1000;
  const a = new Date(start).setHours(0, 0, 0, 0);
  const b = new Date(end).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / umDia) + 1);
}
