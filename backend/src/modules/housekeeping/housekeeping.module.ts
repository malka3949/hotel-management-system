import { Module } from '@nestjs/common';
import { HousekeepingService } from './housekeeping.service';
import { HousekeepingController } from './housekeeping.controller';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [PrismaModule, AuditModule, RoomsModule],
  controllers: [HousekeepingController],
  providers: [HousekeepingService, ScheduleOptimizerService],
  exports: [HousekeepingService, ScheduleOptimizerService],
})
export class HousekeepingModule {}
