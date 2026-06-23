import { IsOptional, IsString, IsUUID, IsInt, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterGuestsDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
