import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  roomTypeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string;

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
