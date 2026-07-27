import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('v1/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Post()
  @Roles('chain_admin')
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @Roles('chain_admin', 'hotel_manager')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.branchesService.findAll(user);
  }

  @Patch(':id')
  @Roles('chain_admin')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Post(':id/assign-user')
  @Roles('chain_admin')
  assignUser(@Param('id') id: string, @Body() dto: AssignUserDto) {
    return this.branchesService.assignUser(id, dto.userId);
  }
}
