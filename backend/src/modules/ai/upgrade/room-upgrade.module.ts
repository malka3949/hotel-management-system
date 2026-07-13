import { Module } from '@nestjs/common';
import { RoomUpgradeService } from './room-upgrade.service';
import { RoomUpgradeCron } from './room-upgrade.cron';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationModule } from '../../notifications/notification.module';
import { AvailabilityModule } from '../../availability/availability.module';
import { AiModule } from '../ai.module';

@Module({
  imports: [PrismaModule, NotificationModule, AvailabilityModule, AiModule],
  providers: [RoomUpgradeService, RoomUpgradeCron],
  exports: [RoomUpgradeService],
})
export class RoomUpgradeModule {}
