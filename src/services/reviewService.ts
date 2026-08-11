import prisma from '../lib/prisma';
import { ValidationError } from '../utils/errors';
import type { CampaignRating } from '@prisma/client';

export class ReviewService {
  static async getReviews(campaignId: string) {
    const reviews = await prisma.campaignReview.findMany({
      where: { campaign_id: campaignId },
      include: {
        motorista: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return reviews.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      motoristaName: r.motorista.user.name,
      motoristaId: r.motorista.id,
      createdAt: r.created_at,
    }));
  }

  static async getMotoristaReview(campaignId: string, motoristaId: string) {
    return prisma.campaignReview.findUnique({
      where: {
        campaign_id_motorista_id: { campaign_id: campaignId, motorista_id: motoristaId },
      },
    });
  }

  static async createOrUpdateReview(
    campaignId: string,
    motoristaId: string,
    rating: CampaignRating,
    comment?: string
  ) {
    // Verifica se o motorista já participou da campanha
    const lead = await prisma.lead.findFirst({
      where: { motorista_id: motoristaId, campaign_id: campaignId, status: 'CONVERTED' },
    });

    if (!lead) {
      throw new ValidationError('Você só pode avaliar campanhas em que participou');
    }

    return prisma.campaignReview.upsert({
      where: {
        campaign_id_motorista_id: { campaign_id: campaignId, motorista_id: motoristaId },
      },
      create: {
        campaign_id: campaignId,
        motorista_id: motoristaId,
        rating,
        comment,
      },
      update: {
        rating,
        comment,
        updated_at: new Date(),
      },
    });
  }

  static async getCampaignStats(campaignId: string) {
    const reviews = await prisma.campaignReview.findMany({
      where: { campaign_id: campaignId },
    });

    if (reviews.length === 0) {
      return { avgRating: 0, totalReviews: 0, distribution: {} };
    }

    const ratingMap: Record<string, number> = {
      ONE: 0,
      TWO: 0,
      THREE: 0,
      FOUR: 0,
      FIVE: 0,
    };

    let totalScore = 0;
    reviews.forEach((r: any) => {
      ratingMap[r.rating]++;
      const scoreMap: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
      totalScore += scoreMap[r.rating];
    });

    return {
      avgRating: +(totalScore / reviews.length).toFixed(2),
      totalReviews: reviews.length,
      distribution: ratingMap,
    };
  }
}
