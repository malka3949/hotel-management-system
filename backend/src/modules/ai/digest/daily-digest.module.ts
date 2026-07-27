import { Module } from '@nestjs/common';
import { DailyDigestService } from './daily-digest.service';
import { DailyDigestCron } from './daily-digest.cron';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationModule } from '../../notifications/notification.module';
import { AiModule } from '../ai.module';

@Module({
  imports: [PrismaModule, NotificationModule, AiModule],
  providers: [DailyDigestService, DailyDigestCron],
  exports: [DailyDigestService],
})
export class DailyDigestModule {}
