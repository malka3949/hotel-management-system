import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckInController {
  constructor(private service: CheckInService) {}

  @Post('v1/reservations/:id/check-in')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.checkIn(id, dto, user);
  }

  @Post('v1/reservations/:id/check-out')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  checkOut(
    @Param('id') id: string,
    @Body() dto: CheckOutDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.checkOut(id, dto, user);
  }

  @Get('v1/reservations/:id/invoice')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getInvoice(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.getInvoice(id, user);
  }

  @Get('v1/front-desk/active-guests')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getActiveGuests(
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getActiveGuests(branchId, user);
  }

  @Get('v1/front-desk/arrivals')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getArrivals(
    @Query('date') date: string,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getArrivals(date ?? new Date().toISOString().slice(0, 10), branchId, user);
  }

  @Get('v1/front-desk/departures')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getDepartures(
    @Query('date') date: string,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getDepartures(date ?? new Date().toISOString().slice(0, 10), branchId, user);
  }
}
