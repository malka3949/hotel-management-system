import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class NlReportsService {
  constructor(
    private ai: AiService,
    private prisma: PrismaService,
  ) {}

  async query(userQuery: string, user: JwtPayload): Promise<string> {
    if (!this.ai.isAvailable()) {
      throw new ServiceUnavailableException('AI_SERVICE_UNAVAILABLE');
    }

    const branchId = user.branchId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [reservationStats, revenueData, occupancyData] = await Promise.all([
      this.prisma.reservation.groupBy({
        by: ['status'],
        where: {
          ...(branchId ? { branchId } : {}),
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          ...(branchId ? { reservation: { branchId } } : {}),
          status: 'paid',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.room.groupBy({
        by: ['status'],
        where: branchId ? { branchId } : {},
        _count: { id: true },
      }),
    ]);

    const data = {
      period: `30 ימים אחרונים (עד ${now.toLocaleDateString('he-IL')})`,
      reservations: Object.fromEntries(reservationStats.map((r) => [r.status, r._count.id])),
      revenue: {
        total: Number(revenueData._sum.total ?? 0),
        invoiceCount: revenueData._count.id,
      },
      rooms: Object.fromEntries(occupancyData.map((r) => [r.status, r._count.id])),
    };

    const prompt = `אתה אנליסט נתונים של מלון. ענה על השאלה הבאה בעברית בצורה ברורה ותמציתית.

שאלה: ${userQuery}

נתוני המלון:
${JSON.stringify(data, null, 2)}

ענה ישירות על השאלה. אם הנתונים אינם מספיקים לענות, אמור זאת בכנות.`;

    const client = this.ai.getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }
}
