import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { NlReportsService } from './nl-reports.service';
import { NlQueryDto } from './dto/nl-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/reports')
export class NlReportsController {
  constructor(private readonly nlReportsService: NlReportsService) {}

  @Post('query')
  @Roles('chain_admin', 'hotel_manager')
  async query(@Body() dto: NlQueryDto, @CurrentUser() user: JwtPayload) {
    const answer = await this.nlReportsService.query(dto.query, user);
    return { success: true, data: { answer } };
  }
}
