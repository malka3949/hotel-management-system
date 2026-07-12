import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ConciergeService } from './concierge/concierge.service';
import { ConciergeController } from './concierge/concierge.controller';
import { PricingService } from './pricing/pricing.service';
import { PricingController } from './pricing/pricing.controller';
import { NlReportsService } from './reports/nl-reports.service';
import { NlReportsController } from './reports/nl-reports.controller';
import { AiEmailService } from './email/ai-email.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { GuestPortalModule } from '../guest-portal/guest-portal.module';

@Module({
  imports: [PrismaModule, GuestPortalModule],
  providers: [AiService, ConciergeService, PricingService, NlReportsService, AiEmailService],
  controllers: [ConciergeController, PricingController, NlReportsController],
  exports: [AiService, AiEmailService],
})
export class AiModule {}
