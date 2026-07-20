import {
  IsString,
  IsEmail,
  IsISO8601,
  IsInt,
  IsOptional,
  IsBoolean,
  Equals,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreatePublicReservationDto {
  @IsString()
  @MaxLength(200)
  guestName!: string;

  @IsEmail()
  guestEmail!: string;

  @IsString()
  @MaxLength(30)
  guestPhone!: string;

  @Matches(UUID_RE, { message: 'roomTypeId must be a UUID' })
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

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @Equals(true, { message: 'חובה לאשר את מדיניות הפרטיות' })
  consentGiven!: boolean;
}
