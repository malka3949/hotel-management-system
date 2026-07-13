import { Module } from '@nestjs/common';
import { StaffReminderService } from './staff-reminder.service';
import { StaffReminderCron } from './staff-reminder.cron';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationModule } from '../../notifications/notification.module';
import { AiModule } from '../ai.module';

@Module({
  imports: [PrismaModule, NotificationModule, AiModule],
  providers: [StaffReminderService, StaffReminderCron],
  exports: [StaffReminderService],
})
export class StaffReminderModule {}
