import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogEntry {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonObject;
  branchId: string | null;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? {},
        branchId: entry.branchId,
      },
    });
  }
}
