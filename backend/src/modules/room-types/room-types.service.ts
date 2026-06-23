import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoomTypeDto, requester: JwtPayload) {
    if (requester.role === 'chain_admin' && !dto.branchId) {
      throw new BadRequestException('BRANCH_ID_REQUIRED');
    }
    const branchId =
      requester.role === 'chain_admin' ? dto.branchId! : requester.branchId!;
    return this.prisma.roomType.create({
      data: {
        branchId,
        name: dto.name,
        basePrice: dto.basePrice,
        maxOccupancy: dto.maxOccupancy,
        description: dto.description ?? null,
      },
    });
  }

  async findAll(requester: JwtPayload, branchId?: string) {
    const where =
      requester.role === 'chain_admin'
        ? branchId ? { branchId } : {}
        : { branchId: requester.branchId! };

    return this.prisma.roomType.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateRoomTypeDto, requester: JwtPayload) {
    await this.assertAccess(id, requester);
    return this.prisma.roomType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.maxOccupancy !== undefined ? { maxOccupancy: dto.maxOccupancy } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
      },
    });
  }

  async remove(id: string, requester: JwtPayload) {
    await this.assertAccess(id, requester);
    const roomCount = await this.prisma.room.count({ where: { roomTypeId: id, isActive: true } });
    if (roomCount > 0) throw new ConflictException('ROOM_TYPE_HAS_ACTIVE_ROOMS');
    return this.prisma.roomType.delete({ where: { id } });
  }

  async assertBelongsToBranch(id: string, branchId: string): Promise<void> {
    const rt = await this.prisma.roomType.findFirst({ where: { id, branchId } });
    if (!rt) throw new NotFoundException('ROOM_TYPE_NOT_FOUND');
  }

  private async assertAccess(id: string, requester: JwtPayload) {
    const where =
      requester.role === 'chain_admin'
        ? { id }
        : { id, branchId: requester.branchId! };
    const rt = await this.prisma.roomType.findFirst({ where });
    if (!rt) throw new NotFoundException('ROOM_TYPE_NOT_FOUND');
    return rt;
  }
}
