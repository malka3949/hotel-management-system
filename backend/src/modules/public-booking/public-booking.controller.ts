import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicBookingService } from './public-booking.service';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import { GetPublicAvailabilityDto } from './dto/get-public-availability.dto';

@Controller('public/branches/:branchId')
export class PublicBookingController {
  constructor(private readonly service: PublicBookingService) {}

  @Get()
  getBranch(@Param('branchId') branchId: string) {
    return this.service.getBranch(branchId);
  }

  @Get('room-types')
  getRoomTypes(@Param('branchId') branchId: string) {
    return this.service.getRoomTypes(branchId);
  }

  @Get('availability')
  getAvailability(
    @Param('branchId') branchId: string,
    @Query() dto: GetPublicAvailabilityDto,
  ) {
    return this.service.getAvailability(branchId, dto);
  }

  @Post('reservations')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createReservation(
    @Param('branchId') branchId: string,
    @Body() dto: CreatePublicReservationDto,
  ) {
    return this.service.createReservation(branchId, dto);
  }
}
