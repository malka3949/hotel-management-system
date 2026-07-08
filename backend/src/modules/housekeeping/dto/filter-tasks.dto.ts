import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { HousekeepingTaskStatus, HousekeepingPriority } from '@prisma/client';

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

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
