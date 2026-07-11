import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AvailabilityService } from '../availability/availability.service';
import { RoomStatusGateway } from '../rooms/room-status.gateway';
import { N8nService } from '../notifications/n8n.service';
import { NotificationService, wrapEmailHtml } from '../notifications/notification.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HousekeepingService } from '../housekeeping/housekeeping.service';

const RESERVATION_INCLUDE = {
  guest: { select: { id: true, fullName: true, email: true, phone: true } },
  room: {
    select: {
      id: true,
      number: true,
      floor: true,
      status: true,
      cleaningStatus: true,
      roomType: { select: { id: true, name: true, basePrice: true } },
    },
  },
  checkIn: true,
  checkOut: true,
  invoice: { include: { lineItems: true } },
} as const;

const TAX_RATE = 0.17;

@Injectable()
export class CheckInService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private availability: AvailabilityService,
    private roomStatusGateway: RoomStatusGateway,
    private n8n: N8nService,
    private housekeeping: HousekeepingService,
    private notifications: NotificationService,
  ) {}

  async checkIn(reservationId: string, dto: CheckInDto, requester: JwtPayload) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { room: { include: { roomType: true } } },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(reservation.branchId, requester);

    if (reservation.status === 'pending') {
      await this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: 'confirmed', version: { increment: 1 } },
      });
    } else if (reservation.status !== 'confirmed') {
      throw new BadRequestException('RESERVATION_MUST_BE_CONFIRMED');
    }

    const nights = Math.max(
      1,
      Math.ceil(
        (reservation.checkOutDate.getTime() - reservation.checkInDate.getTime()) / 86400000,
      ),
    );
    // basePrice is VAT-inclusive (gross). Extract net so tax is not double-counted.
    const grossNightly = new Prisma.Decimal(reservation.room.roomType.basePrice);
    const netNightly = grossNightly
      .div(new Prisma.Decimal(1).add(new Prisma.Decimal(TAX_RATE)))
      .toDecimalPlaces(2);
    const subtotal = netNightly.mul(nights);
    const tax = subtotal.mul(new Prisma.Decimal(TAX_RATE)).toDecimalPlaces(2);
    const total = subtotal.add(tax);

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.reservation.update({
        where: { id: reservationId, version: reservation.version },
        data: { status: 'checked_in', version: { increment: 1 } },
        include: RESERVATION_INCLUDE,
      });

      await tx.room.update({
        where: { id: reservation.roomId },
        data: { status: 'occupied' },
      });

      await tx.checkIn.create({
        data: {
          reservationId,
          branchId: reservation.branchId,
          checkedInBy: requester.sub,
          notes: dto.notes ?? null,
        },
      });

      await tx.invoice.create({
        data: {
          reservationId,
          branchId: reservation.branchId,
          guestId: reservation.guestId,
          status: 'draft',
          subtotal,
          tax,
          total,
          lineItems: {
            create: {
              description: `לינה ${nights} לילות — חדר ${reservation.room.number}`,
              quantity: nights,
              unitPrice: netNightly,
              total: subtotal,
              itemType: 'room_charge',
            },
          },
        },
      });

      return res;
    });

    this.roomStatusGateway.emitRoomStatusUpdate(
      reservation.roomId,
      'occupied',
      reservation.room.cleaningStatus,
      reservation.branchId,
    );
    await this.availability.invalidateAvailabilityCache(reservation.branchId);
    await this.audit.log({
      userId: requester.sub,
      action: 'CHECK_IN',
      entityType: 'reservation',
      entityId: reservationId,
      branchId: reservation.branchId,
    });

    if (updated.guest.email) {
      const fmtDate = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

      void this.notifications.sendEmail({
        to: updated.guest.email,
        subject: `צ'ק-אין בוצע — חדר ${updated.room.number}`,
        text: `שלום ${updated.guest.fullName},\n\nצ'ק-אין בוצע בהצלחה!\n\nחדר: ${updated.room.number} — ${updated.room.roomType.name}\nתאריך עזיבה: ${fmtDate(updated.checkOutDate)}\n\nnשמח לארח אותך!\nמערכת ניהול מלון`,
        body: wrapEmailHtml(`
          <h2 style="color:#1E3A8A;font-size:22px;margin:0 0 6px 0;font-family:Arial,sans-serif">צ'ק-אין בוצע בהצלחה!</h2>
          <div style="width:40px;height:3px;background-color:#CA8A04;border-radius:2px;margin-bottom:28px"></div>
          <p style="color:#475569;font-size:15px;margin:0 0 16px 0;font-family:Arial,sans-serif">שלום ${updated.guest.fullName},</p>
          <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 24px 0;font-family:Arial,sans-serif">
            ברוך הבא! הצ'ק-אין שלך בוצע בהצלחה.
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E2E8F0;border-radius:8px;margin-bottom:28px;font-family:Arial,sans-serif;border-collapse:collapse">
            <tr>
              <td bgcolor="#F8FAFC" style="padding:11px 16px;font-size:13px;color:#475569;width:45%;border-bottom:1px solid #E2E8F0">חדר</td>
              <td bgcolor="#F8FAFC" style="padding:11px 16px;font-size:13px;color:#0F172A;font-weight:bold;border-bottom:1px solid #E2E8F0">${updated.room.number} &mdash; ${updated.room.roomType.name}</td>
            </tr>
            <tr>
              <td bgcolor="#FFFFFF" style="padding:11px 16px;font-size:13px;color:#475569">תאריך עזיבה מתוכנן</td>
              <td bgcolor="#FFFFFF" style="padding:11px 16px;font-size:13px;color:#0F172A">${fmtDate(updated.checkOutDate)}</td>
            </tr>
          </table>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px 0;font-family:Arial,sans-serif">
            לכל שאלה או בקשה, צוות הקבלה כאן בשבילך.
          </p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 20px 0">
          <p style="color:#94A3B8;font-size:12px;margin:0;font-family:Arial,sans-serif">קיבלת מייל זה כי בוצע צ'ק-אין להזמנתך.</p>
        `),
      });
    }

    return updated;
  }

  async checkOut(reservationId: string, dto: CheckOutDto, requester: JwtPayload) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { room: true, invoice: true },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(reservation.branchId, requester);

    if (reservation.status !== 'checked_in') {
      throw new BadRequestException('RESERVATION_MUST_BE_CHECKED_IN');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const res = await tx.reservation.update({
        where: { id: reservationId, version: reservation.version },
        data: { status: 'checked_out', version: { increment: 1 } },
        include: RESERVATION_INCLUDE,
      });

      await tx.room.update({
        where: { id: reservation.roomId },
        data: { status: 'available', cleaningStatus: 'dirty' },
      });

      await tx.checkOut.create({
        data: {
          reservationId,
          branchId: reservation.branchId,
          checkedOutBy: requester.sub,
          notes: dto.notes ?? null,
        },
      });

      let invoice = res.invoice;
      if (invoice && invoice.status !== 'paid') {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'finalized', issuedAt: new Date() },
        });
        invoice = { ...invoice, status: 'finalized', issuedAt: new Date() };
      }

      await this.housekeeping.createTaskInTransaction(tx, {
        branchId: reservation.branchId,
        roomId: reservation.roomId,
        reservationId,
        priority: 'urgent',
        scheduledFor: new Date(),
        createdBy: null,
      });

      return { reservation: res, invoice };
    });

    this.roomStatusGateway.emitRoomStatusUpdate(
      reservation.roomId,
      'available',
      'dirty',
      reservation.branchId,
    );
    await this.availability.invalidateAvailabilityCache(reservation.branchId);
    await this.audit.log({
      userId: requester.sub,
      action: 'CHECK_OUT',
      entityType: 'reservation',
      entityId: reservationId,
      branchId: reservation.branchId,
    });

    const guestEmail = result.reservation.guest.email;
    if (guestEmail) {
      void this.notifications.sendEmail({
        to: guestEmail,
        subject: 'תודה על שהותך — מערכת ניהול מלון',
        text: `שלום ${result.reservation.guest.fullName},\n\nתודה על שהותך!\n\nאנו מקווים שנהנית. חשבונית תשלח בנפרד.\n\nנשמח לקבל אותך שוב!\nמערכת ניהול מלון`,
        body: wrapEmailHtml(`
          <h2 style="color:#1E3A8A;font-size:22px;margin:0 0 6px 0;font-family:Arial,sans-serif">תודה על שהותך!</h2>
          <div style="width:40px;height:3px;background-color:#CA8A04;border-radius:2px;margin-bottom:28px"></div>
          <p style="color:#475569;font-size:15px;margin:0 0 16px 0;font-family:Arial,sans-serif">שלום ${result.reservation.guest.fullName},</p>
          <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 24px 0;font-family:Arial,sans-serif">
            תודה על שהותך אצלנו! אנו מקווים שנהנית ומצפים לאחד אותך שוב.
          </p>
          <p style="color:#475569;font-size:14px;margin:0 0 20px 0;font-family:Arial,sans-serif">
            חשבונית מפורטת תשלח אליך בנפרד.
          </p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 20px 0">
          <p style="color:#94A3B8;font-size:12px;margin:0;font-family:Arial,sans-serif">קיבלת מייל זה כאישור לצ'ק-אאוט מהמלון.</p>
        `),
      });
    }

    return result;
  }

  async getInvoice(reservationId: string, requester: JwtPayload) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { branchId: true },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(reservation.branchId, requester);

    const invoice = await this.prisma.invoice.findUnique({
      where: { reservationId },
      include: { lineItems: true, payments: { where: { status: 'succeeded' } } },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    return invoice;
  }

  async getActiveGuests(branchId: string | undefined, requester: JwtPayload) {
    const resolvedBranchId = this.resolveBranchId(branchId, requester);
    return this.prisma.reservation.findMany({
      where: { branchId: resolvedBranchId, status: 'checked_in' },
      include: {
        guest: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, number: true, floor: true, roomType: { select: { name: true } } } },
        checkIn: true,
      },
      orderBy: { checkInDate: 'desc' },
    });
  }

  async getArrivals(date: string, branchId: string | undefined, requester: JwtPayload) {
    const resolvedBranchId = this.resolveBranchId(branchId, requester);
    const day = new Date(date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.reservation.findMany({
      where: {
        branchId: resolvedBranchId,
        status: { in: ['pending', 'confirmed'] },
        checkInDate: { gte: day, lt: nextDay },
      },
      include: {
        guest: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, number: true, floor: true, roomType: { select: { name: true } } } },
        onlineCheckIn: {
          select: { id: true, fullName: true, passportId: true, estimatedArrivalTime: true, specialRequests: true, completedAt: true },
        },
      },
      orderBy: { checkInDate: 'asc' },
    });
  }

  async getDepartures(date: string, branchId: string | undefined, requester: JwtPayload) {
    const resolvedBranchId = this.resolveBranchId(branchId, requester);
    const day = new Date(date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.reservation.findMany({
      where: {
        branchId: resolvedBranchId,
        status: 'checked_in',
        checkOutDate: { gte: day, lt: nextDay },
      },
      include: {
        guest: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, number: true, floor: true, roomType: { select: { name: true } } } },
        checkIn: true,
        invoice: { include: { lineItems: true, payments: { where: { status: 'succeeded' } } } },
      },
      orderBy: { checkOutDate: 'asc' },
    });
  }

  private resolveBranchId(provided: string | undefined, requester: JwtPayload): string {
    if (requester.role === 'chain_admin') {
      if (!provided) throw new BadRequestException('BRANCH_ID_REQUIRED');
      return provided;
    }
    if (!requester.branchId) throw new ForbiddenException('NO_BRANCH_ASSIGNED');
    return requester.branchId;
  }

  private assertBranchAccess(entityBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && entityBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }
}
