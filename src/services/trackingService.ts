import crypto from 'crypto';
import prisma from '../lib/prisma';
import config from '../config/config';
import logger from '../config/logger';
import { NotFoundError } from '../utils/errors';
import { TelemetryService } from './telemetryService';
import { creditService } from './payment/credit.service';

interface ScanContext {
  campaignId: string;
  motoristaId?: string;
  deviceId?: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

export class TrackingService {
  /**
   * Identidade anônima do visitante: hash de (ip + user-agent + dia + campanha).
   *
   * Nunca guardamos isso de forma reversível para identificar pessoa — serve só
   * para separar "10 pessoas escanearam" de "1 pessoa escaneou 10 vezes".
   * O dia entra no hash de propósito: a mesma pessoa em dias diferentes conta
   * como alcance novo, que é como mídia OOH mede audiência.
   */
  private static visitorHash(campaignId: string, ip?: string, userAgent?: string): string {
    const day = new Date().toISOString().slice(0, 10);
    return crypto
      .createHash('sha256')
      .update(`${campaignId}|${ip || 'no-ip'}|${userAgent || 'no-ua'}|${day}`)
      .digest('hex');
  }

  /**
   * Registra a leitura de um QR e devolve para onde redirecionar.
   * Esta é a métrica de DIVULGAÇÃO: conta gente que leu, mesmo sem cadastro.
   */
  static async recordScan(ctx: ScanContext) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: ctx.campaignId, deleted_at: null },
      select: {
        id: true,
        company_id: true,
        title: true,
        destination_url: true,
        status: true,
      },
    });

    if (!campaign) throw new NotFoundError('Campanha não encontrada');

    // O motorista do parâmetro precisa existir; se não existir seguimos sem
    // atribuição em vez de perder o scan — o alcance aconteceu de qualquer forma.
    let motoristaId: string | null = null;
    if (ctx.motoristaId) {
      const m = await prisma.motoristProfile.findUnique({
        where: { id: ctx.motoristaId },
        select: { id: true },
      });
      motoristaId = m?.id ?? null;
    }

    // Sem motorista identificado não há como gravar ScanEvent (motorista_id é
    // obrigatório no modelo). Nesse caso só redirecionamos.
    if (!motoristaId) {
      logger.warn(`Scan sem motorista atribuível na campanha ${campaign.id}`);
      return { campaign, scanEventId: null, redirectTo: this.destinationFor(campaign, null) };
    }

    // Atribui o scan à jornada aberta do tablet que exibiu o anúncio. É isso
    // que permite dizer "nesta jornada você gerou N leads".
    const sessao = ctx.deviceId
      ? await prisma.tabletSession.findFirst({
          where: { device_id: ctx.deviceId, ended_at: null },
          orderBy: { started_at: 'desc' },
          select: { id: true },
        })
      : null;

    const visitor_hash = this.visitorHash(ctx.campaignId, ctx.ip, ctx.userAgent);

    const previous = await prisma.scanEvent.findFirst({
      where: { campaign_id: campaign.id, visitor_hash },
      select: { id: true },
    });
    const is_unique = !previous;

    const scan = await prisma.scanEvent.create({
      data: {
        company_id: campaign.company_id,
        campaign_id: campaign.id,
        motorista_id: motoristaId,
        device_id: ctx.deviceId || null,
        session_id: sessao?.id || null,
        visitor_hash,
        is_unique,
        user_device: ctx.userAgent?.slice(0, 500) || null,
        ip_address: ctx.ip?.slice(0, 50) || null,
        referrer: ctx.referrer?.slice(0, 500) || null,
      },
      select: { id: true },
    });

    // Contadores denormalizados só para leitura rápida — a fonte da verdade
    // continua sendo a tabela ScanEvent.
    if (is_unique) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { unique_scans: { increment: 1 } },
      });
    }
    await prisma.campaignMotorista
      .update({
        where: {
          campaign_id_motorista_id: { campaign_id: campaign.id, motorista_id: motoristaId },
        },
        data: { scans_count: { increment: 1 } },
      })
      .catch(() => {
        /* motorista pode ter saído da campanha; o ScanEvent já ficou registrado */
      });

    logger.info(`Scan ${is_unique ? 'único' : 'repetido'} campanha=${campaign.id}`);

    return {
      campaign,
      scanEventId: scan.id,
      redirectTo: this.destinationFor(campaign, scan.id),
    };
  }

  /**
   * Sem destino próprio do anunciante, o passageiro cai na landing de captura
   * da FastLead — é o que transforma um scan em lead com contato.
   */
  private static destinationFor(
    campaign: { id: string; destination_url: string | null },
    scanEventId: string | null
  ): string {
    if (campaign.destination_url) return campaign.destination_url;
    const q = scanEventId ? `?s=${scanEventId}` : '';
    return `${config.appBaseUrl}/lp/${campaign.id}${q}`;
  }

  /** Impressão: o anúncio apareceu na tela do tablet. */
  static async recordImpressions(
    deviceId: string,
    motoristaId: string,
    items: Array<{ campaignId: string; durationMs?: number }>,
    sessionId?: string | null
  ) {
    if (!items.length) return { recorded: 0 };

    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: items.map((i) => i.campaignId) }, deleted_at: null },
      select: { id: true, company_id: true, driver_rate_hour: true },
    });
    const byId = new Map(campaigns.map((c) => [c.id, c]));

    const rows = items
      .filter((i) => byId.has(i.campaignId))
      .map((i) => ({
        company_id: byId.get(i.campaignId)!.company_id,
        campaign_id: i.campaignId,
        motorista_id: motoristaId,
        device_id: deviceId,
        session_id: sessionId || null,
        duration_ms: Math.max(0, Math.round(i.durationMs || 0)),
      }));

    if (!rows.length) return { recorded: 0 };

    await prisma.impressionEvent.createMany({ data: rows });

    // Agrupa por campanha para não disparar um UPDATE por impressão.
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.campaign_id] = (acc[r.campaign_id] || 0) + 1;
      return acc;
    }, {});
    await Promise.all(
      Object.entries(counts).map(([campaign_id, n]) =>
        prisma.campaign.update({
          where: { id: campaign_id },
          data: { total_impressions: { increment: n } },
        })
      )
    );

    // O motorista é pago por tempo de tela, então é aqui que o dinheiro se
    // move — não mais na conversão do lead. Soma a duração por campanha para
    // acumular de uma vez em vez de uma transação por inserção de 10 segundos.
    const msPorCampanha = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.campaign_id] = (acc[r.campaign_id] || 0) + r.duration_ms;
      return acc;
    }, {});

    for (const [campaign_id, duration_ms] of Object.entries(msPorCampanha)) {
      const campanha = byId.get(campaign_id)!;
      await creditService.creditScreenTime({
        motorista_id: motoristaId,
        campaign_id,
        company_id: campanha.company_id,
        duration_ms,
        rate_hour: campanha.driver_rate_hour,
      });
    }

    return { recorded: rows.length };
  }

  /** Converte um scan em lead quando o passageiro deixa contato. */
  static async captureLead(input: {
    scanEventId: string;
    name?: string;
    email?: string;
    phone?: string;
  }) {
    const scan = await prisma.scanEvent.findUnique({
      where: { id: input.scanEventId },
      select: {
        id: true,
        company_id: true,
        campaign_id: true,
        motorista_id: true,
        session_id: true,
        scanned_at: true,
        ip_address: true,
        user_device: true,
        lead: { select: { id: true } },
      },
    });

    if (!scan) throw new NotFoundError('Scan não encontrado');
    if (scan.lead) return { leadId: scan.lead.id, alreadyExisted: true };

    /**
     * Jornada sob suspeita não faz o lead desaparecer.
     *
     * O passageiro do outro lado pode ser real, e o contato dele é da empresa
     * que pagou pelo anúncio — sumir com isso puniria o anunciante por um
     * problema do motorista. O lead nasce INVALID: a empresa enxerga, mas
     * `debitLeadConversion` se recusa a transformá-lo em comissão.
     *
     * Marcar em vez de descartar também deixa desfazer. Se o veredito estiver
     * errado, basta voltar o status — o dado ainda está lá.
     */
    const { suspect, reason } = await TelemetryService.sessionIsSuspect(scan.session_id);

    const lead = await prisma.lead.create({
      data: {
        company_id: scan.company_id,
        campaign_id: scan.campaign_id,
        motorista_id: scan.motorista_id,
        scan_event_id: scan.id,
        qr_scan_time: scan.scanned_at,
        status: suspect ? 'INVALID' : 'PENDING',
        contact_name: input.name?.slice(0, 255) || null,
        contact_email: input.email?.slice(0, 255) || null,
        contact_phone: input.phone?.slice(0, 20) || null,
        ip_address: scan.ip_address,
        user_device: scan.user_device,
      },
      select: { id: true },
    });

    if (suspect) {
      logger.warn(
        `Lead ${lead.id} nasceu INVALID — jornada ${scan.session_id} sob suspeita (${reason})`
      );
      // Sem incrementar contador: taxa de conversão e "leads gerados" são o que
      // a empresa e o motorista leem para decidir. Somar lead reprovado ali
      // inflaria justamente o número que a suspeita diz não valer.
      return { leadId: lead.id, alreadyExisted: false, suspect: true };
    }

    await prisma.campaign.update({
      where: { id: scan.campaign_id },
      data: { total_leads: { increment: 1 } },
    });
    await prisma.campaignMotorista
      .update({
        where: {
          campaign_id_motorista_id: {
            campaign_id: scan.campaign_id,
            motorista_id: scan.motorista_id,
          },
        },
        data: { leads_generated: { increment: 1 } },
      })
      .catch(() => {});

    return { leadId: lead.id, alreadyExisted: false, suspect: false };
  }
}
