import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { PaymentService } from './payment.service';
import { ChargeService } from './charge.service';
import { RefundService } from './refund.service';
import { ServiceCatalogService } from './service-catalog.service';
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
    ServiceCatalogService,
    InvoicePdfService,
    StripeProvider,
    TranzilaProvider,
    ManualProvider,
  ],
  controllers: [BillingController],
  exports: [PaymentService, InvoicePdfService],
})
export class BillingModule {}
