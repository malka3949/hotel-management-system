import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { NotificationService } from '../../notifications/notification.service';
import { AvailabilityService } from '../../availability/availability.service';

@Injectable()
export class RoomUpgradeService {
  private readonly logger = new Logger(RoomUpgradeService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private notification: NotificationService,
    private availability: AvailabilityService,
  ) {}

  async sendUpgradeOffersForAllBranches(): Promise<void> {
    const branches = await this.prisma.branch.findMany({ select: { id: true, name: true } });
    await Promise.all(
      branches.map((b) =>
        this.sendUpgradeOffersForBranch(b.id, b.name).catch((err) =>
          this.logger.error(`Upgrade offers failed for branch ${b.id}: ${String(err)}`),
        ),
      ),
    );
  }

  async sendUpgradeOffersForBranch(branchId: string, branchName: string): Promise<void> {
    if (!this.ai.isAvailable()) return;

    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayAfter = new Date(tomorrowStart.getTime() + 86400000);

    const arrivals = await this.prisma.reservation.findMany({
      where: { branchId, checkInDate: { gte: tomorrowStart, lt: dayAfter }, status: 'confirmed' },
      select: {
        id: true,
        checkInDate: true,
        checkOutDate: true,
        guest: { select: { fullName: true, email: true } },
        room: {
          select: {
            number: true,
            roomType: { select: { id: true, name: true, basePrice: true, maxOccupancy: true } },
          },
        },
      },
    });

    for (const reservation of arrivals) {
      if (!reservation.guest.email) continue;

      const availableRooms = await this.availability.getAvailableRooms({
        branchId,
        checkIn: reservation.checkInDate.toISOString(),
        checkOut: reservation.checkOutDate.toISOString(),
      });

      const currentPrice = Number(reservation.room.roomType.basePrice);
      type AvailableRoom = { number: string; roomType: { id: string; name: string; basePrice: unknown; maxOccupancy: number } };
      const upgrades = (availableRooms as AvailableRoom[])
        .filter((r) => Number(r.roomType.basePrice) > currentPrice && r.roomType.id !== reservation.room.roomType.id)
        .sort((a, b) => Number(a.roomType.basePrice) - Number(b.roomType.basePrice));

      if (upgrades.length === 0) continue;

      const bestUpgrade = upgrades[0];
      const upgradePrice = Number(bestUpgrade.roomType.basePrice);
      const nights = Math.ceil(
        (reservation.checkOutDate.getTime() - reservation.checkInDate.getTime()) / 86400000,
      );
      const priceDiff = (upgradePrice - currentPrice) * nights;

      const prompt = `אתה נציג שירות לקוחות של מלון.
שלח הצעת שדרוג חדר לאורח.
הוא הזמין חדר ${reservation.room.roomType.name} ב-${currentPrice} ₪ ללילה.
יש לנו חדר ${bestUpgrade.roomType.name} פנוי ב-${upgradePrice} ₪ ללילה — שדרוג של ${priceDiff} ₪ ל-${nights} לילות.
פנה לאורח בלשון כבוד.
כתוב אימייל קצר ומפתה בעברית (3-4 משפטים) עם הצעת השדרוג. אל תכלול שורת נושא.`;

      const body = await this.ai.generateText(prompt);

      await this.notification.sendEmail({
        to: reservation.guest.email,
        subject: `הצעת שדרוג מיוחדת לשהותך ב${branchName}`,
        body: body.replace(/\n/g, '<br>'),
      });

      this.logger.log(`Upgrade offer sent for reservation ${reservation.id}`);
    }
  }
}
