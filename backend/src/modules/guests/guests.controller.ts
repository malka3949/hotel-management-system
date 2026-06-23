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
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { FilterGuestsDto } from './dto/filter-guests.dto';
import { CreateGuestDocumentDto } from './dto/create-guest-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

class SearchGuestsDto {
  @IsString()
  @MaxLength(100)
  q!: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}

@Controller('v1/guests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuestsController {
  constructor(private guestsService: GuestsService) {}

  @Post()
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  create(@Body() dto: CreateGuestDto, @CurrentUser() user: JwtPayload) {
    return this.guestsService.create(dto, user);
  }

  @Get('search')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  search(@Query() query: SearchGuestsDto, @CurrentUser() user: JwtPayload) {
    return this.guestsService.search(query.q, user, query.branchId);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: FilterGuestsDto) {
    return this.guestsService.findAll(user, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guestsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGuestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.guestsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('chain_admin', 'hotel_manager')
  softDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guestsService.softDelete(id, user);
  }

  @Get(':id/documents')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getDocuments(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guestsService.getDocuments(id, user);
  }

  @Post(':id/documents')
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  addDocument(
    @Param('id') id: string,
    @Body() dto: CreateGuestDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.guestsService.addDocument(id, dto, user);
  }
}
