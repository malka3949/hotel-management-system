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
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { IsOptional, IsUUID } from 'class-validator';

class RoomTypesQueryDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;
}

@Controller('v1/room-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomTypesController {
  constructor(private roomTypesService: RoomTypesService) {}

  @Post()
  @Roles('chain_admin', 'hotel_manager')
  create(@Body() dto: CreateRoomTypeDto, @CurrentUser() user: JwtPayload) {
    return this.roomTypesService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: RoomTypesQueryDto) {
    return this.roomTypesService.findAll(user, query.branchId);
  }

  @Patch(':id')
  @Roles('chain_admin', 'hotel_manager')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomTypesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('chain_admin', 'hotel_manager')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roomTypesService.remove(id, user);
  }
}
