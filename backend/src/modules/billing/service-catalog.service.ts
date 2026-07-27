import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ServiceCatalogService {
  constructor(private prisma: PrismaService) {}

  async getCatalog(branchId: string, requester: JwtPayload) {
    this.assertBranchAccess(branchId, requester);
    return this.prisma.serviceCatalogEntry.findMany({
      where: { branchId },
      orderBy: { chargeType: 'asc' },
    });
  }

  async upsertEntry(
    branchId: string,
    chargeType: string,
    price: number,
    requester: JwtPayload,
  ) {
    this.assertBranchAccess(branchId, requester);
    this.assertManagerRole(requester);

    if (price <= 0) throw new BadRequestException('PRICE_MUST_BE_POSITIVE');

    return this.prisma.serviceCatalogEntry.upsert({
      where: { branchId_chargeType: { branchId, chargeType: chargeType as never } },
      create: {
        branchId,
        chargeType: chargeType as never,
        price: new Prisma.Decimal(price),
        isActive: true,
      },
      update: {
        price: new Prisma.Decimal(price),
        isActive: true,
      },
    });
  }

  async deleteEntry(id: string, requester: JwtPayload) {
    const entry = await this.prisma.serviceCatalogEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('CATALOG_ENTRY_NOT_FOUND');
    this.assertBranchAccess(entry.branchId, requester);
    this.assertManagerRole(requester);
    await this.prisma.serviceCatalogEntry.delete({ where: { id } });
  }

  private assertBranchAccess(branchId: string, requester: JwtPayload) {
    if (requester.role !== 'chain_admin' && requester.branchId !== branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }

  private assertManagerRole(requester: JwtPayload) {
    if (requester.role !== 'chain_admin' && requester.role !== 'hotel_manager') {
      throw new ForbiddenException('MANAGER_ROLE_REQUIRED');
    }
  }
}
