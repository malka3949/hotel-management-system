import { Module } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { AuditModule } from '../audit/audit.module';
import { RoomsModule } from '../rooms/rooms.module';
import { NotificationModule } from '../notifications/notification.module';
import { HousekeepingModule } from '../housekeeping/housekeeping.module';

@Module({
  imports: [AvailabilityModule, AuditModule, RoomsModule, NotificationModule, HousekeepingModule],
  providers: [CheckInService],
  controllers: [CheckInController],
})
export class CheckInModule {}
