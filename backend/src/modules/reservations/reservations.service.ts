import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationService } from '../notifications/notification.service';
import { N8nService } from '../notifications/n8n.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ReservationFiltersDto, CalendarFiltersDto } from './dto/reservation-filters.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Prisma, ReservationStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out', 'no_show'],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

const RESERVATION_INCLUDE = {
  guest: {
    select: { id: true, fullName: true, email: true, phone: true, passportId: true },
  },
  room: {
    select: {
      id: true,
      number: true,
      floor: true,
      status: true,
      roomType: { select: { id: true, name: true, basePrice: true, maxOccupancy: true } },
    },
  },
  createdByUser: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private availability: AvailabilityService,
    private notifications: NotificationService,
    private n8n: N8nService,
  ) {}

  async create(dto: CreateReservationDto, requester: JwtPayload) {
    const branchId = this.resolveBranchId(dto.branchId, requester);
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);

    if (checkIn >= checkOut) {
      throw new BadRequestException('CHECK_OUT_MUST_BE_AFTER_CHECK_IN');
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: { roomType: true },
    });
    if (!room || room.branchId !== branchId) throw new NotFoundException('ROOM_NOT_FOUND');

    const guest = await this.prisma.guest.findUnique({ where: { id: dto.guestId }, select: { id: true, branchId: true, email: true, fullName: true } });
    if (!guest || guest.branchId !== branchId) throw new NotFoundException('GUEST_NOT_FOUND');

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
    const totalPrice = new Prisma.Decimal(Number(room.roomType.basePrice) * nights);

    const reservation = await this.prisma.$transaction(async (tx) => {
      const available = await this.availability.isRoomAvailable(dto.roomId, checkIn, checkOut, tx);
      if (!available) throw new ConflictException('ROOM_CONFLICT');

      return tx.reservation.create({
        data: {
          branchId,
          roomId: dto.roomId,
          guestId: dto.guestId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          status: 'pending',
          totalPrice,
          source: dto.source ?? 'walk_in',
          adults: dto.adults ?? 1,
          children: dto.children ?? 0,
          notes: dto.notes ?? null,
          version: 0,
          createdBy: requester.sub,
        },
        include: RESERVATION_INCLUDE,
      });
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'RESERVATION_CREATED',
      entityType: 'reservation',
      entityId: reservation.id,
      branchId,
      metadata: { roomId: dto.roomId, guestId: dto.guestId, checkInDate: dto.checkInDate, checkOutDate: dto.checkOutDate },
    });

    await this.availability.invalidateAvailabilityCache(branchId);

    if (guest.email) {
      void this.notifications.sendEmail({
        to: guest.email,
        subject: 'אישור הזמנה',
        body: `שלום ${guest.fullName}, הזמנתך מספר ${reservation.id} אושרה.`,
      });
    }

    void this.n8n.triggerEvent('reservation.confirmed', {
      reservationId: reservation.id,
      guestName: guest.fullName,
      guestEmail: guest.email,
      roomNumber: reservation.room.number,
      checkIn: dto.checkInDate,
      checkOut: dto.checkOutDate,
      totalPrice: reservation.totalPrice,
      branchId,
    });

    return reservation;
  }

  async findAll(requester: JwtPayload, filters: ReservationFiltersDto) {
    const branchId = this.resolveBranchId(filters.branchId, requester);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = {
      branchId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.roomId ? { roomId: filters.roomId } : {}),
      ...(filters.guestId ? { guestId: filters.guestId } : {}),
      ...(filters.roomTypeId ? { room: { roomTypeId: filters.roomTypeId } } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            AND: [
              ...(filters.dateFrom ? [{ checkOutDate: { gt: new Date(filters.dateFrom) } }] : []),
              ...(filters.dateTo ? [{ checkInDate: { lt: new Date(filters.dateTo) } }] : []),
            ],
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { id: { contains: filters.search, mode: 'insensitive' as const } },
              { guest: { fullName: { contains: filters.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        include: RESERVATION_INCLUDE,
        orderBy: { checkInDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, requester: JwtPayload) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: RESERVATION_INCLUDE,
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(reservation.branchId, requester);
    return reservation;
  }

  async getCalendar(requester: JwtPayload, filters: CalendarFiltersDto) {
    const branchId = this.resolveBranchId(filters.branchId, requester);
    const dateFrom = new Date(filters.dateFrom);
    const dateTo = new Date(filters.dateTo);

    return this.prisma.reservation.findMany({
      where: {
        branchId,
        status: { notIn: ['cancelled', 'no_show'] },
        checkInDate: { lt: dateTo },
        checkOutDate: { gt: dateFrom },
      },
      select: {
        id: true,
        roomId: true,
        guestId: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        totalPrice: true,
        guest: { select: { fullName: true } },
        room: { select: { number: true } },
      },
      orderBy: [{ roomId: 'asc' }, { checkInDate: 'asc' }],
    });
  }

  async update(id: string, dto: UpdateReservationDto, requester: JwtPayload) {
    const existing = await this.prisma.reservation.findUnique({
      where: { id },
      include: { room: { include: { roomType: true } } },
    });
    if (!existing) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(existing.branchId, requester);

    if (['checked_out', 'cancelled', 'no_show'].includes(existing.status)) {
      throw new BadRequestException('RESERVATION_NOT_EDITABLE');
    }

    const roomId = dto.roomId ?? existing.roomId;
    const checkIn = dto.checkInDate ? new Date(dto.checkInDate) : existing.checkInDate;
    const checkOut = dto.checkOutDate ? new Date(dto.checkOutDate) : existing.checkOutDate;

    if (checkIn >= checkOut) throw new BadRequestException('CHECK_OUT_MUST_BE_AFTER_CHECK_IN');

    const roomChanged = dto.roomId !== undefined && dto.roomId !== existing.roomId;
    const datesChanged = dto.checkInDate !== undefined || dto.checkOutDate !== undefined;

    let totalPrice = existing.totalPrice;

    if (roomChanged || datesChanged) {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
        include: { roomType: true },
      });
      if (!room || room.branchId !== existing.branchId) throw new NotFoundException('ROOM_NOT_FOUND');

      const updated = await this.prisma.$transaction(async (tx) => {
        const available = await this.availability.isRoomAvailable(roomId, checkIn, checkOut, tx);
        if (!available) throw new ConflictException('ROOM_CONFLICT');

        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
        totalPrice = new Prisma.Decimal(Number(room.roomType.basePrice) * nights);

        return tx.reservation.update({
          where: { id, version: existing.version },
          data: {
            roomId,
            guestId: dto.guestId ?? existing.guestId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            totalPrice,
            adults: dto.adults ?? existing.adults,
            children: dto.children ?? existing.children,
            source: dto.source ?? existing.source ?? undefined,
            notes: dto.notes !== undefined ? dto.notes : existing.notes,
            version: { increment: 1 },
          },
          include: RESERVATION_INCLUDE,
        });
      });

      await this.availability.invalidateAvailabilityCache(existing.branchId);
      await this.audit.log({
        userId: requester.sub,
        action: 'RESERVATION_UPDATED',
        entityType: 'reservation',
        entityId: id,
        branchId: existing.branchId,
      });
      return updated;
    }

    const result = await this.prisma.reservation.update({
      where: { id },
      data: {
        guestId: dto.guestId ?? existing.guestId,
        adults: dto.adults ?? existing.adults,
        children: dto.children ?? existing.children,
        source: dto.source ?? existing.source ?? undefined,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        version: { increment: 1 },
      },
      include: RESERVATION_INCLUDE,
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'RESERVATION_UPDATED',
      entityType: 'reservation',
      entityId: id,
      branchId: existing.branchId,
    });
    return result;
  }

  async updateStatus(id: string, dto: UpdateReservationStatusDto, requester: JwtPayload) {
    const existing = await this.prisma.reservation.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, version: true },
    });
    if (!existing) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(existing.branchId, requester);

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException('INVALID_TRANSITION');
    }

    const result = await this.prisma.reservation.update({
      where: { id },
      data: { status: dto.status, version: { increment: 1 } },
      include: RESERVATION_INCLUDE,
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'RESERVATION_STATUS_CHANGED',
      entityType: 'reservation',
      entityId: id,
      branchId: existing.branchId,
      metadata: { from: existing.status, to: dto.status },
    });

    if (dto.status === 'cancelled' || dto.status === 'checked_out') {
      await this.availability.invalidateAvailabilityCache(existing.branchId);
    }

    return result;
  }

  async cancel(id: string, dto: CancelReservationDto, requester: JwtPayload) {
    const existing = await this.prisma.reservation.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, version: true },
    });
    if (!existing) throw new NotFoundException('RESERVATION_NOT_FOUND');
    this.assertBranchAccess(existing.branchId, requester);

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes('cancelled')) {
      throw new BadRequestException('INVALID_TRANSITION');
    }

    const result = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
        version: { increment: 1 },
      },
      include: RESERVATION_INCLUDE,
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'RESERVATION_CANCELLED',
      entityType: 'reservation',
      entityId: id,
      branchId: existing.branchId,
      metadata: { reason: dto.reason },
    });

    await this.availability.invalidateAvailabilityCache(existing.branchId);

    void this.n8n.triggerEvent('reservation.cancelled', {
      reservationId: result.id,
      guestName: result.guest.fullName,
      guestEmail: result.guest.email,
      reason: dto.reason,
      branchId: existing.branchId,
    });

    return result;
  }

  async getByRoom(roomId: string, requester: JwtPayload) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, branchId: true },
    });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    this.assertBranchAccess(room.branchId, requester);

    return this.prisma.reservation.findMany({
      where: { roomId },
      include: RESERVATION_INCLUDE,
      orderBy: { checkInDate: 'desc' },
    });
  }

  async getByGuest(guestId: string, requester: JwtPayload) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      select: { id: true, branchId: true },
    });
    if (!guest) throw new NotFoundException('GUEST_NOT_FOUND');
    this.assertBranchAccess(guest.branchId, requester);

    return this.prisma.reservation.findMany({
      where: { guestId },
      include: RESERVATION_INCLUDE,
      orderBy: { checkInDate: 'desc' },
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
