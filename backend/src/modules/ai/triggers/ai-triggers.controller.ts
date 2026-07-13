import { Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { DailyDigestService } from '../digest/daily-digest.service';
import { StaffReminderService } from '../reminders/staff-reminder.service';
import { RoomUpgradeService } from '../upgrade/room-upgrade.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('chain_admin', 'hotel_manager')
@Controller('v1/ai/trigger')
export class AiTriggersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly digestService: DailyDigestService,
    private readonly reminderService: StaffReminderService,
    private readonly upgradeService: RoomUpgradeService,
  ) {}

  private async resolveBranch(user: JwtPayload): Promise<{ id: string; name: string } | null> {
    if (!user.branchId) return null;
    const branch = await this.prisma.branch.findUnique({
      where: { id: user.branchId },
      select: { id: true, name: true },
    });
    return branch;
  }

  private async resolveManagerBranch(user: JwtPayload) {
    const branch = await this.resolveBranch(user);
    if (!branch) throw new ForbiddenException('NO_BRANCH_ASSIGNED');
    return branch;
  }

  @Post('digest')
  async triggerDigest(@CurrentUser() user: JwtPayload) {
    if (user.role === 'chain_admin') {
      await this.digestService.sendDigestForAllBranches();
    } else {
      const branch = await this.resolveManagerBranch(user);
      await this.digestService.sendDigestForBranch(branch.id, branch.name);
    }
    return { sent: true };
  }

  @Post('reminders')
  async triggerReminders(@CurrentUser() user: JwtPayload) {
    if (user.role === 'chain_admin') {
      await this.reminderService.sendRemindersForAllBranches();
    } else {
      const branch = await this.resolveManagerBranch(user);
      await this.reminderService.sendRemindersForBranch(branch.id, branch.name);
    }
    return { sent: true };
  }

  @Post('upgrades')
  async triggerUpgrades(@CurrentUser() user: JwtPayload) {
    if (user.role === 'chain_admin') {
      await this.upgradeService.sendUpgradeOffersForAllBranches();
    } else {
      const branch = await this.resolveManagerBranch(user);
      await this.upgradeService.sendUpgradeOffersForBranch(branch.id, branch.name);
    }
    return { sent: true };
  }
}
