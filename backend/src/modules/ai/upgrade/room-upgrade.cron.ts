import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RoomUpgradeService } from './room-upgrade.service';

@Injectable()
export class RoomUpgradeCron {
  private readonly logger = new Logger(RoomUpgradeCron.name);

  constructor(private readonly upgradeService: RoomUpgradeService) {}

  @Cron('0 14 * * *')
  async handleRoomUpgrade(): Promise<void> {
    this.logger.log('Running room upgrade cron');
    await this.upgradeService.sendUpgradeOffersForAllBranches();
  }
}
