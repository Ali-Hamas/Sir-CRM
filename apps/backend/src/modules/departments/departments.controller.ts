import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.departmentsService.create(orgId, req.user.id, data);
  }

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.departmentsService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.departmentsService.findOne(orgId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id')
  update(@Req() req: any, @Param('orgId') orgId: string, @Param('id') id: string, @Body() data: any) {
    return this.departmentsService.update(orgId, id, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('id') id: string) {
    return this.departmentsService.remove(orgId, id, req.user.id);
  }
}
