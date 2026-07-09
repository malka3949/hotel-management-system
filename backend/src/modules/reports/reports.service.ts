import { Injectable, ForbiddenException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import * as ExcelJS from 'exceljs';
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
          createdAt: { gte: from, lte: to },
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

    const revenueByBranch = await this.prisma.invoice.groupBy({
      by: ['branchId'],
      where: {
        branchId: { in: branches.map((b) => b.id) },
        status: { in: ['paid', 'finalized'] },
        createdAt: { gte: monthStart },
      },
      _sum: { total: true },
    });

    const revenueMap = new Map(
      revenueByBranch.map((r) => [r.branchId, this.toNum(r._sum.total)]),
    );

    return branches.map((branch) => {
      const totalRooms = branch.rooms.length;
      const occupiedRooms = branch.rooms.filter((r) => r.status === 'occupied').length;
      return {
        branchId: branch.id,
        branchName: branch.name,
        totalRooms,
        occupiedRooms,
        occupancyPct: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        revenueThisMonth: revenueMap.get(branch.id) ?? 0,
      };
    });
  }

  // ── XLSX Exports ──────────────────────────────────────────────────────────

  async buildReservationsCsv(query: ReportsQueryDto, user: JwtPayload): Promise<Buffer> {
    const reservations = await this.getFutureReservations(query, user);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Hotel Manager';
    const ws = wb.addWorksheet('הזמנות עתידיות', { views: [{ rightToLeft: true }] });

    ws.columns = [
      { header: 'שם אורח', key: 'name', width: 22 },
      { header: 'טלפון', key: 'phone', width: 14 },
      { header: 'חדר', key: 'room', width: 8 },
      { header: 'תאריך הגעה', key: 'checkIn', width: 14 },
      { header: 'תאריך עזיבה', key: 'checkOut', width: 14 },
      { header: 'לילות', key: 'nights', width: 8 },
      { header: 'סטטוס', key: 'status', width: 12 },
      { header: 'מחיר (₪)', key: 'price', width: 12 },
      { header: 'מקור', key: 'source', width: 14 },
    ];

    this.styleHeaderRow(ws.getRow(1));

    reservations.forEach((r, i) => {
      const nights = Math.round(
        (new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / 86400000,
      );
      const status = r.status;
      const row = ws.addRow({
        name: r.guest.fullName,
        phone: r.guest.phone ?? '',
        room: r.room.number,
        checkIn: this.heDate(r.checkInDate),
        checkOut: this.heDate(r.checkOutDate),
        nights,
        status: this.translateStatus(status),
        price: r.totalPrice,
        source: this.translateSource(r.source ?? ''),
      });
      this.styleDataRow(row, i);
      const statusColor =
        status === 'confirmed' || status === 'checked_in' ? '059669' : status === 'cancelled' ? 'DC2626' : '475569';
      row.getCell('status').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + statusColor } };
      row.getCell('price').numFmt = '#,##0.00';
    });

    ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } };
    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async buildRevenueCsv(query: ReportsQueryDto, user: JwtPayload): Promise<Buffer> {
    const branchId = this.resolveBranchFilter(query.branchId, user);
    const branchFilter = branchId ? { branchId } : {};
    const { from, to } = this.defaultRange(query, 30);

    const invoices = await this.prisma.invoice.findMany({
      where: { ...branchFilter, status: { in: ['paid', 'finalized'] }, createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        reservation: {
          select: { id: true, checkInDate: true, checkOutDate: true, room: { select: { number: true } } },
        },
        guest: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Hotel Manager';
    const ws = wb.addWorksheet('גבייה', { views: [{ rightToLeft: true }] });

    ws.columns = [
      { header: 'שם אורח', key: 'name', width: 22 },
      { header: 'חדר', key: 'room', width: 8 },
      { header: 'תאריך הגעה', key: 'checkIn', width: 14 },
      { header: 'תאריך עזיבה', key: 'checkOut', width: 14 },
      { header: 'סטטוס חשבונית', key: 'status', width: 16 },
      { header: 'סכום (₪)', key: 'total', width: 13 },
      { header: 'תאריך גבייה', key: 'collected', width: 14 },
    ];

    this.styleHeaderRow(ws.getRow(1));

    invoices.forEach((inv, i) => {
      const isPaid = inv.status === 'paid';
      const row = ws.addRow({
        name: inv.guest.fullName,
        room: inv.reservation.room.number,
        checkIn: this.heDate(inv.reservation.checkInDate),
        checkOut: this.heDate(inv.reservation.checkOutDate),
        status: isPaid ? 'שולם' : 'סגור',
        total: this.toNum(inv.total),
        collected: this.heDate(inv.createdAt),
      });
      this.styleDataRow(row, i);
      row.getCell('status').font = { name: 'Arial', size: 11, bold: true, color: { argb: isPaid ? 'FF059669' : 'FF475569' } };
      row.getCell('total').numFmt = '#,##0.00';
    });

    ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } };
    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private styleHeaderRow(row: any): void {
    row.height = 22;
    row.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFC7D2FE' } },
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private styleDataRow(row: any, index: number): void {
    row.height = 18;
    const bg = index % 2 === 0 ? 'FFFFFFFF' : 'FFEEF2FF';
    row.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { name: 'Arial', size: 11 };
      cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    });
  }

  private esc(val: string): string {
    return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  private heDate(date: Date | string): string {
    const d = new Date(date);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'מאושר',
      checked_in: 'צ׳ק-אין',
      checked_out: 'יצא',
      cancelled: 'בוטל',
      pending: 'ממתין',
    };
    return map[status] ?? status;
  }

  private translateSource(source: string): string {
    const map: Record<string, string> = {
      walk_in: 'כניסה ישירה',
      phone: 'טלפון',
      website: 'אתר',
      ota: 'OTA',
    };
    return map[source] ?? source;
  }

  private csvField(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
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
    if (query.from) {
      return { from: new Date(query.from), to: this.dayEnd(now) };
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
