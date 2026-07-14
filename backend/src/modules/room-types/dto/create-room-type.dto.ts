import { IsString, IsInt, IsOptional, IsNumber, IsUUID, IsArray, IsUrl, Min, MinLength, MaxLength, ArrayMaxSize } from 'class-validator';
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

  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(5)
  @IsOptional()
  photos?: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  amenities?: string[];

  @IsString()
  @MaxLength(50)
  @IsOptional()
  bedType?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  roomSize?: number;
}
