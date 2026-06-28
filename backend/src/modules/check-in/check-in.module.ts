import { Module } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { AuditModule } from '../audit/audit.module';
import { RoomsModule } from '../rooms/rooms.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [AvailabilityModule, AuditModule, RoomsModule, NotificationModule],
  providers: [CheckInService],
  controllers: [CheckInController],
})
export class CheckInModule {}
