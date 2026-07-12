import { Module } from '@nestjs/common';
import { GuestPortalService } from './guest-portal.service';
import { GuestPortalController } from './guest-portal.controller';
import { GuestTokenGuard, GuestPaymentTokenGuard } from './guards/guest-token.guard';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [AuditModule, NotificationModule, BillingModule],
  providers: [GuestPortalService, GuestTokenGuard, GuestPaymentTokenGuard],
  controllers: [GuestPortalController],
  exports: [GuestPortalService, GuestTokenGuard],
})
export class GuestPortalModule {}
