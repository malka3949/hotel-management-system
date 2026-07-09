import { Injectable, ForbiddenException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReportsQueryDto } from './dto/reports-query.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ── Occupancy Summary ─────────────────────────────────────────────────────

  async getOccupancySummary(query: ReportsQueryDto, user: JwtPayload) {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const where = branchId ? { branchId, isActive: true } : { isActive: true };

    const rooms = await this.prisma.room.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const byStatus = Object.fromEntries(rooms.map((r) => [r.status, r._count.id]));
    const total = rooms.reduce((sum, r) => sum + r._count.id, 0);

    return {
      total,
      occupied: byStatus['occupied'] ?? 0,
      available: byStatus['available'] ?? 0,
      maintenance: (byStatus['maintenance'] ?? 0) + (byStatus['out_of_order'] ?? 0),
      occupancyPct: total > 0 ? Math.round(((byStatus['occupied'] ?? 0) / total) * 100) : 0,
    };
  }

  // ── Revenue Summary ───────────────────────────────────────────────────────

  async getRevenueSummary(query: ReportsQueryDto, user: JwtPayload) {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};

    const now = new Date();
    const todayStart = this.dayStart(now);
    const todayEnd = this.dayEnd(now);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = monthStart;

    const baseWhere = { ...branchFilter, status: { in: ['paid' as const, 'finalized' as const] } };

    const [today, thisMonth, prevMonth] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...baseWhere, createdAt: { gte: monthStart, lt: monthEnd } },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...baseWhere, createdAt: { gte: prevMonthStart, lt: prevMonthEnd } },
        _sum: { total: true },
      }),
    ]);

    return {
      today: this.toNum(today._sum.total),
      thisMonth: this.toNum(thisMonth._sum.total),
      prevMonth: this.toNum(prevMonth._sum.total),
    };
  }

  // ── Arrivals & Departures ─────────────────────────────────────────────────

  async getArrivalsDepartures(query: ReportsQueryDto, user: JwtPayload) {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};

    const now = new Date();
    const today = this.dateOnly(now);
    const tomorrow = this.dateOnly(new Date(now.getTime() + 86400000));

    const [arrivalsToday, arrivalsTomorrow, departuresToday, departuresTomorrow] =
      await Promise.all([
        this.prisma.reservation.count({
          where: {
            ...branchFilter,
            checkInDate: today,
            status: { in: ['confirmed', 'checked_in'] },
          },
        }),
        this.prisma.reservation.count({
          where: {
            ...branchFilter,
            checkInDate: tomorrow,
            status: { in: ['confirmed'] },
          },
        }),
        this.prisma.reservation.count({
          where: {
            ...branchFilter,
            checkOutDate: today,
            status: { in: ['checked_in', 'checked_out'] },
          },
        }),
        this.prisma.reservation.count({
          where: {
            ...branchFilter,
            checkOutDate: tomorrow,
            status: { in: ['checked_in'] },
          },
        }),
      ]);

    return { arrivalsToday, arrivalsTomorrow, departuresToday, departuresTomorrow };
  }

  // ── Reservation Pipeline (next 30 days) ───────────────────────────────────

  async getReservationPipeline(query: ReportsQueryDto, user: JwtPayload) {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};

    const today = this.dateOnly(new Date());
    const limit = new Date(today.getTime() + 30 * 86400000);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        ...branchFilter,
        status: { in: ['confirmed', 'checked_in'] },
        checkInDate: { gte: today, lt: limit },
      },
      select: { checkInDate: true },
    });

    return this.groupByDay(reservations.map((r) => r.checkInDate), today, 30);
  }

  // ── Occupancy Trend (last 30 days) ────────────────────────────────────────

  async getOccupancyTrend(query: ReportsQueryDto, user: JwtPayload) {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};

    const today = this.dateOnly(new Date());
    const start = new Date(today.getTime() - 29 * 86400000);

    const [totalRooms, reservations] = await Promise.all([
      this.prisma.room.count({ where: { ...branchFilter, isActive: true } }),
      this.prisma.reservation.findMany({
        where: {
          ...branchFilter,
          status: { in: ['confirmed', 'checked_in', 'checked_out'] },
          checkInDate: { lte: today },
          checkOutDate: { gt: start },
        },
        select: { checkInDate: true, checkOutDate: true },
      }),
    ]);

    const trend: Array<{ date: string; occupiedCount: number; totalRooms: number; occupancyPct: number }> = [];

    for (let i = 0; i < 30; i++) {
      const day = new Date(start.getTime() + i * 86400000);
      const dayEnd = new Date(day.getTime() + 86400000);

      const occupied = reservations.filter(
        (r) => r.checkInDate <= day && r.checkOutDate > day,
      ).length;

      trend.push({
        date: this.isoDate(day),
        occupiedCount: occupied,
        totalRooms,
        occupancyPct: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
      });
    }

    return trend;
  }

  // ── Cancellations ─────────────────────────────────────────────────────────

  async getCancellations(query: ReportsQueryDto, user: JwtPayload) {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};

    const { from, to } = this.defaultRange(query, 30);

    const [cancelled, totalInRange] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          ...branchFilter,
          status: 'cancelled',
          cancelledAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          cancelledAt: true,
          cancellationReason: true,
          totalPrice: true,
          checkInDate: true,
          checkOutDate: true,
          guest: { select: { fullName: true, email: true, phone: true } },
          room: { select: { number: true } },
        },
        orderBy: { cancelledAt: 'desc' },
      }),
      this.prisma.reservation.count({
        where: {
          ...branchFilter,
          createdAt: { gte: from, lte: to },
        },
      }),
    ]);

    const cancellationRate =
      totalInRange > 0 ? Math.round((cancelled.length / totalInRange) * 100) : 0;

    return {
      cancellationRate,
      totalCancelled: cancelled.length,
      totalInRange,
      items: cancelled.map((r) => ({
        ...r,
        totalPrice: this.toNum(r.totalPrice),
      })),
    };
  }

  // ── Future Reservations ───────────────────────────────────────────────────

  async getFutureReservations(query: ReportsQueryDto, user: JwtPayload) {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};

    const { from, to } = this.defaultRange(query, 30, true);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        ...branchFilter,
        status: { in: ['confirmed'] },
        checkInDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        totalPrice: true,
        adults: true,
        children: true,
        source: true,
        guest: { select: { fullName: true, email: true, phone: true } },
        room: { select: { number: true } },
      },
      orderBy: { checkInDate: 'asc' },
    });

    return reservations.map((r) => ({
      ...r,
      totalPrice: this.toNum(r.totalPrice),
    }));
  }

  // ── Cross-Branch (chain_admin only) ───────────────────────────────────────

  async getCrossBranch(user: JwtPayload) {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        rooms: {
          where: { isActive: true },
          select: { id: true, status: true },
        },
      },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const results = await Promise.all(
      branches.map(async (branch) => {
        const totalRooms = branch.rooms.length;
        const occupiedRooms = branch.rooms.filter((r) => r.status === 'occupied').length;

        const revenue = await this.prisma.invoice.aggregate({
          where: {
            branchId: branch.id,
            status: { in: ['paid', 'finalized'] },
            createdAt: { gte: monthStart },
          },
          _sum: { total: true },
        });

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalRooms,
          occupiedRooms,
          occupancyPct: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
          revenueThisMonth: this.toNum(revenue._sum.total),
        };
      }),
    );

    return results;
  }

  // ── CSV Exports ───────────────────────────────────────────────────────────

  async buildReservationsCsv(query: ReportsQueryDto, user: JwtPayload): Promise<string> {
    const reservations = await this.getFutureReservations(query, user);

    const header = 'מזהה,תאריך הגעה,תאריך עזיבה,שם אורח,טלפון,חדר,סטטוס,מחיר,מקור';
    const rows = reservations.map((r) =>
      [
        r.id,
        this.isoDate(r.checkInDate),
        this.isoDate(r.checkOutDate),
        r.guest.fullName,
        r.guest.phone,
        r.room.number,
        r.status,
        r.totalPrice,
        r.source ?? '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async buildRevenueCsv(query: ReportsQueryDto, user: JwtPayload): Promise<string> {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};

    const { from, to } = this.defaultRange(query, 30);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...branchFilter,
        status: { in: ['paid', 'finalized'] },
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        reservation: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'מזהה חשבונית,שם אורח,חדר,תאריך הגעה,תאריך עזיבה,סטטוס,סה"כ,תאריך יצירה';
    const rows = invoices.map((inv) =>
      [
        inv.id,
        inv.guest.fullName,
        inv.reservation.room.number,
        this.isoDate(inv.reservation.checkInDate),
        this.isoDate(inv.reservation.checkOutDate),
        inv.status,
        this.toNum(inv.total),
        inv.createdAt.toISOString().split('T')[0],
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private resolveBranchFilter(branchId: string | undefined, user: JwtPayload): string | null {
    if (user.role === 'chain_admin') return branchId ?? null;
    if (!user.branchId) throw new ForbiddenException('NO_BRANCH_ASSIGNED');
    return user.branchId;
  }

  private toNum(val: Decimal | null | undefined): number {
    if (val === null || val === undefined) return 0;
    return Number(val);
  }

  private dayStart(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private dayEnd(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }

  private dateOnly(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private isoDate(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private defaultRange(
    query: ReportsQueryDto,
    defaultDays: number,
    future = false,
  ): { from: Date; to: Date } {
    const now = new Date();
    if (query.from && query.to) {
      return { from: new Date(query.from), to: new Date(query.to) };
    }
    if (future) {
      return {
        from: this.dateOnly(now),
        to: this.dateOnly(new Date(now.getTime() + defaultDays * 86400000)),
      };
    }
    return {
      from: this.dateOnly(new Date(now.getTime() - defaultDays * 86400000)),
      to: this.dayEnd(now),
    };
  }

  private groupByDay(
    dates: Date[],
    start: Date,
    days: number,
  ): Array<{ date: string; count: number }> {
    const result: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(start.getTime() + i * 86400000);
      const dayStr = this.isoDate(day);
      const count = dates.filter((d) => this.isoDate(d) === dayStr).length;
      result.push({ date: dayStr, count });
    }
    return result;
  }
}
