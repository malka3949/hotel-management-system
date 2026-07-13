import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { NotificationService } from '../../notifications/notification.service';

@Injectable()
export class DailyDigestService {
  private readonly logger = new Logger(DailyDigestService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private notification: NotificationService,
  ) {}

  async sendDigestForAllBranches(): Promise<void> {
    const branches = await this.prisma.branch.findMany({
      select: { id: true, name: true },
    });
    await Promise.all(branches.map((b) => this.sendDigestForBranch(b.id, b.name)));
  }

  async sendDigestForBranch(branchId: string, branchName: string): Promise<void> {
    const manager = await this.prisma.user.findFirst({
      where: { branchId, role: 'hotel_manager', isActive: true },
      select: { email: true, name: true },
    });
    if (!manager) {
      this.logger.warn(`No active manager for branch ${branchId} — skipping digest`);
      return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart.getTime() + 86400000);
    const yesterday = new Date(todayStart.getTime() - 86400000);

    const [todayCheckIns, todayCheckOuts, currentGuests, yesterdayRevenue, roomStats, cancellations] =
      await Promise.all([
        this.prisma.reservation.findMany({
          where: { branchId, checkInDate: { gte: todayStart, lt: tomorrow }, status: { in: ['confirmed', 'checked_in'] } },
          select: { guest: { select: { fullName: true } }, room: { select: { number: true } }, notes: true },
        }),
        this.prisma.reservation.findMany({
          where: { branchId, checkOutDate: { gte: todayStart, lt: tomorrow }, status: 'checked_in' },
          select: { guest: { select: { fullName: true } }, room: { select: { number: true } } },
        }),
        this.prisma.reservation.count({ where: { branchId, status: 'checked_in' } }),
        this.prisma.invoice.aggregate({
          where: { reservation: { branchId }, status: 'paid', createdAt: { gte: yesterday, lt: todayStart } },
          _sum: { total: true },
          _count: { id: true },
        }),
        this.prisma.room.groupBy({ by: ['status'], where: { branchId }, _count: { id: true } }),
        this.prisma.reservation.count({
          where: { branchId, status: 'cancelled', updatedAt: { gte: todayStart, lt: tomorrow } },
        }),
      ]);

    const totalRooms = roomStats.reduce((s, r) => s + r._count.id, 0);
    const occupiedRooms = roomStats.find((r) => r.status === 'occupied')?._count.id ?? 0;
    const specialRequests = todayCheckIns.filter((r) => r.notes);

    const data = {
      תאריך: now.toLocaleDateString('he-IL'),
      סניף: branchName,
      מנהל: manager.name,
      אורחים_כעת: currentGuests,
      תפוסה: `${occupiedRooms}/${totalRooms} (${totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0}%)`,
      צק_אין_היום: todayCheckIns.map((r) => ({ אורח: r.guest.fullName, חדר: r.room.number, הערות: r.notes ?? '' })),
      צק_אאוט_היום: todayCheckOuts.map((r) => ({ אורח: r.guest.fullName, חדר: r.room.number })),
      הכנסות_אתמול: `${Number(yesterdayRevenue._sum.total ?? 0).toLocaleString('he-IL')} ₪ (${yesterdayRevenue._count.id} חשבוניות)`,
      ביטולים_היום: cancellations,
      בקשות_מיוחדות: specialRequests.map((r) => ({ אורח: r.guest.fullName, הערה: r.notes })),
    };

    if (!this.ai.isAvailable()) {
      this.logger.warn('AI unavailable — skipping digest');
      return;
    }

    const prompt = `אתה עוזר ניהולי של מלון. כתוב סיכום בוקר קצר ומקצועי בעברית למנהל הסניף.
כלול: תפוסה, הגעות/עזיבות היום, הכנסות אתמול, התראות חשובות (ביטולים, בקשות מיוחדות).
היה תמציתי — 5-8 משפטים. סגנון דוח מקצועי.

נתוני היום:
${JSON.stringify(data, null, 2)}`;

    const summary = await this.ai.generateText(prompt);

    await this.notification.sendEmail({
      to: manager.email,
      subject: `סיכום בוקר — ${branchName} — ${now.toLocaleDateString('he-IL')}`,
      body: summary.replace(/\n/g, '<br>'),
    });

    this.logger.log(`Daily digest sent to ${manager.email} for branch ${branchId}`);
  }
}
