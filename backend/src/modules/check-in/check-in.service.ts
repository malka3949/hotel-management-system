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
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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
  ) {}

  async checkIn(reservationId: string, dto: CheckInDto, requester: JwtPayload) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { room: { include: { roomType: true } } },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(reservation.branchId, requester);

    if (reservation.status !== 'confirmed') {
      throw new BadRequestException('RESERVATION_MUST_BE_CONFIRMED');
    }

    const nights = Math.max(
      1,
      Math.ceil(
        (reservation.checkOutDate.getTime() - reservation.checkInDate.getTime()) / 86400000,
      ),
    );
    const basePrice = Number(reservation.room.roomType.basePrice);
    const subtotal = new Prisma.Decimal(basePrice * nights);
    const tax = new Prisma.Decimal(Number(subtotal) * TAX_RATE).toDecimalPlaces(2);
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
              unitPrice: new Prisma.Decimal(basePrice),
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

    void this.n8n.triggerEvent('checkin.completed', {
      reservationId,
      guestName: updated.guest.fullName,
      guestEmail: updated.guest.email,
      roomNumber: updated.room.number,
      checkOutDate: updated.checkOutDate,
      branchId: reservation.branchId,
    });

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
      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'finalized', issuedAt: new Date() },
        });
        invoice = { ...invoice, status: 'finalized', issuedAt: new Date() };
      }

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

    void this.n8n.triggerEvent('checkout.completed', {
      reservationId,
      guestName: result.reservation.guest.fullName,
      guestEmail: result.reservation.guest.email,
      roomNumber: reservation.room.number,
      roomId: reservation.roomId,
      branchId: reservation.branchId,
    });

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
      include: { lineItems: true },
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
        status: 'confirmed',
        checkInDate: { gte: day, lt: nextDay },
      },
      include: {
        guest: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, number: true, floor: true, roomType: { select: { name: true } } } },
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
        invoice: { include: { lineItems: true } },
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
