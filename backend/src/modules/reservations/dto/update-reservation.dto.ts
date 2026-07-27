import {
  IsUUID,
  IsISO8601,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ReservationSourceDto } from './create-reservation.dto';

export class UpdateReservationDto {
  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsUUID()
  @IsOptional()
  guestId?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  checkInDate?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  checkOutDate?: string;

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
