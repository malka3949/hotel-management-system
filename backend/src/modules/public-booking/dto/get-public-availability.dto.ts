import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class GetPublicAvailabilityDto {
  @IsISO8601({ strict: true })
  checkIn!: string;

  @IsISO8601({ strict: true })
  checkOut!: string;

  @IsUUID()
  @IsOptional()
  roomTypeId?: string;
}
