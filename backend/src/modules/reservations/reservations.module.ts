import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { CancellationRiskService } from './services/cancellation-risk.service';
import { AvailabilityModule } from '../availability/availability.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { GuestPortalModule } from '../guest-portal/guest-portal.module';

@Module({
  imports: [AvailabilityModule, AuditModule, NotificationModule, GuestPortalModule],
  providers: [ReservationsService, CancellationRiskService],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}
