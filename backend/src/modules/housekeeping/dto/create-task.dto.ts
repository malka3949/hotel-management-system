import { IsUUID, IsOptional, IsEnum, IsDateString, IsString, MaxLength } from 'class-validator';
import { HousekeepingPriority } from '@prisma/client';

export class CreateHousekeepingTaskDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  roomId!: string;

  @IsUUID()
  @IsOptional()
  reservationId?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(HousekeepingPriority)
  @IsOptional()
  priority?: HousekeepingPriority;

  @IsDateString()
  scheduledFor!: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
