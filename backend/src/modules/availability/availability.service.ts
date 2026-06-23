import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';

export interface OccupancySummary {
  total: number;
  occupied: number;
  available: number;
  dirty: number;
  maintenance: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  /**
   * Called inside a Prisma transaction from Phase 5 ReservationsService.
   * Uses SELECT FOR UPDATE to prevent concurrent overbooking.
   */
  async isRoomAvailable(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<boolean> {
    if (checkIn >= checkOut) throw new BadRequestException('CHECK_IN_MUST_BE_BEFORE_CHECK_OUT');

    const client = tx ?? this.prisma;

    // SELECT FOR UPDATE — locks the room's reservation rows for the duration of the tx
    const conflicts = await (client as PrismaService).$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM reservations
      WHERE room_id = ${roomId}
        AND status NOT IN ('cancelled', 'no_show')
        AND check_in_date  < ${checkOut}::date
        AND check_out_date > ${checkIn}::date
      FOR UPDATE
    `;

    return BigInt(conflicts[0]?.count ?? 0) === 0n;
  }

  async getAvailableRooms(dto: GetAvailabilityDto) {
    const { branchId, checkIn, checkOut, roomTypeId, floor, maxOccupancy } = dto;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      throw new BadRequestException('CHECK_IN_MUST_BE_BEFORE_CHECK_OUT');
    }

    const cacheKey = `availability:${branchId}:${checkIn}:${checkOut}:${roomTypeId ?? 'any'}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const rooms = await this.prisma.room.findMany({
      where: {
        branchId,
        isActive: true,
        status: { notIn: ['maintenance', 'out_of_order'] },
        ...(roomTypeId ? { roomTypeId } : {}),
        ...(floor !== undefined ? { floor } : {}),
        ...(maxOccupancy
          ? { roomType: { maxOccupancy: { gte: maxOccupancy } } }
          : {}),
        reservations: {
          none: {
            status: { notIn: ['cancelled', 'no_show'] },
            checkInDate: { lt: checkOutDate },
            checkOutDate: { gt: checkInDate },
          },
        },
      },
      include: {
        roomType: {
          select: { id: true, name: true, basePrice: true, maxOccupancy: true },
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    await this.cache.set(cacheKey, rooms, 30000);
    return rooms;
  }

  async getOccupancySummary(branchId: string, date: string): Promise<OccupancySummary> {
    const targetDate = new Date(date);

    const [total, maintenance, dirty, occupiedCount] = await Promise.all([
      this.prisma.room.count({ where: { branchId, isActive: true } }),
      this.prisma.room.count({
        where: { branchId, isActive: true, status: { in: ['maintenance', 'out_of_order'] } },
      }),
      this.prisma.room.count({
        where: { branchId, isActive: true, cleaningStatus: { in: ['dirty', 'in_progress'] } },
      }),
      this.prisma.reservation.count({
        where: {
          branchId,
          status: { in: ['confirmed', 'checked_in'] },
          checkInDate: { lte: targetDate },
          checkOutDate: { gt: targetDate },
        },
      }),
    ]);

    return {
      total,
      occupied: occupiedCount,
      available: total - occupiedCount - maintenance,
      dirty,
      maintenance,
    };
  }

  async invalidateAvailabilityCache(branchId: string): Promise<void> {
    // cache-manager v7 doesn't support key-pattern deletion without a Redis adapter.
    // We clear the entire cache — acceptable given the 30s TTL.
    await this.cache.clear();
    void branchId; // reserved for future pattern-based invalidation
  }
}
