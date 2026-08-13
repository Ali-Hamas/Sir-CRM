import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  create(@Param('orgId') orgId: string, @Body() data: any) {
    return this.rolesService.createRole(orgId, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.rolesService.getRoles(orgId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.rolesService.getRole(orgId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() data: any) {
    return this.rolesService.updateRole(orgId, id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.rolesService.deleteRole(orgId, id);
  }
}
