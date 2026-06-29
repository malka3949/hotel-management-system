import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateRefundDto {
  @IsUUID()
  @IsNotEmpty()
  paymentId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @MinLength(10)
  reason!: string;
}
