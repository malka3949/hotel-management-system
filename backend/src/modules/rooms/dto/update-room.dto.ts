import { IsString, IsInt, IsOptional, IsUUID, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoomDto {
  @IsUUID()
  @IsOptional()
  roomTypeId?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  number?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  @IsOptional()
  floor?: number;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
