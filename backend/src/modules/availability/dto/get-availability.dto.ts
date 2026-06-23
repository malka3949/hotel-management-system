import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetAvailabilityDto {
  @IsUUID()
  branchId!: string;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @IsOptional()
  floor?: number;

  @IsOptional()
  maxOccupancy?: number;
}
