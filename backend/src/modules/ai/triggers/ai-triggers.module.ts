import { Module } from '@nestjs/common';
import { AiTriggersController } from './ai-triggers.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DailyDigestModule } from '../digest/daily-digest.module';
import { StaffReminderModule } from '../reminders/staff-reminder.module';
import { RoomUpgradeModule } from '../upgrade/room-upgrade.module';

@Module({
  imports: [PrismaModule, DailyDigestModule, StaffReminderModule, RoomUpgradeModule],
  controllers: [AiTriggersController],
})
export class AiTriggersModule {}
