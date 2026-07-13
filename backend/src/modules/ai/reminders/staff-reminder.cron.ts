import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StaffReminderService } from './staff-reminder.service';

@Injectable()
export class StaffReminderCron {
  private readonly logger = new Logger(StaffReminderCron.name);

  constructor(private readonly reminderService: StaffReminderService) {}

  @Cron('0 20 * * *')
  async handleStaffReminder(): Promise<void> {
    this.logger.log('Running staff reminder cron');
    await this.reminderService.sendRemindersForAllBranches();
  }
}
