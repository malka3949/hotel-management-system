import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, HousekeepingPriority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomStatusGateway } from '../rooms/room-status.gateway';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateHousekeepingTaskDto } from './dto/create-task.dto';
import { AssignHousekeepingTaskDto } from './dto/assign-task.dto';
import { SkipHousekeepingTaskDto } from './dto/skip-task.dto';
import { FilterHousekeepingTasksDto } from './dto/filter-tasks.dto';

const TASK_INCLUDE = {
  room: { select: { id: true, number: true, floor: true, cleaningStatus: true } },
  assignee: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true } },
  reservation: { select: { id: true, checkInDate: true, checkOutDate: true } },
} as const;

@Injectable()
export class HousekeepingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private roomStatusGateway: RoomStatusGateway,
  ) {}

  async getTasks(query: FilterHousekeepingTasksDto, requester: JwtPayload) {
    const branchId = this.resolveBranchId(query.branchId, requester);

    const where: Prisma.HousekeepingTaskWhereInput = { branchId };

    if (requester.role === 'housekeeping') {
      where.assignedTo = requester.sub;
    } else if (query.assignedTo) {
      where.assignedTo = query.assignedTo;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.roomId) where.roomId = query.roomId;
    if (query.scheduledFor) {
      const day = new Date(query.scheduledFor);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.scheduledFor = { gte: day, lt: next };
    }

    return this.prisma.housekeepingTask.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createTask(dto: CreateHousekeepingTaskDto, requester: JwtPayload) {
    this.requireManagerOrAbove(requester);
    const branchId = this.requireBranchId(requester);

    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room || room.branchId !== branchId) throw new NotFoundException('ROOM_NOT_FOUND');

    const task = await this.prisma.housekeepingTask.create({
      data: {
        branchId,
        roomId: dto.roomId,
        reservationId: dto.reservationId ?? null,
        assignedTo: dto.assignedTo ?? null,
        priority: dto.priority ?? 'normal',
        scheduledFor: new Date(dto.scheduledFor),
        notes: dto.notes ?? null,
        createdBy: requester.sub,
      },
      include: TASK_INCLUDE,
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'HOUSEKEEPING_TASK_CREATED',
      entityType: 'housekeeping_task',
      entityId: task.id,
      branchId,
    });

    return task;
  }

  async createTaskInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      branchId: string;
      roomId: string;
      reservationId: string;
      priority: HousekeepingPriority;
      scheduledFor: Date;
      createdBy: string | null;
    },
  ) {
    return tx.housekeepingTask.create({ data });
  }

  async assignTask(id: string, dto: AssignHousekeepingTaskDto, requester: JwtPayload) {
    this.requireManagerOrAbove(requester);
    const task = await this.findTaskInBranch(id, requester);

    const assignee = await this.prisma.user.findUnique({ where: { id: dto.assignedTo } });
    if (!assignee || assignee.branchId !== task.branchId) {
      throw new BadRequestException('ASSIGNEE_NOT_IN_BRANCH');
    }
    if (assignee.role !== 'housekeeping') {
      throw new BadRequestException('ASSIGNEE_MUST_BE_HOUSEKEEPING_ROLE');
    }

    const updated = await this.prisma.housekeepingTask.update({
      where: { id },
      data: { assignedTo: dto.assignedTo },
      include: TASK_INCLUDE,
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'HOUSEKEEPING_TASK_ASSIGNED',
      entityType: 'housekeeping_task',
      entityId: id,
      branchId: task.branchId,
      metadata: { assignedTo: dto.assignedTo },
    });

    this.roomStatusGateway.emitHousekeepingTaskUpdated(
      { ...updated, room: updated.room, assignee: updated.assignee },
      task.branchId,
    );

    return updated;
  }

  async startTask(id: string, requester: JwtPayload) {
    const task = await this.findTaskInBranch(id, requester);

    if (requester.role === 'housekeeping' && task.assignedTo !== requester.sub) {
      throw new ForbiddenException('NOT_YOUR_TASK');
    }

    if (task.status !== 'pending') {
      throw new BadRequestException('TASK_MUST_BE_PENDING');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.housekeepingTask.update({
        where: { id },
        data: { status: 'in_progress', startedAt: new Date() },
        include: TASK_INCLUDE,
      });

      await tx.room.update({
        where: { id: task.roomId },
        data: { cleaningStatus: 'in_progress' },
      });

      return t;
    });

    this.roomStatusGateway.emitRoomStatusUpdate(
      task.roomId,
      task.room.status,
      'in_progress',
      task.branchId,
    );
    this.roomStatusGateway.emitHousekeepingTaskUpdated(updated, task.branchId);

    await this.audit.log({
      userId: requester.sub,
      action: 'HOUSEKEEPING_TASK_STARTED',
      entityType: 'housekeeping_task',
      entityId: id,
      branchId: task.branchId,
    });

    return updated;
  }

  async completeTask(id: string, requester: JwtPayload) {
    const task = await this.findTaskInBranch(id, requester);

    if (requester.role === 'housekeeping' && task.assignedTo !== requester.sub) {
      throw new ForbiddenException('NOT_YOUR_TASK');
    }

    if (task.status !== 'in_progress') {
      throw new BadRequestException('TASK_MUST_BE_IN_PROGRESS');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.housekeepingTask.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date() },
        include: TASK_INCLUDE,
      });

      await tx.room.update({
        where: { id: task.roomId },
        data: { cleaningStatus: 'clean', status: 'available' },
      });

      return t;
    });

    this.roomStatusGateway.emitRoomStatusUpdate(
      task.roomId,
      'available',
      'clean',
      task.branchId,
    );
    this.roomStatusGateway.emitHousekeepingTaskUpdated(updated, task.branchId);

    await this.audit.log({
      userId: requester.sub,
      action: 'HOUSEKEEPING_TASK_COMPLETED',
      entityType: 'housekeeping_task',
      entityId: id,
      branchId: task.branchId,
    });

    return updated;
  }

  async skipTask(id: string, dto: SkipHousekeepingTaskDto, requester: JwtPayload) {
    this.requireManagerOrAbove(requester);
    const task = await this.findTaskInBranch(id, requester);

    if (task.status === 'completed' || task.status === 'skipped') {
      throw new BadRequestException('TASK_ALREADY_TERMINAL');
    }

    const updated = await this.prisma.housekeepingTask.update({
      where: { id },
      data: { status: 'skipped', notes: dto.reason },
      include: TASK_INCLUDE,
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'HOUSEKEEPING_TASK_SKIPPED',
      entityType: 'housekeeping_task',
      entityId: id,
      branchId: task.branchId,
      metadata: { reason: dto.reason },
    });

    this.roomStatusGateway.emitHousekeepingTaskUpdated(updated, task.branchId);

    return updated;
  }

  private async findTaskInBranch(id: string, requester: JwtPayload) {
    const task = await this.prisma.housekeepingTask.findUnique({
      where: { id },
      include: { room: { select: { id: true, number: true, floor: true, status: true, cleaningStatus: true } } },
    });
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
    this.assertBranchAccess(task.branchId, requester);
    return task;
  }

  private resolveBranchId(provided: string | undefined, requester: JwtPayload): string {
    if (requester.role === 'chain_admin') {
      if (!provided) throw new BadRequestException('BRANCH_ID_REQUIRED');
      return provided;
    }
    if (!requester.branchId) throw new ForbiddenException('NO_BRANCH_ASSIGNED');
    return requester.branchId;
  }

  private requireBranchId(requester: JwtPayload): string {
    if (requester.role !== 'chain_admin') {
      if (!requester.branchId) throw new ForbiddenException('NO_BRANCH_ASSIGNED');
      return requester.branchId;
    }
    throw new BadRequestException('BRANCH_ID_REQUIRED_IN_BODY_FOR_ADMIN');
  }

  private assertBranchAccess(entityBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && entityBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }

  private requireManagerOrAbove(requester: JwtPayload): void {
    if (requester.role === 'housekeeping' || requester.role === 'receptionist') {
      throw new ForbiddenException('MANAGER_ROLE_REQUIRED');
    }
  }
}
