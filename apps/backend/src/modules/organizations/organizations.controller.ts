import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Req() req: any, @Body() createData: any) {
    return this.organizationsService.create(req.user.id, createData);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.organizationsService.findAllForUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN) // Future: Need a custom guard that checks Org membership role specifically
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateData: any) {
    return this.organizationsService.update(id, req.user.id, updateData);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN) // Only Super Admin can delete/suspend an org
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.organizationsService.remove(id, req.user.id);
  }
}
