import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class UpsertCatalogEntryDto {
  @IsString()
  branchId!: string;

  @IsString()
  @MaxLength(100)
  chargeType!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
