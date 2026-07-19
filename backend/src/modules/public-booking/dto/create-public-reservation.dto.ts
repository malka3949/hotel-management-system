import {
  IsString,
  IsEmail,
  IsUUID,
  IsISO8601,
  IsInt,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePublicReservationDto {
  @IsString()
  @MaxLength(200)
  guestName!: string;

  @IsEmail()
  guestEmail!: string;

  @IsString()
  @MaxLength(30)
  guestPhone!: string;

  @IsUUID()
  roomTypeId!: string;

  @IsISO8601({ strict: true })
  checkInDate!: string;

  @IsISO8601({ strict: true })
  checkOutDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  adults?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  children?: number = 0;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
