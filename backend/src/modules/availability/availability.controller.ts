import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { GetSummaryDto } from './dto/get-summary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ForbiddenException } from '@nestjs/common';

@Controller('v1/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get()
  getAvailableRooms(@Query() dto: GetAvailabilityDto, @CurrentUser() user: JwtPayload) {
    if (user.role !== 'chain_admin' && user.branchId !== dto.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
    return this.availabilityService.getAvailableRooms(dto);
  }

  @Get('summary')
  getOccupancySummary(@Query() dto: GetSummaryDto, @CurrentUser() user: JwtPayload) {
    if (user.role !== 'chain_admin' && user.branchId !== dto.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
    return this.availabilityService.getOccupancySummary(dto.branchId, dto.date);
  }
}
