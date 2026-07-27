import { Module } from '@nestjs/common';
import { PublicBranchListController, PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { AvailabilityModule } from '../availability/availability.module';
import { GuestPortalModule } from '../guest-portal/guest-portal.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AvailabilityModule, GuestPortalModule, AuditModule],
  controllers: [PublicBranchListController, PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
