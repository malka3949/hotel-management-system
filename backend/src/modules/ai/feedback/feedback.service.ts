import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  async submitFeedback(token: string, dto: SubmitFeedbackDto) {
    const accessToken = await this.prisma.guestAccessToken.findFirst({
      where: { tokenHash: token, expiresAt: { gt: new Date() } },
      select: {
        reservation: {
          select: { id: true, guestId: true, branchId: true, status: true },
        },
      },
    });

    if (!accessToken?.reservation) throw new NotFoundException('TOKEN_INVALID');

    const { id: reservationId, guestId, branchId } = accessToken.reservation;

    const existing = await this.prisma.guestFeedback.findUnique({
      where: { reservationId },
    });
    if (existing) return existing;

    let sentiment: string | null = null;
    let aiSummary: string | null = null;

    if (this.ai.isAvailable() && dto.comment) {
      const prompt = `נתח את הביקורת הבאה של אורח מלון בעברית.
ציון: ${dto.rating}/5
תגובה: "${dto.comment}"

ענה בפורמט JSON בלבד (ללא טקסט נוסף):
{"sentiment":"positive"|"neutral"|"negative","summary":"משפט אחד בעברית עם תמצית"}`;

      try {
        const raw = await this.ai.generateText(prompt);
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { sentiment?: string; summary?: string };
          sentiment = parsed.sentiment ?? null;
          aiSummary = parsed.summary ?? null;
        }
      } catch {
        // AI analysis optional — continue without it
      }
    } else if (dto.rating >= 4) {
      sentiment = 'positive';
    } else if (dto.rating === 3) {
      sentiment = 'neutral';
    } else {
      sentiment = 'negative';
    }

    return this.prisma.guestFeedback.create({
      data: { reservationId, guestId, branchId, rating: dto.rating, comment: dto.comment, sentiment, aiSummary },
    });
  }

  async getInsights(branchId: string | undefined) {
    const feedback = await this.prisma.guestFeedback.findMany({
      where: branchId ? { branchId } : {},
      select: { rating: true, comment: true, sentiment: true, aiSummary: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const total = feedback.length;
    if (total === 0) return { total: 0, averageRating: 0, sentimentBreakdown: {}, recent: [] };

    const avgRating = feedback.reduce((s, f) => s + f.rating, 0) / total;
    const sentimentBreakdown = feedback.reduce<Record<string, number>>((acc, f) => {
      if (f.sentiment) acc[f.sentiment] = (acc[f.sentiment] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total,
      averageRating: Math.round(avgRating * 10) / 10,
      sentimentBreakdown,
      recent: feedback.slice(0, 10),
    };
  }
}
