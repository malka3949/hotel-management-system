import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('occupancy-summary')
  getOccupancySummary(@Query() query: ReportsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getOccupancySummary(query, user);
  }

  @Get('revenue-summary')
  getRevenueSummary(@Query() query: ReportsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getRevenueSummary(query, user);
  }

  @Get('arrivals-departures')
  getArrivalsDepartures(@Query() query: ReportsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getArrivalsDepartures(query, user);
  }

  @Get('reservation-pipeline')
  getReservationPipeline(@Query() query: ReportsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getReservationPipeline(query, user);
  }

  @Get('occupancy-trend')
  getOccupancyTrend(@Query() query: ReportsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getOccupancyTrend(query, user);
  }

  @Get('cancellations')
  getCancellations(@Query() query: ReportsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getCancellations(query, user);
  }

  @Get('future-reservations')
  getFutureReservations(@Query() query: ReportsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getFutureReservations(query, user);
  }

  @UseGuards(RolesGuard)
  @Roles('chain_admin')
  @Get('cross-branch')
  getCrossBranch(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getCrossBranch(user);
  }

  @Get('export/reservations')
  async exportReservations(
    @Query() query: ReportsQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.reportsService.buildReservationsCsv(query, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=reservations.csv');
    return csv;
  }

  @Get('export/revenue')
  async exportRevenue(
    @Query() query: ReportsQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.reportsService.buildRevenueCsv(query, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue.csv');
    return csv;
  }
}
