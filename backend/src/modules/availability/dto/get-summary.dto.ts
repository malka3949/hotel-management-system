import { IsDateString, IsUUID } from 'class-validator';

export class GetSummaryDto {
  @IsUUID()
  branchId!: string;

  @IsDateString()
  date!: string;
}
