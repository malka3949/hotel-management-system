import { IsOptional, IsString, IsInt, Min, Max, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FilterGuestsDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
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
