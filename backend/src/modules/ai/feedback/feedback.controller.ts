import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Controller('v1')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('portal/feedback/:token')
  async submitFeedback(@Param('token') token: string, @Body() dto: SubmitFeedbackDto) {
    return this.feedbackService.submitFeedback(token, dto);
  }

  @Get('reports/feedback-insights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager')
  async getInsights(@CurrentUser() user: JwtPayload) {
    return this.feedbackService.getInsights(user.role === 'chain_admin' ? undefined : (user.branchId ?? undefined));
  }
}
