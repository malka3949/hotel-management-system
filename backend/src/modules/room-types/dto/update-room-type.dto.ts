import { IsString, IsInt, IsOptional, IsNumber, Min, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoomTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxOccupancy?: number;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;
}
