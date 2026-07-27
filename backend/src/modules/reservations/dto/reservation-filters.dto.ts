import {
  IsOptional,
  IsEnum,
  IsISO8601,
  IsUUID,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '@prisma/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReservationFiltersDto {
  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
  @IsOptional()
  branchId?: string;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsISO8601({ strict: true })
  @IsOptional()
  dateFrom?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  dateTo?: string;

  @IsUUID()
  @IsOptional()
  roomTypeId?: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsUUID()
  @IsOptional()
  guestId?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class CalendarFiltersDto {
  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
  @IsOptional()
  branchId?: string;

  @IsISO8601({ strict: true })
  dateFrom!: string;

  @IsISO8601({ strict: true })
  dateTo!: string;
}
