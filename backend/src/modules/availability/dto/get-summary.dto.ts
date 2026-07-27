import { IsDateString, Matches } from 'class-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GetSummaryDto {
  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
  branchId!: string;

  @IsDateString()
  date!: string;
}
