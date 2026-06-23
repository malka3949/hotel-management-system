import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        address: dto.address,
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });
  }

  async findAll(requester: JwtPayload) {
    const where =
      requester.role === 'chain_admin'
        ? {}
        : { id: requester.branchId ?? undefined };

    return this.prisma.branch.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.assertExists(id);
    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
      },
    });
  }

  async assignUser(branchId: string, userId: string) {
    await this.assertExists(branchId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    return this.prisma.user.update({
      where: { id: userId },
      data: { branchId },
      select: { id: true, name: true, email: true, role: true, branchId: true },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('BRANCH_NOT_FOUND');
  }
}
