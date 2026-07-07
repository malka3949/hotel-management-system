import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { FilterGuestsDto } from './dto/filter-guests.dto';
import { CreateGuestDocumentDto } from './dto/create-guest-document.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Prisma } from '@prisma/client';

const GUEST_SELECT = {
  id: true,
  branchId: true,
  fullName: true,
  email: true,
  phone: true,
  passportId: true,
  nationality: true,
  dateOfBirth: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class GuestsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateGuestDto, requester: JwtPayload) {
    if (requester.role === 'chain_admin' && !dto.branchId) {
      throw new BadRequestException('BRANCH_ID_REQUIRED');
    }
    const branchId =
      requester.role === 'chain_admin' ? dto.branchId! : requester.branchId!;

    await this.assertNoDuplicate(branchId, dto.email, dto.passportId);

    const guest = await this.prisma.guest.create({
      data: {
        branchId,
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone,
        passportId: dto.passportId ?? null,
        nationality: dto.nationality ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        notes: dto.notes ?? null,
      },
      select: GUEST_SELECT,
    });
    await this.audit.log({ userId: requester.sub, action: 'GUEST_CREATE', entityType: 'guest', entityId: guest.id, branchId: guest.branchId });
    return guest;
  }

  async findAll(requester: JwtPayload, filters: FilterGuestsDto, ipAddress?: string, userAgent?: string) {
    if (requester.role === 'chain_admin' && !filters.branchId) {
      throw new BadRequestException('BRANCH_ID_REQUIRED');
    }
    const branchId =
      requester.role === 'chain_admin' ? filters.branchId! : requester.branchId!;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GuestWhereInput = {
      branchId,
      isActive: true,
      ...(filters.search
        ? {
            OR: [
              { fullName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { phone: { startsWith: filters.search } },
              { passportId: { startsWith: filters.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.guest.findMany({
        where,
        select: GUEST_SELECT,
        orderBy: { fullName: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.guest.count({ where }),
    ]);

    await this.audit.log({
      userId: requester.sub,
      action: 'GUEST_LIST',
      entityType: 'guest',
      branchId,
      metadata: { resultCount: total, page, limit },
      ipAddress,
      userAgent,
    });

    return { items, total, page, limit };
  }

  async search(q: string, requester: JwtPayload, branchId?: string, ipAddress?: string, userAgent?: string) {
    const effectiveBranchId =
      requester.role === 'chain_admin' ? branchId : requester.branchId;

    if (!effectiveBranchId) {
      throw new BadRequestException('BRANCH_ID_REQUIRED');
    }

    // Use raw query for pg_trgm similarity on name + prefix match on phone/email/passportId
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        full_name: string;
        email: string | null;
        phone: string;
        passport_id: string | null;
        nationality: string | null;
      }>
    >`
      SELECT id, full_name, email, phone, passport_id, nationality
      FROM guests
      WHERE branch_id = ${effectiveBranchId}
        AND is_active = true
        AND (
          full_name ILIKE ${'%' + q + '%'}
          OR phone LIKE ${q + '%'}
          OR email ILIKE ${'%' + q + '%'}
          OR passport_id ILIKE ${q + '%'}
        )
      ORDER BY full_name ASC
      LIMIT 10
    `;

    const mapped = results.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      passportId: r.passport_id,
      nationality: r.nationality,
    }));

    await this.audit.log({
      userId: requester.sub,
      action: 'GUEST_SEARCH',
      entityType: 'guest',
      branchId: effectiveBranchId,
      metadata: { resultCount: mapped.length },
      ipAddress,
      userAgent,
    });

    return mapped;
  }

  async findOne(id: string, requester: JwtPayload, ipAddress?: string, userAgent?: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id, isActive: true },
      select: GUEST_SELECT,
    });
    if (!guest) throw new NotFoundException('GUEST_NOT_FOUND');
    this.assertBranchAccess(guest.branchId, requester);
    await this.audit.log({ userId: requester.sub, action: 'GUEST_READ', entityType: 'guest', entityId: guest.id, branchId: guest.branchId, ipAddress, userAgent });
    return guest;
  }

  async update(id: string, dto: UpdateGuestDto, requester: JwtPayload, ipAddress?: string, userAgent?: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      select: { id: true, branchId: true, email: true, passportId: true, fullName: true, phone: true, nationality: true, dateOfBirth: true, notes: true },
    });
    if (!guest) throw new NotFoundException('GUEST_NOT_FOUND');
    this.assertBranchAccess(guest.branchId, requester);

    const newEmail = dto.email !== undefined ? dto.email : guest.email ?? undefined;
    const newPassportId = dto.passportId !== undefined ? dto.passportId : guest.passportId ?? undefined;
    await this.assertNoDuplicate(guest.branchId, newEmail, newPassportId, id);

    const updated = await this.prisma.guest.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.passportId !== undefined ? { passportId: dto.passportId ?? null } : {}),
        ...(dto.nationality !== undefined ? { nationality: dto.nationality ?? null } : {}),
        ...(dto.dateOfBirth !== undefined
          ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
      },
      select: GUEST_SELECT,
    });

    const changedFields = (Object.keys(dto) as Array<keyof UpdateGuestDto>).reduce<
      Record<string, { before: unknown; after: unknown }>
    >((acc, key) => {
      if (dto[key] !== undefined) {
        acc[key] = { before: (guest as Record<string, unknown>)[key] ?? null, after: dto[key] ?? null };
      }
      return acc;
    }, {});

    await this.audit.log({
      userId: requester.sub,
      action: 'GUEST_UPDATE',
      entityType: 'guest',
      entityId: updated.id,
      branchId: updated.branchId,
      metadata: { changes: changedFields } as Prisma.InputJsonObject,
      ipAddress,
      userAgent,
    });
    return updated;
  }

  async softDelete(id: string, requester: JwtPayload, ipAddress?: string, userAgent?: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!guest) throw new NotFoundException('GUEST_NOT_FOUND');
    this.assertBranchAccess(guest.branchId, requester);

    await this.prisma.$transaction([
      // Anonymize PII on the guest row — right to erasure (Amendment 13 §14)
      this.prisma.guest.update({
        where: { id },
        data: {
          isActive: false,
          fullName: '[deleted]',
          email: null,
          phone: '[deleted]',
          passportId: null,
          dateOfBirth: null,
          nationality: null,
          notes: null,
        },
      }),
      // Erase PII copies in child tables
      this.prisma.onlineCheckIn.deleteMany({ where: { guestId: id } }),
      this.prisma.guestDocument.updateMany({
        where: { guestId: id },
        data: { documentNumber: '[deleted]', issuingCountry: '[deleted]' },
      }),
    ]);

    await this.audit.log({
      userId: requester.sub,
      action: 'GUEST_DELETE',
      entityType: 'guest',
      entityId: id,
      branchId: guest.branchId,
      metadata: { anonymized: true },
      ipAddress,
      userAgent,
    });

    return { id, anonymized: true };
  }

  async addDocument(guestId: string, dto: CreateGuestDocumentDto, requester: JwtPayload, ipAddress?: string, userAgent?: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId }, select: { id: true, branchId: true } });
    if (!guest) throw new NotFoundException('GUEST_NOT_FOUND');
    this.assertBranchAccess(guest.branchId, requester);

    const doc = await this.prisma.guestDocument.create({
      data: {
        guestId,
        branchId: guest.branchId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        issuingCountry: dto.issuingCountry,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        recordedAt: new Date(dto.recordedAt),
        recordedBy: requester.sub,
      },
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'GUEST_DOCUMENT_CREATE',
      entityType: 'guestDocument',
      entityId: guestId,
      branchId: guest.branchId,
      metadata: { documentType: dto.documentType },
      ipAddress,
      userAgent,
    });

    return doc;
  }

  async getDocuments(guestId: string, requester: JwtPayload, ipAddress?: string, userAgent?: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId }, select: { id: true, branchId: true } });
    if (!guest) throw new NotFoundException('GUEST_NOT_FOUND');
    this.assertBranchAccess(guest.branchId, requester);

    const docs = await this.prisma.guestDocument.findMany({
      where: { guestId },
      orderBy: { createdAt: 'desc' },
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'GUEST_DOCUMENT_READ',
      entityType: 'guestDocument',
      entityId: guestId,
      branchId: guest.branchId,
      ipAddress,
      userAgent,
    });

    return docs;
  }

  private assertBranchAccess(guestBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && guestBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }

  private async assertNoDuplicate(
    branchId: string,
    email?: string | null,
    passportId?: string | null,
    excludeId?: string,
  ): Promise<void> {
    if (email) {
      const existing = await this.prisma.guest.findFirst({
        where: { branchId, email, isActive: true, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      if (existing) throw new ConflictException('DUPLICATE_GUEST_EMAIL');
    }
    if (passportId) {
      const existing = await this.prisma.guest.findFirst({
        where: { branchId, passportId, isActive: true, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      if (existing) throw new ConflictException('DUPLICATE_GUEST_PASSPORT');
    }
  }
}
