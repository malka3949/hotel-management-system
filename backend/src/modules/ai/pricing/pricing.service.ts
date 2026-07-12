import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class PricingService {
  constructor(
    private ai: AiService,
    private prisma: PrismaService,
  ) {}

  async getSuggestions(user: JwtPayload): Promise<string> {
    if (!this.ai.isAvailable()) {
      throw new ServiceUnavailableException('AI_SERVICE_UNAVAILABLE');
    }

    const branchId = user.branchId;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const roomTypes = await this.prisma.roomType.findMany({
      where: { branchId: branchId ?? undefined },
      select: {
        name: true,
        basePrice: true,
        maxOccupancy: true,
        rooms: {
          select: {
            id: true,
            reservations: {
              where: {
                status: { in: ['confirmed', 'checked_in'] },
                checkInDate: { lt: thirtyDaysLater },
                checkOutDate: { gt: now },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    const occupancyData = roomTypes.map((rt) => {
      const totalRooms = rt.rooms.length;
      const bookedRooms = rt.rooms.filter((r) => r.reservations.length > 0).length;
      const occupancyPct = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0;
      return {
        type: rt.name,
        basePrice: Number(rt.basePrice),
        totalRooms,
        bookedRooms,
        occupancyPct,
        maxOccupancy: rt.maxOccupancy,
      };
    });

    const month = now.getMonth() + 1;
    const season = month >= 7 && month <= 8 ? 'עונת קיץ (שיא)' : month >= 12 || month <= 1 ? 'חגי חורף' : 'עונה רגילה';

    const prompt = `אתה יועץ תמחור למלון. בהתבסס על הנתונים הבאים, הצע מחירים מומלצים לכל סוג חדר.

עונה נוכחית: ${season}
תאריך: ${now.toLocaleDateString('he-IL')}

נתוני תפוסה ל-30 הימים הקרובים:
${JSON.stringify(occupancyData, null, 2)}

ענה בפורמט טבלה עברית עם עמודות: סוג חדר | מחיר בסיס | תפוסה % | מחיר מומלץ | הסבר קצר.
הסבר את ההמלצות בקצרה בסוף.`;

    return this.ai.generateText(prompt);
  }
}
