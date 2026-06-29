import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ChargeType } from '@prisma/client';

export class CreateChargeDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;

  @IsEnum(ChargeType)
  chargeType!: ChargeType;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;
}
