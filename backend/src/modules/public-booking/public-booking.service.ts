import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { GuestPortalService } from '../guest-portal/guest-portal.service';
import { AuditService } from '../audit/audit.service';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import { GetPublicAvailabilityDto } from './dto/get-public-availability.dto';

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly guestPortal: GuestPortalService,
    private readonly audit: AuditService,
  ) {}

  async listBranches() {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        description: true,
        coverPhoto: true,
        amenities: true,
        roomTypes: {
          select: { basePrice: true },
          orderBy: { basePrice: 'asc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
    return branches.map(({ roomTypes, ...b }) => ({
      ...b,
      minPrice: roomTypes[0] ? Number(roomTypes[0].basePrice) : null,
    }));
  }

  async getBranch(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        description: true,
        coverPhoto: true,
        amenities: true,
        cancellationPolicy: true,
        isActive: true,
      },
    });
    if (!branch || !branch.isActive) throw new NotFoundException('BRANCH_NOT_FOUND');
    return branch;
  }

  async getRoomTypes(branchId: string) {
    await this.getBranch(branchId);
    return this.prisma.roomType.findMany({
      where: { branchId },
      select: {
        id: true,
        name: true,
        basePrice: true,
        maxOccupancy: true,
        description: true,
        photos: true,
        amenities: true,
        bedType: true,
        roomSize: true,
        maxAdults: true,
        maxChildren: true,
      },
      orderBy: { basePrice: 'asc' },
    });
  }

  async getAvailability(branchId: string, dto: GetPublicAvailabilityDto) {
    await this.getBranch(branchId);
    return this.availability.getAvailableRooms({
      branchId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      roomTypeId: dto.roomTypeId,
    });
  }

  async createReservation(branchId: string, dto: CreatePublicReservationDto) {
    const branch = await this.getBranch(branchId);

    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (checkIn >= checkOut) throw new BadRequestException('CHECK_OUT_MUST_BE_AFTER_CHECK_IN');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) throw new BadRequestException('CHECK_IN_MUST_BE_IN_FUTURE');

    // Find or create guest by email within branch
    let guestCreated = false;
    let guest = await this.prisma.guest.findFirst({
      where: { branchId, email: dto.guestEmail, isActive: true },
    });
    if (!guest) {
      guest = await this.prisma.guest.create({
        data: {
          branchId,
          fullName: dto.guestName,
          email: dto.guestEmail,
          phone: dto.guestPhone,
        },
      });
      guestCreated = true;
    }

    // Find first available room of requested type
    const availableRooms = await this.availability.getAvailableRooms({
      branchId,
      checkIn: dto.checkInDate,
      checkOut: dto.checkOutDate,
      roomTypeId: dto.roomTypeId,
    });

    if (!availableRooms || (availableRooms as { id: string }[]).length === 0) {
      throw new ConflictException('NO_ROOMS_AVAILABLE');
    }

    const roomsArr = availableRooms as { id: string; roomType: { basePrice: Prisma.Decimal } }[];
    const room = roomsArr[0];
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
    const totalPrice = new Prisma.Decimal(Number(room.roomType.basePrice) * nights);

    const reservation = await this.prisma.$transaction(async (tx) => {
      const available = await this.availability.isRoomAvailable(room.id, checkIn, checkOut, tx);
      if (!available) throw new ConflictException('NO_ROOMS_AVAILABLE');

      return tx.reservation.create({
        data: {
          branchId,
          roomId: room.id,
          guestId: guest.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          status: 'confirmed',
          totalPrice,
          source: 'website',
          adults: dto.adults ?? 1,
          children: dto.children ?? 0,
          notes: dto.notes ?? null,
          version: 0,
        },
        include: { room: { include: { roomType: true } } },
      });
    });

    await this.availability.invalidateAvailabilityCache(branchId);

    await this.audit.log({ userId: null, action: 'PUBLIC_RESERVATION_CREATE', entityType: 'reservation', entityId: reservation.id, branchId });
    if (guestCreated) {
      await this.audit.log({ userId: null, action: 'PUBLIC_GUEST_CREATE', entityType: 'guest', entityId: guest.id, branchId });
    }

    // Send portal link — always use the name/email from the current booking form,
    // not from the existing guest record (which may belong to a previous booking).
    const { portalUrl } = await this.guestPortal.generateAndSendPortalLink(
      reservation.id,
      guest.id,
      reservation.checkOutDate,
      dto.guestEmail,
      dto.guestName,
    );

    return {
      reservationId: reservation.id,
      branchName: branch.name,
      roomType: reservation.room.roomType.name,
      roomNumber: reservation.room.number,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      nights,
      totalPrice: Number(totalPrice),
      portalUrl,
      message: 'שלחנו אליך מייל עם קישור לניהול ההזמנה',
    };
  }
}
