import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { NotificationService } from '../../notifications/notification.service';

@Injectable()
export class StaffReminderService {
  private readonly logger = new Logger(StaffReminderService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private notification: NotificationService,
  ) {}

  async sendRemindersForAllBranches(): Promise<void> {
    const branches = await this.prisma.branch.findMany({ select: { id: true, name: true } });
    await Promise.all(
      branches.map((b) =>
        this.sendRemindersForBranch(b.id, b.name).catch((err) =>
          this.logger.error(`Reminders failed for branch ${b.id}: ${String(err)}`),
        ),
      ),
    );
  }

  async sendRemindersForBranch(branchId: string, branchName: string): Promise<void> {
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayAfter = new Date(tomorrowStart.getTime() + 86400000);

    const arrivals = await this.prisma.reservation.findMany({
      where: {
        branchId,
        checkInDate: { gte: tomorrowStart, lt: dayAfter },
        status: 'confirmed',
        notes: { not: null },
      },
      select: {
        guest: { select: { fullName: true } },
        room: { select: { number: true, roomType: { select: { name: true } } } },
        checkInDate: true,
        checkOutDate: true,
        notes: true,
      },
    });

    if (arrivals.length === 0) return;

    const manager = await this.prisma.user.findFirst({
      where: { branchId, role: 'hotel_manager', isActive: true },
      select: { email: true },
    });
    if (!manager) return;
    if (!this.ai.isAvailable()) return;

    const HEALTH_PATTERN = /אלרג|צליאק|סוכרת|לחץ דם|לב |כאב|תרופ|נכות|כיסא גלגל|עיוור|חירש|כבד שמיעה|מוגבל/i;
    const sanitizedArrivals = arrivals.map((r, i) => ({
      אורח: `אורח_${i + 1}`,
      חדר: `${r.room.number} (${r.room.roomType.name})`,
      הערה: r.notes && HEALTH_PATTERN.test(r.notes) ? '[הערה מסולקת — מידע רגיש]' : r.notes,
    }));

    const prompt = `אתה מנהל תפעול מלון. כתוב תזכורת לצוות לפני שתנועה מחר.
הדגש הערות מיוחדות שדורשות הכנה (בקשות מיוחדות, שירותים נוספים).
תכלית: הצוות יודע מה להכין. סגנון: רשימה תמציתית, עברית.

אורחים מגיעים מחר עם הערות מיוחדות:
${JSON.stringify(sanitizedArrivals, null, 2)}`;

    const body = await this.ai.generateText(prompt);

    await this.notification.sendEmail({
      to: manager.email,
      subject: `תזכורת צוות — הגעות מחר — ${branchName}`,
      body: body.replace(/\n/g, '<br>'),
    });

    this.logger.log(`Staff reminder sent for branch ${branchId}, ${arrivals.length} arrivals with notes`);
  }
}
