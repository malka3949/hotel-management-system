import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HousekeepingService } from './housekeeping.service';
import { CreateHousekeepingTaskDto } from './dto/create-task.dto';
import { AssignHousekeepingTaskDto } from './dto/assign-task.dto';
import { SkipHousekeepingTaskDto } from './dto/skip-task.dto';
import { FilterHousekeepingTasksDto } from './dto/filter-tasks.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Get('tasks')
  @Roles('chain_admin', 'hotel_manager', 'housekeeping')
  getTasks(@Query() query: FilterHousekeepingTasksDto, @CurrentUser() user: JwtPayload) {
    return this.housekeepingService.getTasks(query, user);
  }

  @Post('tasks')
  @Roles('chain_admin', 'hotel_manager')
  createTask(@Body() dto: CreateHousekeepingTaskDto, @CurrentUser() user: JwtPayload) {
    return this.housekeepingService.createTask(dto, user);
  }

  @Patch('tasks/:id/assign')
  @Roles('chain_admin', 'hotel_manager')
  assignTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignHousekeepingTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.housekeepingService.assignTask(id, dto, user);
  }

  @Patch('tasks/:id/start')
  @Roles('chain_admin', 'hotel_manager', 'housekeeping')
  startTask(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.housekeepingService.startTask(id, user);
  }

  @Patch('tasks/:id/complete')
  @Roles('chain_admin', 'hotel_manager', 'housekeeping')
  completeTask(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.housekeepingService.completeTask(id, user);
  }

  @Patch('tasks/:id/skip')
  @Roles('chain_admin', 'hotel_manager', 'housekeeping')
  skipTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SkipHousekeepingTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.housekeepingService.skipTask(id, dto, user);
  }
}
