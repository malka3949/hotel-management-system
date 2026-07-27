import {
  IsUUID,
  IsISO8601,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ReservationSourceDto {
  walk_in = 'walk_in',
  phone = 'phone',
  website = 'website',
  ota = 'ota',
}

export class CreateReservationDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  roomId!: string;

  @IsUUID()
  guestId!: string;

  @IsISO8601({ strict: true })
  checkInDate!: string;

  @IsISO8601({ strict: true })
  checkOutDate!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  adults?: number;

  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  children?: number;

  @IsEnum(ReservationSourceDto)
  @IsOptional()
  source?: ReservationSourceDto;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
