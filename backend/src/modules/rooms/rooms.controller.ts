import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto, UpdateCleaningStatusDto } from './dto/update-room-status.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('v1/rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  @Roles('chain_admin', 'hotel_manager')
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: JwtPayload) {
    return this.roomsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: FilterRoomsDto) {
    return this.roomsService.findAll(user, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('chain_admin', 'hotel_manager')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRoomStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.updateStatus(id, dto, user);
  }

  @Patch(':id/cleaning-status')
  @Roles('chain_admin', 'hotel_manager', 'receptionist', 'housekeeping')
  updateCleaningStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCleaningStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.updateCleaningStatus(id, dto, user);
  }

  @Delete(':id')
  @Roles('chain_admin', 'hotel_manager')
  softDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.softDelete(id, user);
  }
}
