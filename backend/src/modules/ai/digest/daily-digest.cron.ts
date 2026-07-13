import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyDigestService } from './daily-digest.service';

@Injectable()
export class DailyDigestCron {
  private readonly logger = new Logger(DailyDigestCron.name);

  constructor(private readonly digestService: DailyDigestService) {}

  @Cron('0 8 * * *')
  async handleDailyDigest(): Promise<void> {
    this.logger.log('Running daily digest cron');
    await this.digestService.sendDigestForAllBranches();
  }
}
