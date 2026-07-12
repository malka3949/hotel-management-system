import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type RoomPriority = 'CRITICAL' | 'HIGH' | 'LOW' | 'SKIP';

export interface OptimizedRoom {
  roomId: string;
  roomNumber: string;
  floor: number;
  priority: RoomPriority;
  reason: string;
}

@Injectable()
export class ScheduleOptimizerService {
  constructor(private prisma: PrismaService) {}

  async optimizeSchedule(branchId: string, date: Date): Promise<OptimizedRoom[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const rooms = await this.prisma.room.findMany({
      where: { branchId },
      select: {
        id: true,
        number: true,
        floor: true,
        reservations: {
          where: {
            status: { in: ['confirmed', 'checked_in', 'checked_out'] },
            OR: [
              { checkInDate: { gte: dayStart, lte: dayEnd } },
              { checkOutDate: { gte: dayStart, lte: dayEnd } },
            ],
          },
          select: { checkInDate: true, checkOutDate: true, status: true },
        },
      },
    });

    const results: OptimizedRoom[] = [];

    for (const room of rooms) {
      const checkouts = room.reservations.filter((r) => {
        const co = new Date(r.checkOutDate);
        return co >= dayStart && co <= dayEnd;
      });
      const checkins = room.reservations.filter((r) => {
        const ci = new Date(r.checkInDate);
        return ci >= dayStart && ci <= dayEnd;
      });

      let priority: RoomPriority;
      let reason: string;

      if (checkouts.length > 0 && checkins.length > 0) {
        priority = 'CRITICAL';
        reason = 'צ׳ק-אאוט + צ׳ק-אין היום';
      } else if (checkouts.length > 0) {
        priority = 'HIGH';
        reason = 'צ׳ק-אאוט היום';
      } else if (room.reservations.some((r) => r.status === 'checked_in')) {
        priority = 'LOW';
        reason = 'אורח שוהה';
      } else {
        priority = 'SKIP';
        reason = 'חדר פנוי';
      }

      results.push({
        roomId: room.id,
        roomNumber: room.number,
        floor: room.floor ?? 0,
        priority,
        reason,
      });
    }

    const order: Record<RoomPriority, number> = { CRITICAL: 0, HIGH: 1, LOW: 2, SKIP: 3 };
    return results.sort((a, b) => order[a.priority] - order[b.priority]);
  }
}
