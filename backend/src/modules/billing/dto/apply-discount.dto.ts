import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ApplyDiscountDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
