import { IsString, IsInt, IsOptional, IsNumber, IsArray, IsUrl, Min, MinLength, MaxLength, ArrayMaxSize } from 'class-validator';
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
