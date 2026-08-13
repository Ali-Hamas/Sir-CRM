import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN) // Requires Org Admin
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() createData: any) {
    return this.workspacesService.create(req.user.id, orgId, createData);
  }

  @Get()
  findAll(@Req() req: any, @Param('orgId') orgId: string) {
    return this.workspacesService.findAllForOrg(orgId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.workspacesService.findOne(id, orgId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER) // Workspace Manager
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Param('orgId') orgId: string, @Body() updateData: any) {
    return this.workspacesService.update(id, orgId, req.user.id, updateData);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN) // Workspace Admin
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string, @Param('orgId') orgId: string) {
    return this.workspacesService.remove(id, orgId, req.user.id);
  }
}
