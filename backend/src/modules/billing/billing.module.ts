import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { PaymentService } from './payment.service';
import { ChargeService } from './charge.service';
import { RefundService } from './refund.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';
import { StripeProvider } from './providers/stripe.provider';
import { TranzilaProvider } from './providers/tranzila.provider';
import { ManualProvider } from './providers/manual.provider';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [
    PaymentService,
    ChargeService,
    RefundService,
    InvoicePdfService,
    StripeProvider,
    TranzilaProvider,
    ManualProvider,
  ],
  controllers: [BillingController],
})
export class BillingModule {}
