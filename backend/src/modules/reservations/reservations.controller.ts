import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ReservationFiltersDto, CalendarFiltersDto } from './dto/reservation-filters.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('v1/reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('chain_admin', 'hotel_manager', 'receptionist')
export class ReservationsController {
  constructor(private service: ReservationsService) {}

  @Post()
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get('calendar')
  getCalendar(@CurrentUser() user: JwtPayload, @Query() filters: CalendarFiltersDto) {
    return this.service.getCalendar(user, filters);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: ReservationFiltersDto) {
    return this.service.findAll(user, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto, user);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cancel(id, dto, user);
  }
}
