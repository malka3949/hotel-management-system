import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PricingService } from './pricing.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/reports')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('pricing-suggestions')
  @Roles('chain_admin', 'hotel_manager')
  async getSuggestions(@CurrentUser() user: JwtPayload) {
    const suggestions = await this.pricingService.getSuggestions(user);
    return { success: true, data: { suggestions } };
  }
}
