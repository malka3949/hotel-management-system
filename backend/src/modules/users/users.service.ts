import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  branchId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: false,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        branchId: dto.branchId ?? null,
      },
      select: USER_SELECT,
    });

    return user;
  }

  async findAll(requester: JwtPayload) {
    const where =
      requester.role === 'chain_admin'
        ? {}
        : { branchId: requester.branchId };

    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, requester: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    if (
      requester.role !== 'chain_admin' &&
      user.branchId !== requester.branchId
    ) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }

    const updated = await this.prisma.user.update({
      where: {
        id,
        ...(requester.role !== 'chain_admin' && { branchId: requester.branchId }),
      },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: USER_SELECT,
    });

    if (dto.isActive !== undefined && dto.isActive !== user.isActive) {
      await this.audit.log({
        userId: requester.sub,
        action: 'USER_STATUS_CHANGE',
        entityType: 'user',
        entityId: id,
        metadata: { isActive: dto.isActive },
        branchId: user.branchId,
      });
    } else if (dto.name !== undefined) {
      await this.audit.log({
        userId: requester.sub,
        action: 'USER_UPDATE',
        entityType: 'user',
        entityId: id,
        branchId: user.branchId,
      });
    }

    return updated;
  }
}
