import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentMethod, PaymentProvider } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
