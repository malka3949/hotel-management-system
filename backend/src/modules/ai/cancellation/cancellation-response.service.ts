import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { NotificationService } from '../../notifications/notification.service';

@Injectable()
export class CancellationResponseService {
  private readonly logger = new Logger(CancellationResponseService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private notification: NotificationService,
  ) {}

  async sendCancellationOffer(reservationId: string): Promise<void> {
    if (!this.ai.isAvailable()) return;

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        checkInDate: true,
        checkOutDate: true,
        cancellationReason: true,
        guest: { select: { fullName: true, email: true } },
        room: { select: { number: true, roomType: { select: { name: true, basePrice: true } } } },
        branch: { select: { name: true } },
      },
    });

    if (!reservation?.guest.email) return;

    const nights = Math.ceil(
      (reservation.checkOutDate.getTime() - reservation.checkInDate.getTime()) / 86400000,
    );

    const prompt = `אתה נציג שירות לקוחות של מלון בשם "${reservation.branch.name}".
האורח ביטל הזמנה לחדר ${reservation.room.roomType.name} מ-${reservation.checkInDate.toLocaleDateString('he-IL')} ל-${reservation.checkOutDate.toLocaleDateString('he-IL')} (${nights} לילות).

כתוב אימייל קצר ואישי בעברית (3-4 משפטים):
1. הבעת אכזבה שהאורח לא יגיע
2. הצעה: 10% הנחה בהזמנה הבאה עם קוד "WELCOME10"
3. הזמנה לחזור בעתיד

אל תכלול שורת נושא — רק גוף האימייל.`;

    try {
      const body = await this.ai.generateText(prompt);

      await this.notification.sendEmail({
        to: reservation.guest.email,
        subject: `מקווים לראותך שוב — ${reservation.branch.name}`,
        body: body.replace(/\n/g, '<br>'),
      });

      this.logger.log(`Cancellation offer sent for reservation ${reservationId}`);
    } catch (err) {
      this.logger.error(`Failed to send cancellation offer for ${reservationId}: ${String(err)}`);
    }
  }
}
