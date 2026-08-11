import { prisma } from '../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreditTransactionType, DriverEarningStatus } from '@prisma/client';

/**
 * Comissão do motorista por lead convertido. Decisão de negócio: 30% flat.
 *
 * Alterar aqui só afeta ganhos futuros — cada `DriverEarning` grava a taxa
 * vigente no momento em `commission_rate`, e o passado nunca é recalculado.
 */
export const COMMISSION_RATE = 0.3;

/**
 * Serviço de crédito da empresa e da carteira do motorista.
 *
 * Controla:
 * - Saldo pré-pago da empresa (credit_balance em Company)
 * - Extrato da empresa (CompanyCreditTx)
 * - Carteira e extrato do motorista (DriverEarning)
 * - Validação antes de criar anúncio
 * - Débito da empresa + crédito do motorista quando o lead converte
 */
export class CreditService {
  /**
   * Retorna o saldo atual da empresa.
   */
  async getBalance(company_id: string): Promise<number> {
    const company = await prisma.company.findUnique({
      where: { id: company_id },
      select: { credit_balance: true },
    });

    if (!company) throw new Error('Empresa não encontrada');

    return parseFloat(company.credit_balance.toString());
  }

  /**
   * Adiciona crédito após pagamento aprovado no Mercado Pago.
   */
  async addCredit(
    company_id: string,
    amount: number,
    mercadopago_id: string,
    description?: string,
  ): Promise<any> {
    const decimal_amount = new Decimal(amount);

    // Idempotência por mercadopago_id. O mesmo pagamento chega por dois
    // caminhos — o webhook do Mercado Pago e o /verify que o cliente dispara
    // ao voltar do checkout — e sem esta trava o crédito entrava duas vezes.
    // A unicidade é garantida no banco; aqui só evitamos o trabalho e o erro.
    return prisma.$transaction(async (tx) => {
      const existente = await tx.companyCreditTx.findUnique({
        where: { mercadopago_id },
      });

      if (existente) {
        console.log(`[CREDIT] Pagamento ${mercadopago_id} já creditado, ignorando`);
        return existente;
      }

      const updated = await tx.company.update({
        where: { id: company_id },
        data: { credit_balance: { increment: decimal_amount } },
        select: { credit_balance: true },
      });

      const criada = await tx.companyCreditTx.create({
        data: {
          company_id,
          type: CreditTransactionType.DEPOSIT,
          amount: decimal_amount,
          mercadopago_id,
          balance_after: updated.credit_balance,
          description:
            description ||
            `Depósito via Mercado Pago — ${new Date().toLocaleDateString('pt-BR')}`,
        },
      });

      console.log(`[CREDIT] +R$ ${amount} para ${company_id} (mp=${mercadopago_id})`);
      return criada;
    });
  }

  /**
   * Valida se a empresa tem saldo suficiente.
   */
  async validateBalance(company_id: string, required_amount: number): Promise<boolean> {
    const balance = await this.getBalance(company_id);
    return balance >= required_amount;
  }

  /**
   * Debita saldo da empresa quando um anúncio é criado.
   * (Variante 1: reserva o crédito antes do lead chegar)
   *
   * Retorna: true se debitou com sucesso, false se saldo insuficiente
   */
  async debitForCampaign(
    company_id: string,
    campaign_id: string,
    amount: number,
  ): Promise<boolean> {
    const decimal_amount = new Decimal(amount);

    // Validar saldo antes
    const balance = await this.getBalance(company_id);
    if (balance < amount) {
      console.log(
        `[CREDIT] Saldo insuficiente: ${company_id} tem R$ ${balance} mas precisa de R$ ${amount}`,
      );
      return false;
    }

    // Atualizar saldo
    const updated = await prisma.company.update({
      where: { id: company_id },
      data: {
        credit_balance: {
          decrement: decimal_amount,
        },
      },
      select: { credit_balance: true },
    });

    // Registrar transação
    await prisma.companyCreditTx.create({
      data: {
        company_id,
        campaign_id,
        type: CreditTransactionType.CAMPAIGN_DEBIT,
        amount: decimal_amount,
        balance_after: updated.credit_balance,
        description: `Débito por campanha criada`,
      },
    });

    return true;
  }

