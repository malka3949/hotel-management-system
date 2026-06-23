import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { RoomStatus, CleaningStatus } from '@prisma/client';
import { Type } from 'class-transformer';

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

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
