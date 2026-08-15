import prisma from '../lib/prisma';

/**
 * Inventário de tela do tablet.
 *
 * O que a empresa compra não é "aparecer": é uma quantidade de minutos de tela
 * por dia, dentro do teto do motorista. Quem comprou o dobro de minutos aparece
 * o dobro de vezes na rotação.
 *
 * Os minutos não são seguidos. Viram slots curtos espalhados pelo dia — o
 * passageiro de uma corrida de quinze minutos precisa ver o anúncio naquela
 * corrida, e um bloco contínuo de duas horas alcançaria só quem estivesse no
 * carro naquele momento.
 */

/**
 * Teto diário do motorista, em minutos.
 *
 * 12 horas: ninguém roda mais que isso num dia, e vender acima seria vender
 * tela que não existe.
 *
 * Vale como capacidade, não como promessa. Se ele encher as 12 horas e rodar
 * sete, cada anunciante recebe proporcionalmente menos — é por isso que o
 * relatório mostra entregue contra contratado, para isso aparecer em número em
 * vez de virar reclamação no fim do mês.
 */
export const DAILY_MINUTES_CAP = 12 * 60;

/** Duração de cada aparição na tela. 1 hora contratada = 180 slots. */
export const SLOT_SECONDS = 20;

export interface DriverCapacity {
  capMinutes: number;
  committedMinutes: number;
  availableMinutes: number;
  campaigns: Array<{ campaignId: string; title: string; dailyMinutes: number }>;
}

export class InventoryService {
  /** Início do dia de hoje, para contar o que já foi entregue. */
  private static startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Campanhas que ocupam a agenda do motorista e quanto sobra.
   *
   * Conta só o que de fato disputa tela: campanha ativa, dentro do período, e
   * que ele não recusou nem o MASTER bloqueou. Campanha vencida não pode
   * continuar segurando minutos que ele poderia estar vendendo.
   */
  static async driverCapacity(motoristaId: string): Promise<DriverCapacity> {
    const hoje = new Date();

    const vinculos = await prisma.campaignMotorista.findMany({
      where: {
        motorista_id: motoristaId,
        source: { notIn: ['MASTER_BLOCKED', 'DRIVER_REMOVED'] },
        campaign: {
          status: 'ACTIVE',
          deleted_at: null,
          start_date: { lte: hoje },
          end_date: { gte: hoje },
        },
      },
      select: {
        campaign: { select: { id: true, title: true, daily_minutes: true } },
      },
    });

    const campaigns = vinculos.map((v) => ({
      campaignId: v.campaign.id,
      title: v.campaign.title,
      dailyMinutes: v.campaign.daily_minutes,
    }));
    const committedMinutes = campaigns.reduce((s, c) => s + c.dailyMinutes, 0);

    return {
      capMinutes: DAILY_MINUTES_CAP,
      committedMinutes,
      // Nunca negativo: uma campanha empurrada pelo MASTER pode estourar o teto,
      // e mostrar "-40 min disponíveis" não ajudaria ninguém a decidir nada.
      availableMinutes: Math.max(0, DAILY_MINUTES_CAP - committedMinutes),
      campaigns,
    };
  }

  /**
   * Minutos de tela já entregues hoje, por campanha, no tablet deste motorista.
   *
   * Sai da soma real de `duration_ms` das impressões — o tempo que o anúncio
   * ficou na tela, não o número de vezes que apareceu multiplicado pelo slot
   * teórico. Se a tela apagou no meio, aquele tempo não foi entregue.
   */
  static async deliveredTodayMinutes(motoristaId: string): Promise<Map<string, number>> {
    const linhas = await prisma.impressionEvent.groupBy({
      by: ['campaign_id'],
      where: { motorista_id: motoristaId, shown_at: { gte: this.startOfToday() } },
      _sum: { duration_ms: true },
    });

    return new Map(linhas.map((l) => [l.campaign_id, (l._sum.duration_ms ?? 0) / 60_000]));
  }

  /**
   * Peso de cada campanha na rotação, já descontado o que ela entregou hoje.
   *
   * O peso é o que **falta** entregar, não o contratado. Quem já cumpriu a cota
   * do dia sai da rotação e devolve os slots para as outras — senão continuaria
   * ocupando tela que a empresa já recebeu, tomando o lugar de quem ainda tem
   * saldo.
   */
  static async rotationWeights(
    motoristaId: string,
    campaignIds: string[]
  ): Promise<Map<string, number>> {
    if (campaignIds.length === 0) return new Map();

    const [campanhas, entregue] = await Promise.all([
      prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, daily_minutes: true },
      }),
      this.deliveredTodayMinutes(motoristaId),
    ]);

    const pesos = new Map<string, number>();
    for (const c of campanhas) {
      const restante = c.daily_minutes - (entregue.get(c.id) ?? 0);
      // Arredonda para minuto: sobra de segundos não muda a proporção e só
      // geraria peso fracionário para a rotação ter que normalizar depois.
      if (restante >= 1) pesos.set(c.id, Math.round(restante));
    }
    return pesos;
  }

  /**
   * O motorista consegue aceitar mais esta campanha?
   *
   * Checado no aceite e não só na listagem: a tela pode estar velha, e entre
   * ver a oportunidade e tocar em aceitar ele pode ter aceitado outra.
   */
  static async canAccept(
    motoristaId: string,
    dailyMinutes: number
  ): Promise<{ ok: boolean; capacity: DriverCapacity }> {
    const capacity = await this.driverCapacity(motoristaId);
    return { ok: dailyMinutes <= capacity.availableMinutes, capacity };
  }

  /** "2h30" — para a tela do motorista, que pensa em horas, não em 150. */
  static formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, '0')}`;
  }
}
