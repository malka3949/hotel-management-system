import { IsString, IsInt, IsOptional, IsNumber, IsUUID, Min, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomTypeDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxOccupancy!: number;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;
}