  /**
   * Converte um lead: debita a empresa e credita o motorista, atomicamente.
   *
   * Os dois lados têm que se mover juntos. Antes daqui o valor saía do saldo da
   * empresa e não entrava em lugar nenhum — o motorista nunca era creditado.
   *
   * A checagem de saldo vai no WHERE do próprio UPDATE, não numa leitura antes.
   * Ler-depois-escrever deixava duas conversões simultâneas furarem o saldo:
   * ambas liam R$ 100, ambas debitavam R$ 60, e a empresa terminava negativa.
   *
   * Retorna: true se debitou, false se saldo insuficiente.
   */
  async debitLeadConversion(
    company_id: string,
    lead_id: string,
    total_amount: number, // Valor total do lead (negociado empresa-motorista)
  ): Promise<boolean> {
    const comissao = new Decimal(total_amount).mul(COMMISSION_RATE);

    const lead = await prisma.lead.findUnique({
      where: { id: lead_id },
      select: { motorista_id: true, company_id: true },
    });

    if (!lead) {
      console.error(`[CREDIT] Lead ${lead_id} não existe`);
      return false;
    }
    if (lead.company_id !== company_id) {
      console.error(`[CREDIT] Lead ${lead_id} não pertence à empresa ${company_id}`);
      return false;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // O saldo suficiente é condição do UPDATE: se outra conversão passou na
        // frente e derrubou o saldo, o updateMany casa 0 linhas e desistimos.
        const debitado = await tx.company.updateMany({
          where: { id: company_id, credit_balance: { gte: comissao } },
          data: { credit_balance: { decrement: comissao } },
        });

        if (debitado.count === 0) {
          console.log(
            `[CREDIT] Saldo insuficiente para converter lead ${lead_id} (precisa de R$ ${comissao})`,
          );
          return false;
        }

        const { credit_balance } = await tx.company.findUniqueOrThrow({
          where: { id: company_id },
          select: { credit_balance: true },
        });

        await tx.companyCreditTx.create({
          data: {
            company_id,
            lead_id,
            type: CreditTransactionType.LEAD_PAYOUT,
            amount: comissao,
            balance_after: credit_balance,
            description: `Comissão de lead convertido (${COMMISSION_RATE * 100}% para motorista)`,
          },
        });

        // Contraparte: o motorista recebe. `commission_rate` fica gravada para
        // que mudar a taxa no futuro não reescreva o que já foi ganho.
        await tx.driverEarning.create({
          data: {
            motorista_id: lead.motorista_id,
            company_id,
            lead_id,
            amount: comissao,
            commission_rate: new Decimal(COMMISSION_RATE),
            description: 'Comissão por lead convertido',
          },
        });

        await tx.motoristProfile.update({
          where: { id: lead.motorista_id },
          data: { total_earnings: { increment: comissao } },
        });

        console.log(
          `[CREDIT] Lead ${lead_id}: -R$ ${comissao} da empresa ${company_id}, +R$ ${comissao} para o motorista ${lead.motorista_id}`,
        );
        return true;
      });
    } catch (error) {
      console.error(`[CREDIT] Falha ao converter lead ${lead_id}:`, error);
      return false;
    }
  }

  /**
   * Saldo do motorista: soma dos ganhos ainda não repassados.
   *
   * Não usa `MotoristProfile.total_earnings`, que é acumulado histórico e não
   * desconta o que já foi pago.
   */
  async getDriverBalance(motorista_id: string): Promise<{
    pendente: number;
    pago: number;
    total: number;
  }> {
    const [pendente, pago] = await Promise.all([
      prisma.driverEarning.aggregate({
        where: { motorista_id, status: DriverEarningStatus.PENDING },
        _sum: { amount: true },
      }),
      prisma.driverEarning.aggregate({
        where: { motorista_id, status: DriverEarningStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    const p = Number(pendente._sum.amount ?? 0);
    const g = Number(pago._sum.amount ?? 0);
    return { pendente: p, pago: g, total: p + g };
  }

  /** Extrato do motorista, mais recentes primeiro. */
  async getDriverEarnings(motorista_id: string, limit = 50, offset = 0) {
    return prisma.driverEarning.findMany({
      where: { motorista_id },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        created_at: true,
        paid_at: true,
        payout_ref: true,
        lead_id: true,
      },
    });
  }

  /**
   * Marca ganhos como repassados, depois do PIX feito à mão no painel do
   * Mercado Pago. `payout_ref` guarda o comprovante para auditoria.
   *
   * Só mexe no que está PENDING: reexecutar não paga ninguém duas vezes.
   */
  async markEarningsPaid(
    earning_ids: string[],
    payout_ref: string,
    paid_by: string,
  ): Promise<{ pagos: number; valor: number }> {
    const alvos = await prisma.driverEarning.findMany({
      where: { id: { in: earning_ids }, status: DriverEarningStatus.PENDING },
      select: { id: true, amount: true },
    });

    if (alvos.length === 0) return { pagos: 0, valor: 0 };

    await prisma.driverEarning.updateMany({
      where: { id: { in: alvos.map((a) => a.id) }, status: DriverEarningStatus.PENDING },
      data: {
        status: DriverEarningStatus.PAID,
        paid_at: new Date(),
        payout_ref,
        paid_by,
      },
    });

    const valor = alvos.reduce((s, a) => s + Number(a.amount), 0);
    console.log(`[CREDIT] ${alvos.length} ganhos marcados como pagos (R$ ${valor}) ref=${payout_ref}`);
    return { pagos: alvos.length, valor };
  }

  /**
   * Reembolsa crédito (ex: se lead foi fraudulento ou anúncio cancelado).
   */
  async refundCredit(
    company_id: string,
    amount: number,
    lead_id?: string,
    campaign_id?: string,
    reason?: string,
  ): Promise<void> {
    const decimal_amount = new Decimal(amount);

    const updated = await prisma.company.update({
      where: { id: company_id },
      data: {
        credit_balance: {
          increment: decimal_amount,
        },
      },
      select: { credit_balance: true },
    });

    await prisma.companyCreditTx.create({
      data: {
        company_id,
        lead_id,
        campaign_id,
        type: CreditTransactionType.REFUND,
        amount: decimal_amount,
        balance_after: updated.credit_balance,
        description: reason || 'Reembolso de crédito',
      },
    });
  }

  /**
   * Retorna histórico de transações da empresa (paginado).
   */
  async getHistory(
    company_id: string,
    limit = 50,
    offset = 0,
  ): Promise<any[]> {
    return prisma.companyCreditTx.findMany({
      where: { company_id },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        campaign: { select: { title: true, id: true } },
        lead: { select: { id: true, qr_scan_time: true } },
      },
    });
  }

  /**
   * Ajusta saldo manualmente (admin only).
   */
  async adjustBalance(
    company_id: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    const decimal_amount = new Decimal(amount);

    const updated = await prisma.company.update({
      where: { id: company_id },
      data: {
        credit_balance: {
          increment: decimal_amount,
        },
      },
      select: { credit_balance: true },
    });

    await prisma.companyCreditTx.create({
      data: {
        company_id,
        type: CreditTransactionType.ADJUSTMENT,
        amount: decimal_amount,
        balance_after: updated.credit_balance,
        description: `Ajuste manual: ${reason}`,
      },
    });
  }
}

export const creditService = new CreditService();
