import crypto from 'crypto';
import { TabletAcquisition, TabletRequestStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import logger from '../config/logger';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

/** Horas que o motorista tem para retirar o tablet depois de aprovado. */
const WITHDRAWAL_TTL_HOURS = 48;

/**
 * Versão do texto de comodato que está no ar. Sobe quando o contrato mudar —
 * os aceites antigos continuam apontando para o que a pessoa de fato leu.
 */
export const CONTRACT_VERSION = 'comodato-v1';

/**
 * Teto do data-URL de cada foto, em caracteres (~300 KB de imagem).
 *
 * Não existe storage de arquivo no projeto: as fotos moram no Postgres como
 * data-URL, mesmo caminho de `User.avatar_url`. Três fotos por motorista no
 * teto dão ~900 KB por pessoa, que para o piloto de 100 tablets fecha em
 * ~90 MB. Passou disso, é sinal de que chegou a hora de um S3 de verdade.
 */
const MAX_PHOTO_CHARS = 400_000;

/**
 * Teto do avatar, bem menor que o das fotos de documento.
 *
 * A foto de perfil aparece em cabeçalho e listagem, então viaja muito mais
 * vezes que o documento — a selfie de 1280px serviria, mas pesaria em toda
 * tela que mostra o motorista. O cliente manda um recorte quadrado de 256px.
 */
const MAX_AVATAR_CHARS = 60_000;

/** Sem O/0/I/1: o código é lido em voz alta e digitado na hora da entrega. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Campos seguros de devolver em listagem — sem foto nenhuma. */
const SAFE_FIELDS = {
  id: true,
  acquisition: true,
  status: true,
  attempt: true,
  rejection_reason: true,
  reviewed_at: true,
  withdrawal_code: true,
  withdrawal_expires_at: true,
  contract_accepted_at: true,
  contract_signature: true,
  contract_version: true,
  delivered_at: true,
  device_identifier: true,
  created_at: true,
} as const;

export interface CreateRequestInput {
  acquisition: TabletAcquisition;
  selfiePhoto: string;
  docFrontPhoto: string;
  docBackPhoto: string;
  /** Nome digitado no aceite. Obrigatório só no comodato. */
  contractSignature?: string;
  contractIp?: string;
  /**
   * Recorte quadrado da selfie, para virar a foto de perfil do motorista.
   * Opcional: se não vier, o perfil segue sem foto e ele põe uma depois.
   */
  avatarPhoto?: string;
}

export class TabletRequestService {
  private static newWithdrawalCode(): string {
    const body = Array.from(
      { length: 6 },
      () => CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)]
    ).join('');
    return `FL-${body}`;
  }

  private static async driverProfile(userId: string) {
    const profile = await prisma.motoristProfile.findUnique({
      where: { user_id: userId },
      select: { id: true, company_id: true },
    });
    if (!profile) throw new NotFoundError('Perfil de motorista não encontrado');
    return profile;
  }

  /** Recusa qualquer coisa que não seja uma imagem embutida dentro do teto. */
  private static validatePhoto(value: unknown, field: string, maxChars = MAX_PHOTO_CHARS): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new ValidationError(`Envie a foto: ${field}`);
    }
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(value)) {
      throw new ValidationError(`Formato de imagem inválido em ${field}`);
    }
    if (value.length > maxChars) {
      throw new ValidationError(
        `A foto de ${field} ficou grande demais. Tire de novo com menos zoom.`
      );
    }
    return value;
  }

  /**
   * Marca como EXPIRED o que foi aprovado e não retirado no prazo.
   *
   * Feito na leitura em vez de por cron: sem rotina agendada no projeto, um
   * pedido vencido continuaria aparecendo como "pode buscar" na tela do
   * motorista e na fila do sócio. Só vale para comodato — quem usa aparelho
   * próprio não tem nada a retirar, então a aprovação dele não vence.
   */
  private static async expireStale(motoristaId?: string) {
    const { count } = await prisma.tabletRequest.updateMany({
      where: {
        ...(motoristaId ? { motorista_id: motoristaId } : {}),
        status: TabletRequestStatus.APPROVED,
        acquisition: TabletAcquisition.FASTLEAD_LOAN,
        withdrawal_expires_at: { lt: new Date() },
      },
      data: { status: TabletRequestStatus.EXPIRED, withdrawal_code: null },
    });
    if (count > 0) logger.info(`[tablet-request] ${count} aprovação(ões) expiraram sem retirada`);
  }

  /**
   * O pedido que vale para o motorista é sempre o mais recente. Os anteriores
   * ficam como histórico de quem tentou o quê e quando.
   */
  private static async latestFor(motoristaId: string) {
    return prisma.tabletRequest.findFirst({
      where: { motorista_id: motoristaId },
      orderBy: { created_at: 'desc' },
      select: SAFE_FIELDS,
    });
  }

  /** GET /driver/tablet-request — em que pé está o meu pedido. */
  static async myRequest(userId: string) {
    const profile = await this.driverProfile(userId);
    await this.expireStale(profile.id);

    const request = await this.latestFor(profile.id);
    return {
      request,
      /** Verificado libera o pareamento; é o que a tela usa para destravar. */
      verified: this.isVerified(request?.status),
      contractVersion: CONTRACT_VERSION,
    };
  }

  private static isVerified(status?: TabletRequestStatus | null): boolean {
    return status === TabletRequestStatus.APPROVED || status === TabletRequestStatus.DELIVERED;
  }

  /**
   * Portão de entrada do pareamento: só quem passou pela verificação de
   * identidade coloca tablet para rodar, inclusive quem usa aparelho próprio.
   */
  static async assertVerified(motoristaId: string) {
    await this.expireStale(motoristaId);
    const request = await prisma.tabletRequest.findFirst({
      where: { motorista_id: motoristaId },
      orderBy: { created_at: 'desc' },
      select: { status: true },
    });
    if (!this.isVerified(request?.status)) {
      throw new ValidationError(
        'Envie seus documentos e aguarde a liberação antes de parear o tablet.'
      );
    }
  }

  /** POST /driver/tablet-request — motorista manda fotos e (se for o caso) aceita o comodato. */
  static async create(userId: string, input: CreateRequestInput) {
    const profile = await this.driverProfile(userId);
    await this.expireStale(profile.id);

    if (!Object.values(TabletAcquisition).includes(input.acquisition)) {
      throw new ValidationError('Escolha se o tablet é seu ou da FastLead');
    }
    const isLoan = input.acquisition === TabletAcquisition.FASTLEAD_LOAN;

    const previous = await prisma.tabletRequest.findFirst({
      where: { motorista_id: profile.id },
      orderBy: { created_at: 'desc' },
      select: { status: true, acquisition: true, attempt: true },
    });

    if (previous) {
      if (previous.status === TabletRequestStatus.PENDING) {
        throw new ConflictError('Você já tem um pedido em análise.');
      }
      // Quem já foi aprovado com aparelho próprio ainda pode querer um tablet
      // nosso depois. O contrário não: com tablet da FastLead em mãos, novo
      // pedido é assunto de suporte, não de autoatendimento.
      const jaResolvido =
        previous.status === TabletRequestStatus.APPROVED ||
        previous.status === TabletRequestStatus.DELIVERED;
      const querUpgrade = previous.acquisition === TabletAcquisition.OWN_DEVICE && isLoan;
      if (jaResolvido && !querUpgrade) {
        throw new ConflictError('Seu acesso já está liberado. Fale com o suporte para trocar.');
      }
    }

    const selfie = this.validatePhoto(input.selfiePhoto, 'selfie');
    const docFront = this.validatePhoto(input.docFrontPhoto, 'frente do documento');
    const docBack = this.validatePhoto(input.docBackPhoto, 'verso do documento');

    // Sem comodato não há assinatura a colher; com comodato, ela é o registro
    // de que o motorista leu o contrato antes de sair de casa.
    let signature: string | null = null;
    if (isLoan) {
      signature = String(input.contractSignature || '').trim();
      if (signature.length < 5) {
        throw new ValidationError('Digite seu nome completo para aceitar o contrato de comodato');
      }
      signature = signature.slice(0, 255);
    }

    // A selfie da verificação também vira a foto de perfil: o motorista acabou
    // de tirar uma foto do próprio rosto, e pedir de novo mais tarde só para
    // preencher o avatar é trabalho repetido que quase ninguém faz.
    const avatar = input.avatarPhoto
      ? this.validatePhoto(input.avatarPhoto, 'foto de perfil', MAX_AVATAR_CHARS)
      : null;

    // Transação porque são duas escritas em tabelas diferentes: sem ela, um
    // erro no meio deixaria o perfil com a cara nova e nenhum pedido na fila.
    const created = await prisma.$transaction(async (tx) => {
      const request = await tx.tabletRequest.create({
        data: {
          company_id: profile.company_id,
          motorista_id: profile.id,
          acquisition: input.acquisition,
          status: TabletRequestStatus.PENDING,
          attempt: (previous?.attempt ?? 0) + 1,
          selfie_photo: selfie,
          doc_front_photo: docFront,
          doc_back_photo: docBack,
          ...(isLoan
            ? {
                contract_accepted_at: new Date(),
                contract_signature: signature,
                contract_ip: input.contractIp?.slice(0, 50) || null,
                contract_version: CONTRACT_VERSION,
              }
            : {}),
        },
        select: SAFE_FIELDS,
      });

      if (avatar) {
        await tx.user.update({ where: { id: userId }, data: { avatar_url: avatar } });
      }

      return request;
    });

    logger.info(
      `[tablet-request] ${created.id} criado por motorista ${profile.id} (${input.acquisition}, tentativa ${created.attempt})`
    );
    return created;
  }

  // ==========================================================================
  // ADMIN
  // ==========================================================================

  /** GET /admin/tablet-requests — a fila. Nunca devolve foto. */
  static async listForAdmin(opts: { status?: TabletRequestStatus; page: number; limit: number }) {
    await this.expireStale();

    const where = opts.status ? { status: opts.status } : {};
    const [total, items] = await Promise.all([
      prisma.tabletRequest.count({ where }),
      prisma.tabletRequest.findMany({
        where,
        orderBy: { created_at: 'asc' }, // fila: quem pediu primeiro aparece primeiro
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        select: {
          ...SAFE_FIELDS,
          motorista: {
            select: {
              id: true,
              cpf: true,
              phone: true,
              city: true,
              state: true,
              license_plate: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
    ]);

    const counts = await prisma.tabletRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return {
      items,
      total,
      page: opts.page,
      limit: opts.limit,
      countsByStatus: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    };
  }

  /**
   * GET /admin/tablet-requests/:id — o único lugar que devolve as fotos.
   *
   * Foto de documento é dado pessoal sensível: fica fora da listagem de
   * propósito, para não trafegar RG de 50 motoristas a cada abertura de tela.
   */
  static async detailForAdmin(id: string) {
    await this.expireStale();

    const request = await prisma.tabletRequest.findUnique({
      where: { id },
      select: {
        ...SAFE_FIELDS,
        selfie_photo: true,
        doc_front_photo: true,
        doc_back_photo: true,
        contract_ip: true,
        reviewed_by: { select: { name: true } },
        motorista: {
          select: {
            id: true,
            cpf: true,
            phone: true,
            city: true,
            state: true,
            license_plate: true,
            vehicle_info: true,
            status: true,
            created_at: true,
            user: { select: { name: true, email: true, avatar_url: true } },
          },
        },
      },
    });
    if (!request) throw new NotFoundError('Solicitação não encontrada');
    return request;
  }

  private static async pendingOrFail(id: string) {
    const request = await prisma.tabletRequest.findUnique({
      where: { id },
      select: { id: true, status: true, acquisition: true },
    });
    if (!request) throw new NotFoundError('Solicitação não encontrada');
    if (request.status !== TabletRequestStatus.PENDING) {
      throw new ConflictError('Esta solicitação já foi analisada.');
    }
    return request;
  }

  /**
   * POST /admin/tablet-requests/:id/approve
   *
   * O código de retirada nasce aqui, não no envio: antes de alguém aprovar não
   * existe entrega a confirmar. Quem usa aparelho próprio sai daqui liberado
   * para parear, sem código nenhum.
   */
  static async approve(id: string, adminUserId: string) {
    const request = await this.pendingOrFail(id);
    const isLoan = request.acquisition === TabletAcquisition.FASTLEAD_LOAN;

    let code: string | null = null;
    let expiresAt: Date | null = null;

    if (isLoan) {
      expiresAt = new Date(Date.now() + WITHDRAWAL_TTL_HOURS * 3600_000);
      // Colisão é improvável, mas o código é curto de propósito para ser
      // digitado na entrega — então vale conferir antes de gravar.
      for (let attempt = 0; attempt < 5 && !code; attempt++) {
        const candidate = this.newWithdrawalCode();
        const taken = await prisma.tabletRequest.findUnique({
          where: { withdrawal_code: candidate },
          select: { id: true },
        });
        if (!taken) code = candidate;
      }
      if (!code) throw new ValidationError('Não foi possível gerar o código. Tente de novo.');
    }

    const updated = await prisma.tabletRequest.update({
      where: { id },
      data: {
        status: TabletRequestStatus.APPROVED,
        reviewed_by_id: adminUserId,
        reviewed_at: new Date(),
        rejection_reason: null,
        withdrawal_code: code,
        withdrawal_expires_at: expiresAt,
      },
      select: SAFE_FIELDS,
    });

    logger.info(
      `[tablet-request] ${id} aprovado por ${adminUserId}${code ? ` — código ${code}` : ''}`
    );
    return updated;
  }

  /** POST /admin/tablet-requests/:id/reject — recusa não é fim de linha: ele pode tentar de novo. */
  static async reject(id: string, adminUserId: string, reason: string) {
    await this.pendingOrFail(id);

    const motivo = String(reason || '').trim();
    if (motivo.length < 3) {
      throw new ValidationError('Escreva o motivo da recusa — o motorista vai ler isso.');
    }

    const updated = await prisma.tabletRequest.update({
      where: { id },
      data: {
        status: TabletRequestStatus.REJECTED,
        reviewed_by_id: adminUserId,
        reviewed_at: new Date(),
        rejection_reason: motivo.slice(0, 500),
        withdrawal_code: null,
        withdrawal_expires_at: null,
      },
      select: SAFE_FIELDS,
    });

    logger.info(`[tablet-request] ${id} recusado por ${adminUserId}`);
    return updated;
  }

  /**
   * POST /admin/tablet-requests/:id/deliver — o sócio confirma a entrega em mãos.
   *
   * O código digitado tem que bater com o que está na tela do motorista: é o
   * que amarra "esta pessoa na minha frente" ao pedido que foi aprovado.
   */
  static async deliver(
    id: string,
    adminUserId: string,
    input: { code: string; deviceIdentifier?: string; deviceId?: string }
  ) {
    await this.expireStale();

    const request = await prisma.tabletRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        acquisition: true,
        withdrawal_code: true,
        motorista_id: true,
      },
    });
    if (!request) throw new NotFoundError('Solicitação não encontrada');

    if (request.acquisition !== TabletAcquisition.FASTLEAD_LOAN) {
      throw new ValidationError(
        'Este motorista usa aparelho próprio — não há entrega a registrar.'
      );
    }
    if (request.status === TabletRequestStatus.EXPIRED) {
      throw new ConflictError('O prazo de retirada venceu. Peça para ele solicitar de novo.');
    }
    if (request.status !== TabletRequestStatus.APPROVED) {
      throw new ConflictError('Só é possível entregar um pedido aprovado.');
    }

    const digitado = String(input.code || '')
      .trim()
      .toUpperCase();
    if (!digitado || digitado !== request.withdrawal_code) {
      throw new ValidationError('Código de retirada não confere.');
    }

    // O aparelho pode ainda nem ter sido pareado na hora da entrega — o
    // vínculo com TabletDevice é opcional, mas o número de série não é:
    // sem identificar o objeto, o comodato não tem o que cobrar de volta.
    const identifier = String(input.deviceIdentifier || '').trim();
    if (!identifier) {
      throw new ValidationError('Anote o número de série ou patrimônio do tablet entregue.');
    }

    if (input.deviceId) {
      const device = await prisma.tabletDevice.findUnique({
        where: { id: input.deviceId },
        select: { id: true, motorista_id: true },
      });
      if (!device) throw new NotFoundError('Tablet não encontrado');
      if (device.motorista_id && device.motorista_id !== request.motorista_id) {
        throw new ConflictError('Esse tablet já está vinculado a outro motorista.');
      }
    }

    const updated = await prisma.tabletRequest.update({
      where: { id },
      data: {
        status: TabletRequestStatus.DELIVERED,
        delivered_at: new Date(),
        delivered_by_id: adminUserId,
        device_identifier: identifier.slice(0, 120),
        device_id: input.deviceId || null,
      },
      select: SAFE_FIELDS,
    });

    logger.info(`[tablet-request] ${id} entregue por ${adminUserId} — aparelho ${identifier}`);
    return updated;
  }
}

export default TabletRequestService;
