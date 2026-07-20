import { IsOptional, IsEnum, IsUUID, IsDateString, Matches } from 'class-validator';
import { HousekeepingTaskStatus, HousekeepingPriority } from '@prisma/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FilterHousekeepingTasksDto {
  @IsEnum(HousekeepingTaskStatus)
  @IsOptional()
  status?: HousekeepingTaskStatus;

  @IsEnum(HousekeepingPriority)
  @IsOptional()
  priority?: HousekeepingPriority;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
  @IsOptional()
  branchId?: string;
}
