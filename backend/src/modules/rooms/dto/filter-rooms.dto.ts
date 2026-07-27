import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, Matches } from 'class-validator';
import { RoomStatus, CleaningStatus } from '@prisma/client';
import { Type } from 'class-transformer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FilterRoomsDto {
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @IsEnum(CleaningStatus)
  @IsOptional()
  cleaningStatus?: CleaningStatus;

  @IsUUID()
  @IsOptional()
  roomTypeId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  floor?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
  @IsOptional()
  branchId?: string;
}
