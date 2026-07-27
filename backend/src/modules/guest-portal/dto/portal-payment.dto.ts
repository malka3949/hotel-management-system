import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { PaymentMethod, PaymentProvider } from '@prisma/client';

export class PortalPaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
