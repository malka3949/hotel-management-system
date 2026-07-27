import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckOutDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
