import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto, UpdateCleaningStatusDto } from './dto/update-room-status.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Prisma } from '@prisma/client';
import { RoomStatusGateway } from './room-status.gateway';

const ROOM_INCLUDE = {
  roomType: {
    select: { id: true, name: true, basePrice: true, maxOccupancy: true },
  },
} as const;

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private gateway: RoomStatusGateway,
  ) {}

  async create(dto: CreateRoomDto, requester: JwtPayload) {
    if (requester.role === 'chain_admin' && !dto.branchId) {
      throw new BadRequestException('BRANCH_ID_REQUIRED');
    }
    const branchId =
      requester.role === 'chain_admin' ? dto.branchId! : requester.branchId!;

    const existing = await this.prisma.room.findUnique({
      where: { branchId_number: { branchId, number: dto.number } },
    });
    if (existing) throw new ConflictException('ROOM_NUMBER_TAKEN');

    await this.assertRoomTypeBelongsToBranch(dto.roomTypeId, branchId);

    return this.prisma.room.create({
      data: {
        branchId,
        roomTypeId: dto.roomTypeId,
        number: dto.number,
        floor: dto.floor ?? null,
        notes: dto.notes ?? null,
      },
      include: ROOM_INCLUDE,
    });
  }

  async findAll(requester: JwtPayload, filters: FilterRoomsDto) {
    if (requester.role === 'chain_admin' && !filters.branchId) {
      throw new BadRequestException('BRANCH_ID_REQUIRED');
    }
    const branchId =
      requester.role === 'chain_admin' ? filters.branchId! : requester.branchId!;

    const where: Prisma.RoomWhereInput = {
      branchId,
      isActive: true,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.cleaningStatus ? { cleaningStatus: filters.cleaningStatus } : {}),
      ...(filters.roomTypeId ? { roomTypeId: filters.roomTypeId } : {}),
      ...(filters.floor !== undefined ? { floor: filters.floor } : {}),
      ...(filters.search
        ? { number: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };

    return this.prisma.room.findMany({
      where,
      include: ROOM_INCLUDE,
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async findOne(id: string, requester: JwtPayload) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: ROOM_INCLUDE,
    });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    this.assertBranchAccess(room.branchId, requester);
    return room;
  }

  async update(id: string, dto: UpdateRoomDto, requester: JwtPayload) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    this.assertBranchAccess(room.branchId, requester);

    if (dto.roomTypeId) {
      await this.assertRoomTypeBelongsToBranch(dto.roomTypeId, room.branchId);
    }

    if (dto.number && dto.number !== room.number) {
      const duplicate = await this.prisma.room.findUnique({
        where: { branchId_number: { branchId: room.branchId, number: dto.number } },
      });
      if (duplicate) throw new ConflictException('ROOM_NUMBER_TAKEN');
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.roomTypeId !== undefined && { roomTypeId: dto.roomTypeId }),
        ...(dto.number !== undefined && { number: dto.number }),
        ...(dto.floor !== undefined && { floor: dto.floor }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: ROOM_INCLUDE,
    });
  }

  async updateStatus(id: string, dto: UpdateRoomStatusDto, requester: JwtPayload) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    this.assertBranchAccess(room.branchId, requester);

    const updated = await this.prisma.room.update({
      where: { id },
      data: { status: dto.status },
      include: ROOM_INCLUDE,
    });

    this.gateway.emitRoomStatusUpdate(id, updated.status, updated.cleaningStatus, room.branchId);
    return updated;
  }

  async updateCleaningStatus(
    id: string,
    dto: UpdateCleaningStatusDto,
    requester: JwtPayload,
  ) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    this.assertBranchAccess(room.branchId, requester);

    const updated = await this.prisma.room.update({
      where: { id },
      data: { cleaningStatus: dto.cleaningStatus },
      include: ROOM_INCLUDE,
    });

    this.gateway.emitRoomStatusUpdate(id, updated.status, updated.cleaningStatus, room.branchId);
    return updated;
  }

  async softDelete(id: string, requester: JwtPayload) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    this.assertBranchAccess(room.branchId, requester);

    return this.prisma.room.update({
      where: { id },
      data: { isActive: false },
      include: ROOM_INCLUDE,
    });
  }

  private assertBranchAccess(roomBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && roomBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }

  private async assertRoomTypeBelongsToBranch(
    roomTypeId: string,
    branchId: string,
  ): Promise<void> {
    const rt = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, branchId },
    });
    if (!rt) throw new NotFoundException('ROOM_TYPE_NOT_FOUND');
  }
}
