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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '@prisma/client';

export class ReservationFiltersDto {
  @IsUUID()
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
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsISO8601({ strict: true })
  dateFrom!: string;

  @IsISO8601({ strict: true })
  dateTo!: string;
}
