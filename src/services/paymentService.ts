import prisma from '../lib/prisma';

export interface MotoristaEarnings {
  totalEarnings: number;
  currentMonth: number;
  last7Days: number;
  today: number;
  leadsCount: number;
  conversionsCount: number;
  averagePerLead: number;
}

export class PaymentService {
  /**
   * Calculate motorista earnings
   */
  static async calculateMotoristaEarnings(motoristaId: string): Promise<MotoristaEarnings> {
    const motorista = await prisma.motoristProfile.findUnique({
      where: { id: motoristaId },
    });

    if (!motorista) {
      throw new Error('Motorista not found');
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Calculate earnings from leads
    const allLeads = await prisma.lead.findMany({
      where: {
        motorista_id: motoristaId,
        status: 'CONVERTED',
      },
      include: {
        campaign: {
          select: {
            price_per_lead: true,
          },
        },
      },
    });

    const currentMonthLeads = allLeads.filter(
      (l: any) => l.converted_at && new Date(l.converted_at) >= monthStart
    );

    const last7DaysLeads = allLeads.filter(
      (l: any) => l.converted_at && new Date(l.converted_at) >= weekStart
    );

    const todayLeads = allLeads.filter(
      (l: any) => l.converted_at && new Date(l.converted_at) >= todayStart
    );

    const calculateEarnings = (leads: any[]) => {
      return leads.reduce((total, lead: any) => {
        const pricePerLead = lead.campaign.price_per_lead?.toNumber() || 0;
        // 70% to motorista, 30% to platform
        return total + pricePerLead * 0.7;
      }, 0);
    };

    return {
      totalEarnings: calculateEarnings(allLeads),
      currentMonth: calculateEarnings(currentMonthLeads),
      last7Days: calculateEarnings(last7DaysLeads),
      today: calculateEarnings(todayLeads),
      leadsCount: allLeads.length,
      conversionsCount: allLeads.filter((l: any) => l.status === 'CONVERTED').length,
      averagePerLead: allLeads.length > 0 ? calculateEarnings(allLeads) / allLeads.length : 0,
    };
  }
}
