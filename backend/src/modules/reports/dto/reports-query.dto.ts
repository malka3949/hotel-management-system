import { IsOptional, IsUUID, IsDateString } from 'class-validator';

export class ReportsQueryDto {
  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
