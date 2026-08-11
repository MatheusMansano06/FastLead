import { prisma } from '../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreditTransactionType } from '@prisma/client';

/**
 * Serviço de crédito da empresa
 *
 * Controla:
 * - Saldo pré-pago (credit_balance em Company)
 * - Transações (CompanyCreditTx)
 * - Validação antes de criar anúncio
 * - Débito automático quando lead converte
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

    // Atualizar saldo
    const updated = await prisma.company.update({
      where: { id: company_id },
      data: {
        credit_balance: {
          increment: decimal_amount,
        },
      },
      select: { credit_balance: true },
    });

    // Registrar transação
    const tx = await prisma.companyCreditTx.create({
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

    return tx;
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
   * Debita a comissão do motorista (30%) da empresa quando um lead converte.
   *
   * Fluxo:
   * 1. Empresa pagou R$ X por lead
   * 2. Motorista ganha 30% = 0.3X
   * 3. Descontamos 0.3X do saldo da empresa
   * 4. Criamos Payment para transferir ao motorista
   *
   * Retorna: true se conseguiu débitar, false se saldo insuficiente
   */
  async debitLeadConversion(
    company_id: string,
    lead_id: string,
    total_amount: number, // Valor total do lead (negociado empresa-motorista)
  ): Promise<boolean> {
    // 30% vai pro motorista
    const motorista_commission = new Decimal(total_amount).mul(0.3);

    // Validar saldo
    const balance = await this.getBalance(company_id);
    if (balance < motorista_commission.toNumber()) {
      console.log(
        `[CREDIT] Saldo insuficiente para pagar lead: ${company_id} tem R$ ${balance} mas precisa de R$ ${motorista_commission}`,
      );
      return false;
    }

    // Atualizar saldo
    const updated = await prisma.company.update({
      where: { id: company_id },
      data: {
        credit_balance: {
          decrement: motorista_commission,
        },
      },
      select: { credit_balance: true },
    });

    // Registrar transação
    await prisma.companyCreditTx.create({
      data: {
        company_id,
        lead_id,
        type: CreditTransactionType.LEAD_PAYOUT,
        amount: motorista_commission,
        balance_after: updated.credit_balance,
        description: `Comissão de lead convertido (30% para motorista)`,
      },
    });

    return true;
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
