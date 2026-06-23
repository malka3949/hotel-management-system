import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('chain_admin')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles('chain_admin', 'hotel_manager')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user);
  }

  @Get('me')
  findMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findMe(user.sub);
  }

  @Patch(':id')
  @Roles('chain_admin', 'hotel_manager')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, dto, user);
  }
}
