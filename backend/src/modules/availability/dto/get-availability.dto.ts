import { IsDateString, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GetAvailabilityDto {
  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
  branchId!: string;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  floor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxOccupancy?: number;
}
